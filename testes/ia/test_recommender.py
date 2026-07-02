import sys
import os

import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../ai"))

from recommender import Recommender
from schemas import RatingItem


class TestRecommenderInicialization:
    def test_atributos_basicos(self, modelo_mock):
        assert modelo_mock.n_users == 200
        assert modelo_mock.n_movies == 500
        assert modelo_mock.k == 10
        assert modelo_mock.media_global == 3.5

    def test_mapeamentos_consistentes(self, modelo_mock):
        assert len(modelo_mock.movie2idx) == 500
        assert len(modelo_mock.idx2movie) == 500

    def test_metadados_de_filmes_carregados(self, modelo_mock):
        assert len(modelo_mock.movie_meta) == 500


class TestFoldInUserVector:
    def test_retorna_vetor_com_ratings_validos(self, modelo_mock, ratings_exemplo):
        vetor = modelo_mock._fold_in_user_vector(ratings_exemplo)
        assert vetor is not None
        assert vetor.shape == (10,)

    def test_retorna_none_sem_ratings(self, modelo_mock):
        vetor = modelo_mock._fold_in_user_vector([])
        assert vetor is None

    def test_retorna_none_com_ids_desconhecidos(self, modelo_mock):
        ratings_invalidos = [RatingItem(source_movie_id=99999, rating=4.0)]
        vetor = modelo_mock._fold_in_user_vector(ratings_invalidos)
        assert vetor is None


class TestColdStartScores:
    def test_retorna_scores_para_genero_existente(self, modelo_mock):
        scores = modelo_mock._cold_start_scores(["action"], None, None)
        assert len(scores) > 0

    def test_retorna_vazio_para_genero_inexistente(self, modelo_mock):
        scores = modelo_mock._cold_start_scores(["genero_inexistente"], None, None)
        assert len(scores) == 0

    def test_filtra_por_era_antigos(self, modelo_mock):
        scores = modelo_mock._cold_start_scores([], "antigos", None)
        for smid in scores:
            meta = next(m for m in modelo_mock.movie_meta if m["source_movie_id"] == smid)
            assert meta["release_year"] < 1980

    def test_filtra_por_era_80_90(self, modelo_mock):
        scores = modelo_mock._cold_start_scores([], "80_90", None)
        for smid in scores:
            meta = next(m for m in modelo_mock.movie_meta if m["source_movie_id"] == smid)
            assert 1980 <= meta["release_year"] <= 1999

    def test_filtra_por_era_recentes(self, modelo_mock):
        scores = modelo_mock._cold_start_scores([], "recentes", None)
        for smid in scores:
            meta = next(m for m in modelo_mock.movie_meta if m["source_movie_id"] == smid)
            assert meta["release_year"] >= 2000

    def test_filtra_por_popularidade_populares(self, modelo_mock):
        scores = modelo_mock._cold_start_scores([], None, "populares")
        for smid in scores:
            meta = next(m for m in modelo_mock.movie_meta if m["source_movie_id"] == smid)
            assert meta["rating_count"] >= 50

    def test_filtra_por_popularidade_nicho(self, modelo_mock):
        scores = modelo_mock._cold_start_scores([], None, "nicho")
        for smid in scores:
            meta = next(m for m in modelo_mock.movie_meta if m["source_movie_id"] == smid)
            assert meta["rating_count"] < 50


class TestRecommend:
    def test_retorna_quantidade_solicitada(self, modelo_mock, ratings_exemplo):
        resultado = modelo_mock.recommend(
            ratings=ratings_exemplo,
            genres=["action"],
            era=None,
            popularity=None,
            already_watched=[],
            n=20,
        )
        assert len(resultado) == 20

    def test_nao_repete_filmes_ja_assistidos(self, modelo_mock, ratings_exemplo):
        ja_assistidos = [0, 3, 6, 9, 12]
        resultado = modelo_mock.recommend(
            ratings=ratings_exemplo,
            genres=["action"],
            era=None,
            popularity=None,
            already_watched=ja_assistidos,
            n=20,
        )
        for smid in ja_assistidos:
            assert smid not in resultado

    def test_nao_repete_filmes_dos_ratings(self, modelo_mock, ratings_exemplo):
        resultado = modelo_mock.recommend(
            ratings=ratings_exemplo,
            genres=["action"],
            era=None,
            popularity=None,
            already_watched=[],
            n=20,
        )
        ids_avaliados = {r.source_movie_id for r in ratings_exemplo}
        for smid in resultado:
            assert smid not in ids_avaliados

    def test_sem_ratings_usa_cold_start(self, modelo_mock):
        resultado = modelo_mock.recommend(
            ratings=[],
            genres=["action"],
            era=None,
            popularity=None,
            already_watched=[],
            n=10,
        )
        assert len(resultado) == 10

    def test_levanta_erro_sem_ratings_e_sem_preferencias(self, modelo_mock):
        with pytest.raises(ValueError, match="Não há ratings suficientes"):
            modelo_mock.recommend(
                ratings=[],
                genres=[],
                era=None,
                popularity=None,
                already_watched=[],
                n=10,
            )

    def test_ids_retornados_sao_unicos(self, modelo_mock, ratings_exemplo):
        resultado = modelo_mock.recommend(
            ratings=ratings_exemplo,
            genres=[],
            era=None,
            popularity=None,
            already_watched=[],
            n=20,
        )
        assert len(resultado) == len(set(resultado))

    def test_retorna_menos_quando_poucos_elegiveis(self, modelo_mock):
        todos_menos_dez = list(range(10, 500))
        resultado = modelo_mock.recommend(
            ratings=[RatingItem(source_movie_id=0, rating=5.0)],
            genres=["action"],
            era=None,
            popularity=None,
            already_watched=todos_menos_dez,
            n=20,
        )
        assert len(resultado) <= 10
