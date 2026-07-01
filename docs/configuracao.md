# Guia de Configuração e Execução

## Pré-requisitos

- **Bun** ≥ 1.0 — [bun.sh](https://bun.sh)
- **Python** ≥ 3.10
- **Docker** + **Docker Compose** (para o PostgreSQL)
- **Node.js** ≥ 18 (utilizado pelo Drizzle Kit)

---

## Configuração Inicial

### 1. Variáveis de Ambiente

**Backend** — crie o arquivo `backend/env/.env.dev`:
```env
DATABASE_URL=postgresql://cinematch:cinematch@localhost:5432/cinematch
BETTER_AUTH_SECRET=seu_segredo_aqui
BETTER_AUTH_URL=http://localhost:3000
TMDB_API_KEY=sua_chave_tmdb_aqui
```

**Frontend** — crie o arquivo `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000
```

### 2. Banco de Dados

Inicie o PostgreSQL via Docker (a partir de `backend/`):
```bash
docker compose -f docker-compose.dev.yml up -d
```

Execute as migrações e popule os dados iniciais:
```bash
cd backend/
bun run db:migrate
bun run db:seed:genres
bun run db:import:movies
```

Opcionalmente, pré-carregue o cache de posters (recomendado para evitar lentidão nas primeiras requisições):
```bash
bun run posters:fill
```

---

## Executando os Serviços

### Backend

```bash
cd backend/
bun install
bun run dev
```

Disponível em: `http://localhost:3000`
Documentação Swagger: `http://localhost:3000/docs`

### Serviço de IA

```bash
cd ai/
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  (Windows)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Disponível em: `http://localhost:8000`
Documentação interativa: `http://localhost:8000/docs`

> **Atenção:** o arquivo `modelo.pkl` deve estar presente na pasta `ai/` antes de iniciar o serviço.

### Frontend

```bash
cd frontend/
bun install
bun run dev
```

Disponível em: `http://localhost:5173`

---

## Executando os Testes

### Testes do Backend

A partir da pasta `backend/`, o comando abaixo executa os testes localizados em `testes/backend/`:

```bash
cd backend/
bun run test
```

### Testes do Frontend

A partir da pasta `frontend/`, o comando executa os testes em `testes/frontend/`:

```bash
cd frontend/
bun run test
```

Para rodar em modo de observação (re-executa ao salvar arquivos):
```bash
bun run test:watch
```

### Testes do Serviço de IA

A partir da pasta `ai/` (com o ambiente virtual ativado):

```bash
cd ai/
pip install pytest
pytest ../../testes/ia/ -v
```

---

## Scripts Disponíveis

### Backend (`backend/`)

| Comando              | Descrição                                              |
|----------------------|--------------------------------------------------------|
| `bun run dev`        | Inicia o servidor em modo de desenvolvimento           |
| `bun run start`      | Inicia o servidor em modo de produção                  |
| `bun run test`       | Executa a suíte de testes                              |
| `bun run db:generate`| Gera novas migrações a partir das alterações no esquema|
| `bun run db:migrate` | Aplica as migrações pendentes                          |
| `bun run db:push`    | Aplica o esquema diretamente (sem migração)            |
| `bun run db:studio`  | Abre o Drizzle Studio no navegador                     |
| `bun run db:seed:genres` | Popula os gêneros no banco                        |
| `bun run db:import:movies` | Importa os filmes do CSV                        |
| `bun run posters:fill` | Preenche o cache de posters via TMDB               |
| `bun run db:reset:full` | Reinicia e recria todo o banco de dados            |

### Frontend (`frontend/`)

| Comando                | Descrição                                 |
|------------------------|-------------------------------------------|
| `bun run dev`          | Inicia o servidor de desenvolvimento      |
| `bun run build`        | Gera o build de produção                  |
| `bun run test`         | Executa os testes com Vitest              |
| `bun run test:watch`   | Testes em modo de observação              |
| `bun run lint`         | Executa o ESLint                          |

---

## Solução de Problemas

**O banco não conecta:**
Verifique se o container Docker está rodando: `docker ps`. A URL deve seguir o formato `postgresql://usuario:senha@localhost:porta/banco`.

**O modelo de IA não carrega:**
O arquivo `modelo.pkl` deve estar em `ai/modelo.pkl`. O serviço faz timeout após 60 segundos se o arquivo não for encontrado ou estiver corrompido.

**Posters não aparecem:**
Verifique se a variável `TMDB_API_KEY` está configurada. A API do TMDB tem limite de requisições; o sistema faz as buscas em lotes de 3 para evitar bloqueios.

**Erro 401 nas requisições:**
A sessão expirou ou o cookie não está sendo enviado. Faça login novamente. Todos os endpoints protegidos exigem sessão ativa.
