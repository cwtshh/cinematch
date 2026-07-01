# Esquema do Banco de Dados

O banco de dados PostgreSQL é gerenciado pelo Drizzle ORM. Todos os esquemas ficam em `backend/src/infra/database/drizzle/schema/`.

## Diagrama de Relacionamentos

```
user ──────────────────────────────────────────────────┐
  │                                                     │
  ├──< user_preference (1:1)                            │
  │       └──< user_preference_genre (N:M) >── genre   │
  │                                                     │
  ├──< user_movie_rating (N:M) >── movie                │
  │                                                     │
  └──< recommended_feed (1:N)                           │
           └──< recommended_feed_item (1:N) >── movie   │
                                                        │
movie ──< movie_genre (N:M) >── genre                   │
  └──< movie_poster_map (1:1)                           │
```

---

## Tabelas

### `user`
Gerada pelo Better Auth. Estendida com campos do Cinematch.

| Coluna                          | Tipo      | Descrição                                     |
|---------------------------------|-----------|-----------------------------------------------|
| `id`                            | text (PK) | Identificador único                           |
| `name`                          | text      | Nome do usuário                               |
| `email`                         | text      | E-mail único                                  |
| `username`                      | text      | Nome de usuário único (plugin Better Auth)    |
| `display_username`              | text      | Nome de exibição                              |
| `has_completed_onboarding`      | boolean   | Se completou a seleção de preferências        |
| `has_completed_initial_movie_rating` | boolean | Se avaliou ao menos 5 filmes          |
| `created_at`                    | timestamp | Data de criação                               |
| `updated_at`                    | timestamp | Data de atualização                           |

---

### `genre`
Catálogo de gêneros disponíveis no sistema.

| Coluna  | Tipo      | Descrição                              |
|---------|-----------|----------------------------------------|
| `id`    | uuid (PK) | Identificador único                    |
| `slug`  | text      | Identificador textual (ex: `"action"`) |
| `label` | text      | Nome de exibição (ex: `"Ação"`)        |

---

### `movie`
Catálogo de filmes importados do dataset MovieLens.

| Coluna             | Tipo      | Descrição                                      |
|--------------------|-----------|------------------------------------------------|
| `id`               | uuid (PK) | Identificador interno                          |
| `source_movie_id`  | integer   | ID do filme no MovieLens                       |
| `title`            | text      | Título do filme                                |
| `release_year`     | integer   | Ano de lançamento                              |
| `popularity_bucket`| text      | Categoria de popularidade (`"mainstream"` etc) |

---

### `movie_genre`
Relacionamento N:M entre filmes e gêneros.

| Coluna     | Tipo      | Descrição           |
|------------|-----------|---------------------|
| `movie_id` | uuid (FK) | Referência ao filme |
| `genre_id` | uuid (FK) | Referência ao gênero|

---

### `movie_poster_map`
Cache de posters e imagens de backdrop buscados na API do TMDB.

| Coluna          | Tipo      | Descrição                             |
|-----------------|-----------|---------------------------------------|
| `movie_id`      | uuid (FK) | Referência ao filme                   |
| `poster_path`   | text      | Caminho do poster no TMDB             |
| `backdrop_path` | text      | Caminho da imagem de fundo no TMDB    |
| `fetched_at`    | timestamp | Data da última busca na API           |

---

### `user_preference`
Preferências declaradas pelo usuário durante o onboarding. Relação 1:1 com `user`.

| Coluna       | Tipo      | Descrição                                                        |
|--------------|-----------|------------------------------------------------------------------|
| `user_id`    | text (FK) | Referência ao usuário                                            |
| `era`        | text      | Época preferida: `"any"` \| `"before-1980"` \| `"80s-90s"` \| `"2000-plus"` |
| `popularity` | text      | Popularidade: `"any"` \| `"popular"` \| `"hidden-gems"`          |
| `updated_at` | timestamp | Data de atualização                                              |

---

### `user_preference_genre`
Gêneros preferidos pelo usuário. N:M entre `user` e `genre`.

| Coluna     | Tipo      | Descrição              |
|------------|-----------|------------------------|
| `user_id`  | text (FK) | Referência ao usuário  |
| `genre_id` | uuid (FK) | Referência ao gênero   |

---

### `user_movie_rating`
Avaliações de filmes feitas pelo usuário.

| Coluna       | Tipo      | Descrição                            |
|--------------|-----------|--------------------------------------|
| `user_id`    | text (FK) | Referência ao usuário                |
| `movie_id`   | uuid (FK) | Referência ao filme avaliado         |
| `rating`     | real      | Nota de 0.5 a 5.0                    |
| `updated_at` | timestamp | Data da última atualização           |

---

### `recommended_feed`
Agrupamento de um ciclo de recomendações gerado para o usuário.

| Coluna         | Tipo      | Descrição                                          |
|----------------|-----------|----------------------------------------------------|
| `id`           | uuid (PK) | Identificador do feed                              |
| `user_id`      | text (FK) | Referência ao usuário                              |
| `version`      | integer   | Versão incremental do feed                         |
| `status`       | text      | `"active"` ou `"archived"`                         |
| `context`      | jsonb     | Metadados: fonte, contagem de ratings, preferências|
| `generated_at` | timestamp | Data de geração                                    |

---

### `recommended_feed_item`
Um filme individual dentro de um feed de recomendações.

| Coluna        | Tipo      | Descrição                                        |
|---------------|-----------|--------------------------------------------------|
| `id`          | uuid (PK) | Identificador do item                            |
| `feed_id`     | uuid (FK) | Referência ao feed                               |
| `movie_id`    | uuid (FK) | Referência ao filme recomendado                  |
| `rank`        | integer   | Posição na lista de recomendações                |
| `status`      | text      | `"pending"` \| `"rated"` \| `"dismissed"`        |
| `user_rating` | integer   | Nota atribuída pelo usuário (1–5) após avaliar   |
| `rated_at`    | timestamp | Data em que o usuário avaliou o item             |

---

## Comandos de Banco de Dados

Execute a partir da pasta `backend/`:

```bash
# Gera novas migrações a partir do esquema
bun run db:generate

# Aplica as migrações pendentes
bun run db:migrate

# Popula os gêneros iniciais
bun run db:seed:genres

# Importa os filmes do CSV (MovieLens)
bun run db:import:movies

# Preenche o cache de posters (TMDB)
bun run posters:fill

# Reinicia e recria o banco (cuidado: apaga todos os dados)
bun run db:reset:full
```
