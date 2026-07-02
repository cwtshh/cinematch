# Guia de Testes

## Organização

Os arquivos de teste ficam na pasta `testes/`, separados por serviço:

```
testes/
├── backend/
│   ├── tsconfig.json              # Configuração TypeScript (estende o do backend)
│   ├── inference.mapper.test.ts   # Testa o mapeamento de preferências para IA
│   └── on-boarding.schema.test.ts # Testa a validação Zod do onboarding
├── frontend/
│   ├── setup.ts                   # Setup do @testing-library/jest-dom
│   └── OnBoardingTypes.test.ts    # Testa os tipos e constantes de gêneros/era/popularidade
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
