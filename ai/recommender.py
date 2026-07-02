"""
Recommender adaptado para o artefato gerado por train_recommender.py
(ALS + FeatureBuilder + HistGradientBoostingClassifier).

Diferença fundamental em relação à versão anterior (SVD com fold-in u @ V):
o modelo agora é um classificador binário "vai gostar / não vai gostar"
treinado sobre um VETOR DE FEATURES por par (usuário, filme). Para servir
uma recomendação, é preciso:

  1. Montar, para o usuário da requisição, as mesmas features que o
     FeatureBuilder monta no treino (user_mean, movie_mean, afinidade de
     gênero, ALS dot/cosine, etc) — para TODOS os filmes candidatos.
  2. Rodar model.predict_proba nessa matriz.
  3. Ranquear pela probabilidade de "liked".

Detalhe importante: o `user_id` que chega na API normalmente NÃO é o
`userId` numérico usado no treino (são espaços de ID diferentes: um é o
id da tabela de auth da aplicação, o outro é o userId do dataset de
treino). Ou seja, para a imensa maioria das chamadas o usuário é
"cold" do ponto de vista do treino. Por isso:

  - user_mean / user_count / user_std / perfil de gênero do usuário são
    calculados NA HORA a partir dos `ratings` que vieram na requisição
    (não usamos fb.user_mean_ etc, que são só do treino).
  - o vetor latente do usuário no espaço do ALS é obtido por fold-in
    (mínimos quadrados regularizados sobre os item_factors_ dos filmes
    que o usuário avaliou) — é a versão ALS do fold-in que o código
    antigo fazia para o SVD.

Sem mutar o `feature_builder`/`als` treinados (eles são compartilhados
entre requisições concorrentes no FastAPI) — tudo aqui é local à
chamada.

NOTA: `era` e `popularity` são aceitos na assinatura por compatibilidade
com o schema da API, mas não são usados no ranking: o artefato de
treino atual não guarda metadado de ano/popularidade por filme (isso
existia na versão SVD antiga via `movie_meta`, e não foi migrado para o
pipeline novo). Se/quando esse metadado existir, dá pra reativar o
filtro — ver TODO mais abaixo em `recommend`.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from schemas import RatingItem


def _normalize_genre(name: str) -> str:
    return name.strip().lower().replace(" ", "_").replace("-", "_")


class Recommender:
    def __init__(self, data: dict):
        self.model = data["model"]
        self.fb = data["feature_builder"]
        self.genre_cols: list[str] = data.get("genre_cols", self.fb.genre_cols)
        self.feature_names: list[str] = data["feature_names"]
        self.als = self.fb.als  # None se o modelo foi treinado com --no-als

        self.global_mean = float(self.fb.global_mean_)
        self.G = len(self.genre_cols)
        self.use_raw_als_vectors = bool(
            self.als is not None and getattr(self.fb, "include_raw_als_vectors", False)
        )

        # universo de filmes "pontuáveis": filmes que apareceram no treino
        # (têm movie_mean_/movie_count_ reais). Filmes fora disso teriam
        # todas as features de filme zeradas/no fallback, então não valem
        # muito a pena recomendar.
        self._candidate_ids = self.fb.movie_mean_.index.values.astype("int64")
        self._candidate_movie_mean = (
            self.fb.movie_mean_.reindex(self._candidate_ids).values.astype("float32")
        )
        self._candidate_movie_count = (
            self.fb.movie_count_.reindex(self._candidate_ids).values.astype("float32")
        )
        self._candidate_movie_std = (
            self.fb.movie_std_.reindex(self._candidate_ids).values.astype("float32")
        )
        self._candidate_genre_matrix = self.fb._genre_lookup(self._candidate_ids)

        # normalização de nomes de gênero para casar com preference_genres
        # (slugs). Assumindo que os slugs batem com genre_cols a menos de
        # maiúsculas/espaços/hífens — ajuste _normalize_genre se o slug
        # usado no app for diferente do nome da coluna de treino.
        self._genre_idx_by_norm_name = {
            _normalize_genre(g): i for i, g in enumerate(self.genre_cols)
        }

        # vetores latentes dos candidatos, pré-computados uma vez
        self._candidate_item_vecs = None
        if self.als is not None:
            idx = self.als.movie_id_to_idx_.reindex(self._candidate_ids)
            known_mask = idx.notna().values
            idx_vals = idx.fillna(-1).astype(int).values
            item_vecs = np.zeros((len(self._candidate_ids), self.als.n_factors), dtype="float32")
            if known_mask.any():
                item_vecs[known_mask] = self.als.item_factors_[idx_vals[known_mask]]
            self._candidate_item_vecs = item_vecs

        n_features_expected = 12 + self.G + (
            (2 * self.als.n_factors + 2) if self.use_raw_als_vectors
            else (2 if self.als is not None else 0)
        )
        if n_features_expected != len(self.feature_names):
            raise ValueError(
                f"Inconsistência entre feature_builder e feature_names salvos: "
                f"esperado {n_features_expected} colunas, artefato tem {len(self.feature_names)}."
            )

        # infos só para log/health-check
        self.n_users_train = len(self.fb.user_mean_)
        self.n_movies = len(self._candidate_ids)
        self.als_factors = self.als.n_factors if self.als is not None else None

    # ------------------------------------------------------------------
    # Fold-in ALS: resolve o vetor latente do usuário novo por mínimos
    # quadrados regularizados, igual à atualização de usuário padrão do
    # ALS implícito (Hu, Koren, Volinsky 2008), usando os item_factors_
    # já treinados e fixos.
    #   minimize  sum_i c_i * (1 - u . v_i)^2  +  lambda ||u||^2
    #   =>  (V^T C V + lambda I) u = V^T C 1
    # ------------------------------------------------------------------
    def _fold_in_als_user(self, ratings: list[RatingItem]) -> np.ndarray | None:
        if self.als is None or not ratings:
            return None

        vecs = []
        confs = []
        for r in ratings:
            mi = self.als.movie_id_to_idx_.get(r.source_movie_id)
            if mi is None or (isinstance(mi, float) and np.isnan(mi)):
                continue
            vecs.append(self.als.item_factors_[int(mi)])
            confs.append(1.0 + self.als.alpha * (r.rating / 5.0))

        if not vecs:
            return None

        V = np.stack(vecs).astype("float64")          # (m, k)
        c = np.asarray(confs, dtype="float64")         # (m,)
        k = V.shape[1]

        A = (V * c[:, None]).T @ V + self.als.regularization * np.eye(k)
        b = (V * c[:, None]).T @ np.ones(len(c))
        u = np.linalg.solve(A, b)
        return u.astype("float32")

    # ------------------------------------------------------------------
    # Estatísticas do usuário calculadas a partir dos ratings da própria
    # requisição (o usuário quase sempre é "cold" no espaço de treino).
    # ------------------------------------------------------------------
    def _user_stats(self, ratings: list[RatingItem]) -> tuple[float, float, float]:
        if not ratings:
            return self.global_mean, 0.0, 0.0
        vals = np.array([r.rating for r in ratings], dtype="float64")
        mean = float(vals.mean())
        count = float(len(vals))
        std = float(vals.std(ddof=1)) if len(vals) > 1 else 0.0
        return mean, count, std

    def _user_genre_profile(self, ratings: list[RatingItem]) -> np.ndarray:
        if not ratings:
            # sem sinal nenhum -> perfil = média global por gênero, o que
            # zera a feature de afinidade (diff = 0), igual ao fallback
            # usado no treino para usuário desconhecido.
            return self.fb.genre_global_mean_.astype("float32").copy()

        rated_ids = np.array([r.source_movie_id for r in ratings], dtype="int64")
        rated_ratings = np.array([r.rating for r in ratings], dtype="float32")
        genre_chunk = self.fb._genre_lookup(rated_ids)          # (m, G)
        weighted = genre_chunk * rated_ratings.reshape(-1, 1)
        sum_w = weighted.sum(axis=0)
        sum_c = genre_chunk.sum(axis=0)
        with np.errstate(invalid="ignore", divide="ignore"):
            profile = np.where(sum_c > 0, sum_w / sum_c, self.global_mean)
        return profile.astype("float32")

    def _genre_indices_for_slugs(self, genres: list[str]) -> list[int]:
        out = []
        for g in genres:
            idx = self._genre_idx_by_norm_name.get(_normalize_genre(g))
            if idx is not None:
                out.append(idx)
        return out

    # ------------------------------------------------------------------
    # Monta a matriz de features (mesma ordem usada no treino) para um
    # subconjunto de candidatos indicado por `mask` (array booleano sobre
    # self._candidate_ids).
    # ------------------------------------------------------------------
    def _build_features(self, ratings: list[RatingItem], mask: np.ndarray) -> np.ndarray:
        n = int(mask.sum())
        base_features = 12 + self.G
        k = self.als.n_factors if self.als is not None else 0
        als_features = 0
        if self.als is not None:
            als_features = (2 * k + 2) if self.use_raw_als_vectors else 2
        X = np.empty((n, base_features + als_features), dtype="float32")

        user_mean, user_count, user_std = self._user_stats(ratings)
        user_profile = self._user_genre_profile(ratings)

        movie_mean = self._candidate_movie_mean[mask]
        movie_count = self._candidate_movie_count[mask]
        movie_std = self._candidate_movie_std[mask]
        genre_chunk = self._candidate_genre_matrix[mask]

        diff = (user_profile - self.fb.genre_global_mean_).reshape(1, -1)
        weighted = diff * genre_chunk
        n_genres = genre_chunk.sum(axis=1)
        genre_affinity = np.divide(
            weighted.sum(axis=1), n_genres,
            out=np.zeros(n, dtype="float32"), where=n_genres > 0,
        )

        X[:, 0] = user_mean
        X[:, 1] = user_count
        X[:, 2] = movie_mean
        X[:, 3] = movie_count
        X[:, 4] = self.global_mean
        X[:, 5] = genre_affinity
        X[:, 6] = n_genres
        X[:, 7] = user_mean - movie_mean
        X[:, 8] = user_mean - self.global_mean
        X[:, 9] = movie_mean - self.global_mean
        X[:, 10] = user_std
        X[:, 11] = movie_std
        X[:, 12:base_features] = genre_chunk

        if self.als is not None:
            u_vec = self._fold_in_als_user(ratings)
            item_vecs = self._candidate_item_vecs[mask]
            if u_vec is not None:
                dot = item_vecs @ u_vec
                norm_u = np.linalg.norm(u_vec)
                norm_i = np.linalg.norm(item_vecs, axis=1)
                denom = norm_u * norm_i
                cosine = np.divide(
                    dot, denom, out=np.zeros(n, dtype="float32"), where=denom > 1e-8
                )
            else:
                dot = np.zeros(n, dtype="float32")
                cosine = np.zeros(n, dtype="float32")

            if self.use_raw_als_vectors:
                user_vecs = np.tile(
                    (u_vec if u_vec is not None else np.zeros(k, dtype="float32")), (n, 1)
                )
                X[:, base_features:base_features + k] = user_vecs
                X[:, base_features + k:base_features + 2 * k] = item_vecs
                X[:, base_features + 2 * k] = dot
                X[:, base_features + 2 * k + 1] = cosine
            else:
                X[:, base_features] = dot
                X[:, base_features + 1] = cosine

        return X

    # ------------------------------------------------------------------
    # API pública
    # ------------------------------------------------------------------
    def recommend(
        self,
        ratings: list[RatingItem],
        genres: list[str],
        era: str | None,
        popularity: str | None,
        already_watched: list[int],
        n: int = 10,
    ) -> list[int]:
        # TODO: era/popularity não são aplicados — o artefato de treino
        # atual não carrega metadado de ano/contagem de popularidade por
        # filme. Se isso passar a existir (ex: carregado à parte de um
        # movies.csv/DB no startup da API), reintroduzir o filtro aqui,
        # igual ao _cold_start_scores da versão anterior.

        watched_set = set(already_watched) | {r.source_movie_id for r in ratings}

        mask = np.ones(len(self._candidate_ids), dtype=bool)
        if watched_set:
            mask &= ~np.isin(self._candidate_ids, np.fromiter(watched_set, dtype="int64"))

        if genres:
            wanted_idx = self._genre_indices_for_slugs(genres)
            if wanted_idx:
                genre_match = self._candidate_genre_matrix[:, wanted_idx].sum(axis=1) > 0
                mask &= genre_match

        if not mask.any():
            raise ValueError("Nenhum filme elegível encontrado para recomendar")

        X = self._build_features(ratings, mask)
        proba = self.model.predict_proba(X)[:, 1]

        candidate_ids = self._candidate_ids[mask]
        top_idx = np.argsort(proba)[::-1][:n]
        return [int(candidate_ids[i]) for i in top_idx]