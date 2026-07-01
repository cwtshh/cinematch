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
        description="slugs de genre.slug escolhidos em user_preference_genre",
    )
    era: str | None = Field(
        default=None,
        description="user_preference.era: 'antigos' | '80_90' | 'recentes' | None",
    )
    popularity: str | None = Field(
        default=None,
        description="user_preference.popularity: 'populares' | 'nicho' | None",
    )
    already_watched_source_movie_ids: list[int] = Field(
        default_factory=list,
        description="filmes a excluir da recomendação (geralmente = ratings já dados)",
    )
    n_recommendations: int = Field(default=20, ge=1, le=50)


class RecommendResponse(BaseModel):
    source_movie_ids: list[int]