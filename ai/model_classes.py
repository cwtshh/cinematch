"""
Classes compartilhadas entre o script de treino (train_recommender.py) e a
API de serving (main.py / recommender.py).

Por que este módulo existe separado:
Quando uma classe é definida dentro de um script rodado diretamente
(`python train_recommender.py ...`), o Python registra seu módulo como
`__main__` no pickle salvo pelo joblib. Isso funciona para carregar o
artefato de dentro do próprio script de treino, mas QUEBRA ao carregar em
qualquer outro processo (como a API), porque o `__main__` de lá é outro
arquivo (`main.py`) — daí o erro:

    AttributeError: module '__main__' has no attribute 'FeatureBuilder'

A correção é colocar as classes num módulo "de verdade" (este arquivo) e
importar ele nos dois lados, para que o pickle resolva sempre para o mesmo
`model_classes.ALSFactors` / `model_classes.FeatureBuilder`, não importa
qual script iniciou o processo.
"""

import gc
import numpy as np
import pandas as pd
import scipy.sparse as sp

DEFAULT_ALS_FACTORS = 32
DEFAULT_ALS_ITERATIONS = 15
DEFAULT_ALS_REGULARIZATION = 0.05
DEFAULT_ALS_ALPHA = 15.0
DEFAULT_CHUNK_SIZE = 2_000_000


class ALSFactors:
    """
    Aprende embeddings de usuário e filme via Alternating Least Squares
    sobre uma matriz esparsa de confiança construída a partir do TREINO.

    Confiança = 1 + alpha * (rating / 5), seguindo a formulação padrão de
    feedback implícito (Hu, Koren, Volinsky 2008), adaptada para usar o
    rating explícito como proxy da força do sinal (ratings mais altos
    contam como interações mais "fortes").
    """

    def __init__(self, n_factors=DEFAULT_ALS_FACTORS, iterations=DEFAULT_ALS_ITERATIONS,
                 regularization=DEFAULT_ALS_REGULARIZATION, alpha=DEFAULT_ALS_ALPHA):
        self.n_factors = n_factors
        self.iterations = iterations
        self.regularization = regularization
        self.alpha = alpha

    def fit(self, train_df):
        try:
            from implicit.als import AlternatingLeastSquares
        except ImportError as e:
            raise ImportError(
                "A biblioteca 'implicit' é necessária para os fatores latentes. "
                "Instale com: pip install implicit"
            ) from e

        user_codes, user_ids = pd.factorize(train_df["userId"].values, sort=False)
        movie_codes, movie_ids = pd.factorize(train_df["movieId"].values, sort=False)

        self.user_id_to_idx_ = pd.Series(np.arange(len(user_ids), dtype="int32"), index=user_ids)
        self.movie_id_to_idx_ = pd.Series(np.arange(len(movie_ids), dtype="int32"), index=movie_ids)

        rows = user_codes.astype("int32")
        cols = movie_codes.astype("int32")

        confidence = (1.0 + self.alpha * (train_df["rating"].values.astype("float32") / 5.0))

        user_item = sp.csr_matrix(
            (confidence, (rows, cols)),
            shape=(len(user_ids), len(movie_ids)),
            dtype="float32",
        )

        model = AlternatingLeastSquares(
            factors=self.n_factors,
            regularization=self.regularization,
            iterations=self.iterations,
            random_state=42,
        )
        model.fit(user_item)

        self.user_factors_ = np.asarray(model.user_factors, dtype="float32")
        self.item_factors_ = np.asarray(model.item_factors, dtype="float32")

        del user_item, rows, cols, confidence
        gc.collect()
        return self

    def lookup(self, user_ids_arr, movie_ids_arr):
        """
        Retorna (user_vecs, item_vecs, dot, cosine) para um array de
        userId/movieId. IDs desconhecidos no treino (cold-start) recebem
        vetor zero (e cosine 0).
        """
        u_idx = self.user_id_to_idx_.reindex(user_ids_arr).values
        m_idx = self.movie_id_to_idx_.reindex(movie_ids_arr).values

        known = ~np.isnan(u_idx) & ~np.isnan(m_idx)

        n = len(user_ids_arr)
        user_vecs = np.zeros((n, self.n_factors), dtype="float32")
        item_vecs = np.zeros((n, self.n_factors), dtype="float32")

        if known.any():
            uu = u_idx[known].astype("int32")
            mm = m_idx[known].astype("int32")
            user_vecs[known] = self.user_factors_[uu]
            item_vecs[known] = self.item_factors_[mm]

        dot = np.einsum("ij,ij->i", user_vecs, item_vecs).astype("float32")

        norm_u = np.linalg.norm(user_vecs, axis=1)
        norm_i = np.linalg.norm(item_vecs, axis=1)
        cosine = np.divide(
            dot, norm_u * norm_i,
            out=np.zeros(n, dtype="float32"), where=(norm_u * norm_i) > 1e-8
        )
        return user_vecs, item_vecs, dot, cosine


class FeatureBuilder:
    def __init__(self, movies, genre_cols, chunk_size=DEFAULT_CHUNK_SIZE, als=None,
                 include_raw_als_vectors=False):
        self.movies = movies
        self.genre_cols = genre_cols
        self.G = len(genre_cols)
        self.chunk_size = chunk_size
        self.als = als
        self.include_raw_als_vectors = include_raw_als_vectors

    def _genre_lookup(self, movie_ids):
        return (
            self.movies.reindex(movie_ids)[self.genre_cols]
            .fillna(0)
            .values.astype("float32")
        )

    def fit(self, train_df):
        self.global_mean_ = np.float32(train_df["rating"].mean())

        movie_stats = train_df.groupby("movieId")["rating"].agg(["mean", "count", "std"])
        self.movie_mean_ = movie_stats["mean"].astype("float32")
        self.movie_count_ = movie_stats["count"].astype("float32")
        self.movie_std_ = movie_stats["std"].fillna(0).astype("float32")

        user_stats = train_df.groupby("userId")["rating"].agg(["mean", "count", "std"])
        self.user_mean_ = user_stats["mean"].astype("float32")
        self.user_count_ = user_stats["count"].astype("float32")
        self.user_std_ = user_stats["std"].fillna(0).astype("float32")

        running_sum = None
        running_count = None
        total_weighted_sum = np.zeros(self.G, dtype="float64")
        total_genre_count = np.zeros(self.G, dtype="float64")

        n = len(train_df)
        for start in range(0, n, self.chunk_size):
            end = min(start + self.chunk_size, n)
            chunk = train_df.iloc[start:end]

            genre_chunk = self._genre_lookup(chunk["movieId"].values)
            rating_chunk = chunk["rating"].values.astype("float32").reshape(-1, 1)
            weighted = genre_chunk * rating_chunk

            total_weighted_sum += weighted.sum(axis=0)
            total_genre_count += genre_chunk.sum(axis=0)

            tmp_sum = pd.DataFrame(
                weighted, index=chunk["userId"].values, columns=self.genre_cols
            ).groupby(level=0).sum()
            tmp_count = pd.DataFrame(
                genre_chunk, index=chunk["userId"].values, columns=self.genre_cols
            ).groupby(level=0).sum()

            running_sum = tmp_sum if running_sum is None else running_sum.add(tmp_sum, fill_value=0)
            running_count = tmp_count if running_count is None else running_count.add(tmp_count, fill_value=0)

            del genre_chunk, rating_chunk, weighted, tmp_sum, tmp_count
            gc.collect()

        avg_genre = (running_sum / running_count.replace(0, np.nan)).fillna(self.global_mean_)
        self.user_genre_profile_ = avg_genre.astype("float32")

        with np.errstate(invalid="ignore", divide="ignore"):
            genre_global_mean = np.where(
                total_genre_count > 0, total_weighted_sum / total_genre_count, self.global_mean_
            )
        self.genre_global_mean_ = genre_global_mean.astype("float32")

        del running_sum, running_count
        gc.collect()
        return self

    def transform(self, df, memmap_path=None):
        n = len(df)
        base_features = 12 + self.G
        k = self.als.n_factors if self.als is not None else 0
        use_vectors = self.als is not None and self.include_raw_als_vectors
        als_features = 0
        if self.als is not None:
            als_features = (2 * k + 2) if use_vectors else 2
        n_features = base_features + als_features

        cols = (
            ["user_mean", "user_count", "movie_mean", "movie_count",
             "global_mean", "genre_affinity_score", "n_genres",
             "user_movie_diff", "user_global_diff", "movie_global_diff",
             "user_rating_std", "movie_rating_std"]
            + list(self.genre_cols)
        )
        if self.als is not None:
            if use_vectors:
                cols += [f"user_factor_{i}" for i in range(k)]
                cols += [f"item_factor_{i}" for i in range(k)]
            cols += ["als_dot", "als_cosine"]

        if memmap_path is not None:
            X = np.memmap(memmap_path, dtype="float32", mode="w+", shape=(n, n_features))
        else:
            X = np.empty((n, n_features), dtype="float32")

        for start in range(0, n, self.chunk_size):
            end = min(start + self.chunk_size, n)
            chunk = df.iloc[start:end]

            genre_chunk = self._genre_lookup(chunk["movieId"].values)

            user_mean = chunk["userId"].map(self.user_mean_).fillna(self.global_mean_).values.astype("float32")
            user_count = chunk["userId"].map(self.user_count_).fillna(0).values.astype("float32")
            user_std = chunk["userId"].map(self.user_std_).fillna(0).values.astype("float32")
            movie_mean = chunk["movieId"].map(self.movie_mean_).fillna(self.global_mean_).values.astype("float32")
            movie_count = chunk["movieId"].map(self.movie_count_).fillna(0).values.astype("float32")
            movie_std = chunk["movieId"].map(self.movie_std_).fillna(0).values.astype("float32")

            profile_aligned = self.user_genre_profile_.reindex(chunk["userId"].values).values.astype("float32")
            profile_aligned = np.nan_to_num(profile_aligned, nan=self.global_mean_)

            diff = profile_aligned - self.genre_global_mean_.reshape(1, -1)
            weighted = diff * genre_chunk
            n_genres = genre_chunk.sum(axis=1)
            genre_affinity = np.divide(
                weighted.sum(axis=1), n_genres,
                out=np.zeros(len(chunk), dtype="float32"), where=n_genres > 0
            )

            X[start:end, 0] = user_mean
            X[start:end, 1] = user_count
            X[start:end, 2] = movie_mean
            X[start:end, 3] = movie_count
            X[start:end, 4] = self.global_mean_
            X[start:end, 5] = genre_affinity
            X[start:end, 6] = n_genres
            X[start:end, 7] = user_mean - movie_mean
            X[start:end, 8] = user_mean - self.global_mean_
            X[start:end, 9] = movie_mean - self.global_mean_
            X[start:end, 10] = user_std
            X[start:end, 11] = movie_std
            X[start:end, 12:base_features] = genre_chunk

            if self.als is not None:
                u_vecs, i_vecs, dot, cosine = self.als.lookup(chunk["userId"].values, chunk["movieId"].values)
                if use_vectors:
                    X[start:end, base_features:base_features + k] = u_vecs
                    X[start:end, base_features + k:base_features + 2 * k] = i_vecs
                    X[start:end, base_features + 2 * k] = dot
                    X[start:end, base_features + 2 * k + 1] = cosine
                else:
                    X[start:end, base_features] = dot
                    X[start:end, base_features + 1] = cosine
                del u_vecs, i_vecs, dot, cosine

            del genre_chunk, profile_aligned, diff, weighted
            del user_mean, user_count, user_std, movie_mean, movie_count, movie_std, n_genres, genre_affinity

        if memmap_path is not None:
            X.flush()
        gc.collect()
        return X, cols