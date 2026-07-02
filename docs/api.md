# Referência da API — Backend

Base URL: `http://localhost:3000`

Todos os endpoints protegidos exigem uma sessão ativa (cookie `better-auth.session_token`). Respostas de erro seguem o formato `{ "message": "..." }`.

---

## Autenticação

Gerenciada pelo Better Auth. Os endpoints de auth ficam em `/auth/*` e são criados automaticamente pela biblioteca.

| Método | Caminho              | Descrição                  |
|--------|----------------------|----------------------------|
| POST   | /auth/sign-up/email  | Cria uma nova conta        |
| POST   | /auth/sign-in/email  | Realiza login              |
| POST   | /auth/sign-out       | Encerra a sessão           |
| GET    | /auth/get-session    | Retorna a sessão atual     |

---

## Onboarding

Gerencia as preferências do usuário coletadas durante o fluxo de entrada.

### GET `/on-boarding/preferences`
Retorna as preferências salvas do usuário autenticado.

**Resposta (200):**
```json
{
  "genres": ["action", "drama"],
  "era": "any",
  "popularity": "any"
}
```

### POST `/on-boarding/preferences`
Salva ou atualiza as preferências do usuário.

**Corpo:**
```json
{
  "genres": ["action", "drama"],
  "era": "before-1980",
  "popularity": "popular"
}
```

**Valores válidos para `era`:** `"any"` | `"before-1980"` | `"80s-90s"` | `"2000-plus"`

**Valores válidos para `popularity`:** `"any"` | `"popular"` | `"hidden-gems"`

**Resposta (200):**
```json
{ "message": "Preferências salvas com sucesso." }
```

---

## Avaliação Inicial de Filmes

Coleta as primeiras avaliações do usuário para calibrar o modelo de recomendação.

### GET `/initial-movie-rating/movies`
Retorna uma seleção de filmes para o usuário avaliar, filtrada pelas preferências de gênero e época.

**Parâmetros de consulta:**
| Parâmetro | Tipo   | Padrão | Máximo | Descrição                        |
|-----------|--------|--------|--------|----------------------------------|
| `limit`   | number | 20     | 50     | Quantidade de filmes a retornar  |

**Resposta (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Nome do Filme",
      "releaseYear": 1994,
      "popularityBucket": "mainstream",
      "posterUrl": "https://image.tmdb.org/t/p/w500/..."
    }
  ]
}
```

### POST `/initial-movie-rating/`
Envia as avaliações do usuário e, caso já tenha avaliado ao menos 5 filmes, gera o primeiro feed de recomendações.

**Corpo:**
```json
{
  "ratings": [
    { "movieId": "uuid", "rating": 4.5 },
    { "movieId": "uuid", "rating": 3.0 }
  ]
}
```

**Resposta (200):**
```json
{
  "savedCount": 2,
  "totalRated": 7,
  "hasCompletedInitialMovieRating": true,
  "recommendationsGenerated": true,
  "recommendationsError": null,
  "recommendations": { "feed": {...}, "items": [...] }
}
```

---

## Recomendações

Gerencia o feed de recomendações ativo do usuário. Todos os endpoints desta seção requerem autenticação.

### GET `/recommendations/active`
Retorna o feed de recomendações ativo e seus itens, enriquecidos com posters do TMDB.

**Resposta (200):**
```json
{
  "feed": {
    "id": "uuid",
    "userId": "uuid",
    "version": 1,
    "status": "active",
    "generatedAt": "2025-01-01T00:00:00.000Z"
  },
  "items": [
    {
      "feedItemId": "uuid",
      "rank": 1,
      "status": "pending",
      "title": "Nome do Filme",
      "releaseYear": 2010,
      "posterUrl": "https://image.tmdb.org/t/p/w500/...",
      "genres": [{ "slug": "action", "label": "Ação" }]
    }
  ]
}
```

### POST `/recommendations/:feedItemId/rate`
Registra a avaliação do usuário para um item do feed.

**Parâmetros de rota:**
- `feedItemId` (UUID): identificador do item no feed

**Corpo:**
```json
{ "rating": 4 }
```
A nota deve ser um inteiro entre 1 e 5.

**Resposta (200):**
```json
{
  "message": "Avaliação salva com sucesso.",
  "item": { ... }
}
```

### POST `/recommendations/refresh`
Solicita a geração de um novo feed de recomendações.

**Corpo (opcional):**
```json
{ "limit": 20 }
```
`limit` aceita valores entre 1 e 50. Padrão: 20.

**Resposta (200):**
```json
{
  "message": "Novas recomendações geradas com sucesso.",
  "recommendationsGenerated": true,
  "recommendationsError": null,
  "recommendations": { "feed": {...}, "items": [...] }
}
```

---

## Avaliação Direta de Filmes

Permite avaliar ou desavaliar qualquer filme pelo seu `id`, independente do feed.

### POST `/movies/:movieId/rate`
Salva ou atualiza a avaliação do usuário para um filme.

**Parâmetros de rota:**
- `movieId` (UUID): identificador do filme

**Corpo:**
```json
{ "rating": 4 }
```
A nota deve ser um inteiro entre 1 e 5.

**Resposta (200):**
```json
{ "movieId": "uuid", "rating": 4 }
```

### DELETE `/movies/:movieId/rate`
Remove a avaliação do usuário para um filme. Também reseta os feedItems do filme para `status: "pending"`.

**Parâmetros de rota:**
- `movieId` (UUID): identificador do filme

**Resposta (200):**
```json
{ "movieId": "uuid", "rating": null }
```

---

## Filmes Descartados

Filmes descartados não aparecem em novos feeds e ficam registrados no histórico (Acessados) com status `"dismissed"`. Descartar um filme também remove a avaliação existente (ação prioritária).

### POST `/dismissed/:movieId`
Descarta um filme. Remove a avaliação caso exista e reseta todos os feedItems do filme para `status: "dismissed"`.

**Parâmetros de rota:**
- `movieId` (UUID): identificador do filme

**Resposta (200):**
```json
{ "movieId": "uuid", "dismissed": true }
```

### DELETE `/dismissed/:movieId`
Desfaz o descarte de um filme.

**Resposta (200):**
```json
{ "movieId": "uuid", "dismissed": false }
```

### GET `/dismissed`
Retorna todos os filmes descartados pelo usuário.

**Resposta (200):**
```json
{
  "dismissed": [
    { "movieId": "uuid", "dismissedAt": "2025-01-01T00:00:00.000Z" }
  ]
}
```

---

## Watchlist

### POST `/watchlist/:movieId`
Adiciona um filme à lista do usuário.

**Resposta (200):**
```json
{ "movieId": "uuid", "inWatchlist": true }
```

### DELETE `/watchlist/:movieId`
Remove um filme da lista do usuário.

**Resposta (200):**
```json
{ "movieId": "uuid", "inWatchlist": false }
```

### GET `/watchlist`
Retorna a lista de filmes salvos pelo usuário, incluindo a avaliação atual de cada um.

**Resposta (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Nome do Filme",
      "posterUrl": "https://...",
      "userRating": 4,
      "genres": [{ "slug": "action", "label": "Ação" }]
    }
  ]
}
```

---

## Estatísticas

### GET `/stats`
Retorna estatísticas das avaliações do usuário. Usa `user_movie_rating` como fonte canônica (mesmo conjunto que "Avaliados" no histórico).

**Resposta (200):**
```json
{
  "totalRated": 14,
  "avgRating": 3.57,
  "ratingDistribution": { "1": 1, "2": 2, "3": 4, "4": 5, "5": 2 },
  "topGenres": [
    { "slug": "action", "label": "Ação", "count": 6, "avgRating": 4.0 }
  ],
  "eraStats": [
    { "era": "Anos 2000+", "count": 8, "avgRating": 3.75 }
  ],
  "watchlistCount": 5,
  "dismissedCount": 3
}
```

---

## Histórico

### GET `/history`
Retorna o histórico de interações do usuário com filmes, paginado.

**Parâmetros de consulta:**

| Parâmetro | Tipo   | Padrão | Descrição        |
|-----------|--------|--------|------------------|
| `page`    | number | 1      | Página (20 itens por vez) |

**Fontes de dados para "Acessados"** (union deduplicada, ordenada pela interação mais recente):
- Filmes recebidos em feeds de recomendação
- Filmes avaliados (via `/movies/:id/rate`)
- Filmes salvos na watchlist
- Filmes descartados

**Regras de prioridade de status** (dentro de "Acessados"):
1. `"dismissed"` — sobrescreve qualquer outro status
2. `"rated"` — sobrescreve `"pending"`
3. `"pending"` — status padrão para interações sem avaliação

**Resposta (200):**
```json
{
  "accessed": [
    {
      "feedItemId": "uuid",
      "feedId": "uuid",
      "rank": 1,
      "id": "uuid",
      "title": "Nome do Filme",
      "status": "rated",
      "userRating": 4,
      "ratedAt": "2025-01-02T00:00:00.000Z",
      "accessedAt": "2025-01-01T00:00:00.000Z",
      "posterUrl": "https://...",
      "genres": [{ "slug": "action", "label": "Ação" }],
      "inWatchlist": false
    }
  ],
  "rated": [
    { "id": "uuid", "title": "...", "userRating": 4, "ratedAt": "..." }
  ],
  "hasMore": true,
  "page": 1,
  "totalAccessed": 47
}
```

- `accessed`: página atual de todos os filmes com que o usuário interagiu (20 por página)
- `rated`: **todos** os filmes avaliados (sem paginação), excluindo descartados
- `totalAccessed`: contagem total de filmes únicos acessados (para exibir no badge da aba)
- `hasMore`: indica se há mais páginas em "Acessados"

---

## Busca

### GET `/search`
Busca filmes pelo título no banco de dados local. Requer autenticação.

**Parâmetros de consulta:**

| Parâmetro        | Tipo   | Padrão | Máximo | Descrição                              |
|------------------|--------|--------|--------|----------------------------------------|
| `title`          | string | —      | 200    | Título ou trecho do título             |
| `year`           | number | —      | —      | Ano de lançamento exato                |
| `genreText`      | string | —      | 100    | Texto do gênero para filtrar           |
| `page`           | number | 1      | —      | Página de resultados                   |
| `limit`          | number | 20     | 100    | Quantidade de resultados por página    |

**Resposta (200):**
```json
{
  "data": [
    { "id": "uuid", "title": "...", "releaseYear": 2001, "genres": [...] }
  ],
  "meta": { "page": 1, "limit": 20, "count": 5 }
}
```
