import numpy as np

from schemas import RatingItem


class Recommender:
    def __init__(self, data: dict):
        self.U: np.ndarray = data["U"]                 
        self.V: np.ndarray = data["V"]                  
        self.media_global: float = data["media_global"]
        self.movie2idx: dict[int, int] = data["movie2idx"]   
        self.idx2movie: dict[int, int] = data["idx2movie"]   

        self.movie_meta: list[dict] = data.get("movie_meta", [])

        self.k = self.U.shape[1]
        self.n_users = self.U.shape[0]
        self.n_movies = self.V.shape[1]

    def _fold_in_user_vector(
        self, ratings: list[RatingItem], lambda_reg: float = 0.1
    ) -> np.ndarray | None:
        idxs = []
        residuals = []
        for item in ratings:
            mi = self.movie2idx.get(item.source_movie_id)
            if mi is not None:
                idxs.append(mi)
                residuals.append(item.rating - self.media_global)

        if not idxs:
            return None

        V_sub = self.V[:, idxs]                      
        r = np.asarray(residuals, dtype=np.float32)  

        A = V_sub @ V_sub.T + lambda_reg * np.eye(self.k, dtype=np.float32)
        b = V_sub @ r

        u = np.linalg.solve(A, b)                     
        return u

    def _cold_start_scores(
        self,
        genres: list[str],
        era: str | None,
        popularity: str | None,
    ) -> dict[int, float]:
        scores: dict[int, float] = {}
        if not self.movie_meta:
            return scores

        genres_set = set(genres) if genres else None

        for meta in self.movie_meta:
            if genres_set and not (genres_set & set(meta.get("genres", []))):
                continue

            year = meta.get("release_year")
            if era == "antigos" and not (year and year < 1980):
                continue
            if era == "80_90" and not (year and 1980 <= year <= 1999):
                continue
            if era == "recentes" and not (year and year >= 2000):
                continue

            count = meta.get("rating_count", 0)
            if popularity == "populares" and count < 50:
                continue
            if popularity == "nicho" and count >= 50:
                continue
            if popularity is None and count < 10:
                continue

            scores[meta["source_movie_id"]] = meta.get("rating_mean", self.media_global)

        return scores

    def recommend(
        self,
        ratings: list[RatingItem],
        genres: list[str],
        era: str | None,
        popularity: str | None,
        already_watched: list[int],
        n: int = 10,
    ) -> list[int]:
        watched_set = set(already_watched) | {r.source_movie_id for r in ratings}

        svd_scores = None
        u_vec = self._fold_in_user_vector(ratings) if ratings else None
        if u_vec is not None:
            svd_scores = u_vec @ self.V + self.media_global   # (n_movies,)

        cold_scores = self._cold_start_scores(genres, era, popularity)

        if svd_scores is None and not cold_scores:
            raise ValueError(
                "Não há ratings suficientes nem preferências para gerar recomendações"
            )

        # peso do SVD cresce com a quantidade de ratings reais (satura em 10 ratings)
        svd_weight = min(len(ratings) / 10.0, 1.0) if svd_scores is not None else 0.0

        final_scores: dict[int, float] = {}

        if svd_scores is not None:
            for mi in range(self.n_movies):
                smid = self.idx2movie[mi]
                if smid in watched_set:
                    continue
                final_scores[smid] = svd_weight * float(svd_scores[mi])

        if cold_scores:
            cold_weight = 1.0 - svd_weight
            for smid, score in cold_scores.items():
                if smid in watched_set:
                    continue
                final_scores[smid] = final_scores.get(smid, 0.0) + cold_weight * score

        if not final_scores:
            raise ValueError("Nenhum filme elegível encontrado para recomendar")

        ranked = sorted(final_scores.items(), key=lambda kv: kv[1], reverse=True)
        return [smid for smid, _ in ranked[:n]]