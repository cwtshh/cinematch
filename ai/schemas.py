from pydantic import BaseModel, Field


class RatingItem(BaseModel):
    source_movie_id: int = Field(..., description="movie.sourceMovieId avaliado")
    rating: float = Field(..., ge=0.5, le=5.0)


class RecommendRequest(BaseModel):
    user_id: str = Field(..., description="id do usuário (auth-schema.user.id)")
    ratings: list[RatingItem] = Field(
        default_factory=list,
        description="ratings reais do usuário (user_movie_rating), pode ser vazio",
    )
    preference_genres: list[str] = Field(
        default_factory=list,
        description="slugs de genre.slug escolhidos em user_preference_genre. "
        "Usado como filtro rígido no ranking (só entram filmes com pelo menos "
        "um dos gêneros escolhidos).",
    )
    era: str | None = Field(
        default=None,
        description="user_preference.era: 'antigos' | '80_90' | 'recentes' | None. "
        "RESERVADO: aceito por compatibilidade, mas não é usado no ranking hoje "
        "— o modelo atual não tem metadado de ano por filme. Reintroduzir o "
        "filtro em Recommender.recommend quando esse dado existir.",
    )
    popularity: str | None = Field(
        default=None,
        description="user_preference.popularity: 'populares' | 'nicho' | None. "
        "RESERVADO: mesma observação do campo 'era' — não usado no ranking hoje.",
    )
    already_watched_source_movie_ids: list[int] = Field(
        default_factory=list,
        description="filmes a excluir da recomendação (geralmente = ratings já dados)",
    )
    n_recommendations: int = Field(default=20, ge=1, le=50)


class RecommendResponse(BaseModel):
    source_movie_ids: list[int]