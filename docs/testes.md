# Guia de Testes

## Organização

Os arquivos de teste ficam na pasta `testes/`, separados por serviço:

```
testes/
├── backend/
│   ├── tsconfig.json                      # Configuração TypeScript (estende o do backend)
│   ├── inference.mapper.test.ts           # Mapeamento de preferências para IA
│   ├── on-boarding.schema.test.ts         # Validação Zod do onboarding
│   ├── movies.rate-schema.test.ts         # Schemas de avaliação (rate/unrate)
│   ├── dismissed.schema.test.ts           # Schema de parâmetros de descarte
│   └── history.interaction-map.test.ts    # Lógica pura de fusão do histórico
├── frontend/
│   ├── setup.ts                           # Setup do @testing-library/jest-dom
│   ├── OnBoardingTypes.test.ts            # Constantes de gêneros/era/popularidade
│   └── history.rating-toggle.test.ts     # Toggle de avaliação (desavaliar ao clicar na mesma estrela)
└── ia/
    ├── conftest.py                # Fixtures compartilhadas (modelo mock)
    ├── requirements-teste.txt     # Dependências para os testes Python
    ├── test_schemas.py            # Testa os esquemas Pydantic
    └── test_recommender.py        # Testa a classe Recommender
```

---

## Backend

**Executor:** Bun (nativo, sem dependências extras)
**Executar a partir de:** `backend/`

```bash
cd backend/
bun run test
```

### Cobertura atual

**`inference.mapper.test.ts`** — 16 testes
Verifica o mapeamento de valores do banco para os valores aceitos pela IA:
- `mapEraToInference`: todos os valores válidos, valores inválidos, `null` e `undefined`
- `mapPopularityToInference`: todos os valores válidos, valores inválidos, `null` e `undefined`

**`on-boarding.schema.test.ts`** — 8 testes
Valida o esquema Zod da rota de preferências:
- Aceita slugs de gênero válidos, incluindo slugs com underline
- Rejeita lista vazia de gêneros e strings vazias
- Aceita e rejeita valores de `era` e `popularity` conforme o esquema
- Rejeita os valores do formato antigo (`"old"`, `"80_90"`, `"recent"`)

**`movies.rate-schema.test.ts`** — 13 testes
Valida os schemas Zod dos endpoints de avaliação (`POST /movies/:id/rate` e `DELETE /movies/:id/rate`):
- `rateMovieBodySchema`: aceita notas inteiras de 1 a 5; rejeita 0, 6, negativos, decimais, strings e null
- `movieParamsSchema`: aceita UUID v4 válido; rejeita string vazia, string não-UUID, ausência de campo e números

**`dismissed.schema.test.ts`** — 4 testes
Valida o schema Zod dos endpoints de descarte (`POST /dismissed/:id`, `DELETE /dismissed/:id`):
- Aceita UUID v4 válido; rejeita string vazia, slug arbitrário e ausência de campo

**`history.interaction-map.test.ts`** — 21 testes
Testa a função pura `buildInteractionMap` que mescla as quatro fontes de interação do histórico:
- Entradas vazias → mapa vazio
- Cada fonte isolada cria a entrada com o status correto
- Deduplicação de feedItems: mesmo filme em dois feeds usa o feedItemId mais recente
- Prioridade de status: `dismissed` > `rated` > `pending`; watchlist não sobrescreve status
- `dismissed` zera `userRating` e `ratedAt` mesmo quando o feedItem tinha nota
- Data: interação mais recente de qualquer fonte prevalece; interação mais antiga não retrocede
- Múltiplos filmes recebem entradas independentes

---

## Frontend

**Executor:** Vitest + jsdom
**Executar a partir de:** `frontend/`

```bash
cd frontend/
bun run test
```

### Cobertura atual

**`OnBoardingTypes.test.ts`** — 12 testes
Verifica a integridade das constantes usadas nos formulários de preferências:
- Lista de gêneros: 19 itens, sem duplicatas de slug ou label
- Todos os 19 slugs esperados estão presentes
- Eras: 4 opções, primeira é `"any"`, IDs correspondem ao esquema do servidor
- Opções de popularidade: 3 opções, IDs e descrições preenchidos

**`history.rating-toggle.test.ts`** — 7 testes
Testa a função utilitária `calcNewRating` que controla o comportamento de avaliação por estrelas:
- `allowUnrate=true` (aba Acessados): clicar na estrela atual desavalia (retorna `null`); clicar em outra muda a nota; clicar sem nota prévia define a nota
- `allowUnrate=false` (aba Avaliados): clicar na estrela atual mantém a nota (não desavalia); demais comportamentos idênticos

---

## Serviço de IA

**Executor:** pytest
**Executar a partir de:** `ai/` (com ambiente virtual ativado)

```bash
cd ai/
pip install pytest numpy pydantic
# ou: pip install -r ../testes/ia/requirements-teste.txt
pytest ../../testes/ia/ -v
```

### Cobertura atual

**`test_schemas.py`** — 12 testes
Valida os modelos Pydantic:
- `RatingItem`: notas válidas, limites mínimo e máximo, rejeição fora do intervalo
- `RecommendRequest`: valores padrão (incluindo `n_recommendations=20`), limites de `n_recommendations`, campos opcionais
- `RecommendResponse`: criação com lista e com lista vazia

**`test_recommender.py`** — 14 testes
Valida o comportamento da classe `Recommender` com um modelo gerado com dados aleatórios:
- Inicialização: atributos corretos, mapeamentos consistentes
- `_fold_in_user_vector`: retorna vetor com ratings válidos, retorna `None` sem ratings ou com IDs desconhecidos
- `_cold_start_scores`: filtragem por gênero, era e popularidade
- `recommend`: quantidade correta, sem repetir filmes assistidos ou avaliados, modo cold-start, erro sem ratings e sem preferências, IDs únicos

---

## Adicionando Novos Testes

### Backend
Crie um arquivo `*.test.ts` em `testes/backend/`. Use imports com o alias `@/` (mapeado para `backend/src/`):

```typescript
import { describe, expect, test } from "bun:test";
import { meuModulo } from "@/caminho/do/modulo";

describe("meuModulo", () => {
  test("faz o que deve fazer", () => {
    expect(meuModulo()).toBe(true);
  });
});
```

### Frontend
Crie um arquivo `*.test.ts` ou `*.test.tsx` em `testes/frontend/`. Use o alias `@/` (mapeado para `frontend/src/`):

```typescript
import { describe, expect, it } from "vitest";
import { MeuComponente } from "@/components/MeuComponente";

describe("MeuComponente", () => {
  it("renderiza corretamente", () => {
    // ...
  });
});
```

### Serviço de IA
Crie um arquivo `test_*.py` em `testes/ia/`. Para usar o modelo mock, importe a fixture do `conftest.py`:

```python
def test_meu_caso(modelo_mock):
    resultado = modelo_mock.recommend(ratings=[], genres=["action"], ...)
    assert len(resultado) > 0
```
