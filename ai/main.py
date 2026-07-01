import asyncio
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException

from recommender import Recommender
from schemas import RecommendRequest, RecommendResponse

MODEL_PATH = "modelo.pkl"
MODEL_LOAD_TIMEOUT_SECONDS = 60

recommender: Recommender | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global recommender
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as pool:
        try:
            data = await asyncio.wait_for(
                loop.run_in_executor(pool, joblib.load, MODEL_PATH),
                timeout=MODEL_LOAD_TIMEOUT_SECONDS,
            )
        except (asyncio.TimeoutError, FuturesTimeoutError):
            raise RuntimeError(f"Timeout ao carregar modelo após {MODEL_LOAD_TIMEOUT_SECONDS}s — verifique o arquivo {MODEL_PATH}")
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