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

## Histórico

### GET `/history`
Retorna o histórico de filmes do usuário, limitado aos 200 registros mais recentes.

**Resposta (200):**
```json
{
  "accessed": [ { "title": "...", "posterUrl": "...", "genres": [...] } ],
  "rated": [ { "title": "...", "userRating": 4, "ratedAt": "..." } ]
}
```

- `accessed`: todos os itens recebidos em feeds (ordem decrescente por data do feed)
- `rated`: apenas os itens com avaliação registrada (ordem decrescente por data de avaliação)

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
