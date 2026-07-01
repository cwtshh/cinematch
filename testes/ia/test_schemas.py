import sys
import os

import pytest
from pydantic import ValidationError

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../ai"))

from schemas import RatingItem, RecommendRequest, RecommendResponse


class TestRatingItem:
    def test_cria_item_valido(self):
        item = RatingItem(source_movie_id=1, rating=4.5)
        assert item.source_movie_id == 1
        assert item.rating == 4.5

    def test_nota_minima_permitida(self):
        item = RatingItem(source_movie_id=1, rating=0.5)
        assert item.rating == 0.5

    def test_nota_maxima_permitida(self):
        item = RatingItem(source_movie_id=1, rating=5.0)
        assert item.rating == 5.0

    def test_rejeita_nota_abaixo_do_minimo(self):
        with pytest.raises(ValidationError):
            RatingItem(source_movie_id=1, rating=0.0)

    def test_rejeita_nota_acima_do_maximo(self):
        with pytest.raises(ValidationError):
            RatingItem(source_movie_id=1, rating=5.5)


class TestRecommendRequest:
    def test_cria_requisicao_com_valores_padrao(self):
        req = RecommendRequest(user_id="usuario-123")
        assert req.user_id == "usuario-123"
        assert req.ratings == []
        assert req.preference_genres == []
        assert req.era is None
        assert req.popularity is None
        assert req.already_watched_source_movie_ids == []
        assert req.n_recommendations == 20

    def test_padrao_de_recomendacoes_e_vinte(self):
        req = RecommendRequest(user_id="usuario-123")
        assert req.n_recommendations == 20

    def test_aceita_numero_customizado_de_recomendacoes(self):
        req = RecommendRequest(user_id="usuario-123", n_recommendations=30)
        assert req.n_recommendations == 30

    def test_rejeita_zero_recomendacoes(self):
        with pytest.raises(ValidationError):
            RecommendRequest(user_id="usuario-123", n_recommendations=0)

    def test_rejeita_mais_de_cinquenta_recomendacoes(self):
        with pytest.raises(ValidationError):
            RecommendRequest(user_id="usuario-123", n_recommendations=51)

    def test_aceita_era_valida(self):
        req = RecommendRequest(user_id="usuario-123", era="antigos")
        assert req.era == "antigos"

    def test_aceita_popularity_valida(self):
        req = RecommendRequest(user_id="usuario-123", popularity="nicho")
        assert req.popularity == "nicho"

    def test_aceita_lista_de_ratings(self):
        req = RecommendRequest(
            user_id="usuario-123",
            ratings=[
                RatingItem(source_movie_id=1, rating=4.0),
                RatingItem(source_movie_id=2, rating=3.5),
            ],
        )
        assert len(req.ratings) == 2

    def test_aceita_filmes_ja_assistidos(self):
        req = RecommendRequest(
            user_id="usuario-123",
            already_watched_source_movie_ids=[10, 20, 30],
        )
        assert req.already_watched_source_movie_ids == [10, 20, 30]


class TestRecommendResponse:
    def test_cria_resposta_valida(self):
        resp = RecommendResponse(source_movie_ids=[1, 2, 3])
        assert resp.source_movie_ids == [1, 2, 3]

    def test_aceita_lista_vazia(self):
        resp = RecommendResponse(source_movie_ids=[])
        assert resp.source_movie_ids == []
