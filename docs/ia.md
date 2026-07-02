# Serviço de Inteligência Artificial

## Visão Geral

O serviço de IA é uma API Python construída com FastAPI que expõe um único endpoint de recomendação. Ele carrega um modelo pré-treinado de fatoração de matrizes (SVD) e o combina com filtragem baseada em preferências declaradas (gênero, época, popularidade).

**Localização:** `ai/`
**Porta padrão:** `8000`

---

## Algoritmo de Recomendação

### Estratégia Híbrida

O modelo combina duas abordagens:

**1. SVD — Filtragem Colaborativa**

Aprende padrões latentes a partir de um corpus de avaliações (dataset MovieLens). Para cada novo usuário, calcula um vetor de preferências via *fold-in* com base nos filmes avaliados:

```
A = V_sub @ V_sub.T + λI
b = V_sub @ r
u = solve(A, b)
scores = u @ V + media_global
```

Onde `V_sub` são os vetores latentes dos filmes avaliados, `r` são os resíduos em relação à média global e `λ` é um fator de regularização.

**2. Cold-start — Baseado em Preferências**

Quando o usuário tem poucos ou nenhum rating, os filmes são filtrados e pontuados com base em metadados:
- Gêneros preferidos
- Época (antes de 1980, anos 80/90, a partir de 2000)
- Popularidade (filmes conhecidos ou menos populares)

**3. Combinação**

O peso do SVD cresce proporcionalmente aos ratings do usuário e satura em 10:

```python
svd_weight = min(len(ratings) / 10.0, 1.0)
cold_weight = 1.0 - svd_weight
score_final = svd_weight * score_svd + cold_weight * score_cold
```

---

## Endpoints

### GET `/health`
Verifica se o serviço está ativo e se o modelo foi carregado.

**Resposta:**
```json
{ "status": "ok", "model_loaded": true }
```

### POST `/recommend`
Gera uma lista de recomendações para um usuário.

**Corpo da requisição:**
```json
{
  "user_id": "id-do-usuario",
  "ratings": [
    { "source_movie_id": 1, "rating": 4.5 },
    { "source_movie_id": 3, "rating": 3.0 }
  ],
  "preference_genres": ["action", "drama"],
  "era": "recentes",
  "popularity": "populares",
  "already_watched_source_movie_ids": [1, 3, 10],
  "n_recommendations": 20
}
```

**Campos:**

| Campo                              | Tipo         | Padrão | Descrição                                             |
|------------------------------------|--------------|--------|-------------------------------------------------------|
| `user_id`                          | string       | —      | ID do usuário (para rastreabilidade)                  |
| `ratings`                          | lista        | `[]`   | Avaliações reais do usuário (nota de 0.5 a 5.0)      |
| `preference_genres`                | lista string | `[]`   | Slugs dos gêneros preferidos                          |
| `era`                              | string\|null | `null` | `"antigos"` \| `"80_90"` \| `"recentes"` \| `null`   |
| `popularity`                       | string\|null | `null` | `"populares"` \| `"nicho"` \| `null`                 |
| `already_watched_source_movie_ids` | lista int    | `[]`   | IDs a excluir das recomendações                       |
| `n_recommendations`                | int          | 20     | Quantidade desejada (mínimo 1, máximo 50)             |

**Resposta (200):**
```json
{ "source_movie_ids": [42, 7, 13, ...] }
```

Os IDs retornados são `movie.source_movie_id` (MovieLens), não UUIDs do banco.

---

## Mapeamento de Valores

O backend converte os valores do banco antes de enviar ao serviço de IA:

| Valor no banco    | Valor enviado à IA |
|-------------------|--------------------|
| `"before-1980"`   | `"antigos"`        |
| `"80s-90s"`       | `"80_90"`          |
| `"2000-plus"`     | `"recentes"`       |
| `"popular"`       | `"populares"`      |
| `"hidden-gems"`   | `"nicho"`          |
| `"any"` / `null`  | `null`             |

Essa conversão é feita em `backend/src/services/ai-inference-service/inference.mapper.ts`.

---

## Carregamento do Modelo

O modelo é carregado na inicialização do serviço via `joblib.load`. Para evitar bloqueio indefinido em caso de arquivo corrompido ou ausente, o carregamento tem um timeout de 60 segundos. Se o timeout for excedido, o serviço encerra com erro.

O arquivo do modelo (`modelo.pkl`) deve estar na raiz da pasta `ai/` e contém:

| Chave           | Tipo           | Descrição                                  |
|-----------------|----------------|--------------------------------------------|
| `U`             | ndarray        | Vetores latentes de usuários (M × K)       |
| `V`             | ndarray        | Vetores latentes de filmes (K × N)         |
| `media_global`  | float          | Média global de avaliações                 |
| `movie2idx`     | dict[int, int] | Mapa de `source_movie_id` para índice      |
| `idx2movie`     | dict[int, int] | Mapa de índice para `source_movie_id`      |
| `movie_meta`    | lista de dicts | Metadados dos filmes para cold-start       |

---

## Execução

```bash
cd ai/
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  (Windows)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Documentação interativa:** `http://localhost:8000/docs`
