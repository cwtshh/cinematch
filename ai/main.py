from contextlib import asynccontextmanager

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException

from recommender import Recommender
from schemas import RecommendRequest, RecommendResponse

MODEL_PATH = "modelo.pkl"

recommender: Recommender | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global recommender
    data = joblib.load(MODEL_PATH)
    recommender = Recommender(data)
    print(f"Modelo carregado: {recommender.n_users} usuários, {recommender.n_movies} filmes")
    yield


app = FastAPI(title="API de Recomendação de Filmes", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": recommender is not None}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(payload: RecommendRequest):
    if recommender is None:
        raise HTTPException(status_code=503, detail="Modelo ainda não carregado")

    try:
        source_movie_ids = recommender.recommend(
            ratings=payload.ratings,
            genres=payload.preference_genres,
            era=payload.era,
            popularity=payload.popularity,
            already_watched=payload.already_watched_source_movie_ids,
            n=payload.n_recommendations,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return RecommendResponse(source_movie_ids=source_movie_ids)