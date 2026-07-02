import sys
import os

import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../ai"))

from recommender import Recommender
from schemas import RatingItem

N_FILMES = 500
N_FATORES = 10
SEED = 42


@pytest.fixture(scope="session")
def modelo_mock():
    rng = np.random.default_rng(SEED)
    U = rng.random((200, N_FATORES)).astype(np.float32)
    V = rng.random((N_FATORES, N_FILMES)).astype(np.float32)

    movie2idx = {i: i for i in range(N_FILMES)}
    idx2movie = {i: i for i in range(N_FILMES)}

    movie_meta = []
    for i in range(N_FILMES):
        generos = ["action"] if i % 3 == 0 else ["drama"] if i % 3 == 1 else ["comedy"]
        ano = 1970 + (i % 50)
        contagem = 100 if i % 2 == 0 else 20
        movie_meta.append({
            "source_movie_id": i,
            "genres": generos,
            "release_year": ano,
            "rating_count": contagem,
            "rating_mean": 3.5 + (i % 3) * 0.3,
        })

    data = {
        "U": U,
        "V": V,
        "media_global": 3.5,
        "movie2idx": movie2idx,
        "idx2movie": idx2movie,
        "movie_meta": movie_meta,
    }
    return Recommender(data)


@pytest.fixture
def ratings_exemplo():
    return [
        RatingItem(source_movie_id=0, rating=5.0),
        RatingItem(source_movie_id=3, rating=4.0),
        RatingItem(source_movie_id=6, rating=3.5),
        RatingItem(source_movie_id=9, rating=4.5),
        RatingItem(source_movie_id=12, rating=2.0),
    ]
