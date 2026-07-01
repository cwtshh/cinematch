# Arquitetura do Cinematch

## Visão Geral

O Cinematch é uma plataforma de recomendação de filmes composta por três serviços independentes que se comunicam entre si:

```
┌─────────────┐        ┌──────────────┐        ┌──────────────┐
│   Frontend  │  HTTP  │   Backend    │  HTTP  │  Serviço IA  │
│  React/TS   │◄──────►│   Fastify    │◄──────►│  FastAPI/Py  │
│  porta 5173 │        │  porta 3000  │        │  porta 8000  │
└─────────────┘        └──────┬───────┘        └──────────────┘
                              │ SQL
                       ┌──────▼───────┐
                       │  PostgreSQL  │
                       │  porta 5432  │
                       └──────────────┘
```

## Camadas

### Frontend (`frontend/`)
Interface web construída com React 19 e TypeScript. Responsável pela experiência do usuário: onboarding, avaliação de filmes, visualização de recomendações, histórico e perfil.

**Tecnologias principais:** React 19, React Router 8, Tailwind CSS v4, shadcn/ui, Axios, Better Auth (cliente), Lucide React.

### Backend (`backend/`)
API REST construída com Fastify e Bun. Centraliza a lógica de negócio, autenticação, acesso ao banco de dados e coordenação com o serviço de IA.

**Tecnologias principais:** Fastify 5, Drizzle ORM, PostgreSQL, Better Auth, Zod, Axios (para chamar o serviço de IA e a API do TMDB).

### Serviço de IA (`ai/`)
Microserviço Python responsável pelo modelo de recomendação. Recebe os dados do usuário e retorna uma lista ordenada de IDs de filmes recomendados.

**Tecnologias principais:** FastAPI, NumPy, SciPy, scikit-learn, joblib, Pydantic.

### Banco de Dados (PostgreSQL)
Armazena todos os dados persistentes: usuários, filmes, avaliações, preferências, feeds de recomendação e cache de posters.

## Fluxo Principal

```
1. Usuário cria conta e faz login
        ↓
2. Onboarding: escolhe gêneros, época e popularidade preferidos
        ↓
3. Avaliação inicial: avalia ao menos 5 filmes com nota de 1 a 5
        ↓
4. Backend chama o serviço de IA passando ratings + preferências
        ↓
5. Serviço de IA aplica SVD + cold-start e retorna IDs de filmes
        ↓
6. Backend busca os filmes no banco, enriquece com posters (TMDB)
   e salva o feed de recomendações
        ↓
7. Usuário vê e avalia as recomendações → novo feed é gerado
        ↓
8. Histórico de filmes acessados e avaliados fica disponível
```

## Comunicação entre Serviços

### Frontend → Backend
- Protocolo: HTTP/REST + JSON
- Autenticação: cookie de sessão gerenciado pelo Better Auth
- Base URL: `http://localhost:3000`

### Backend → Serviço de IA
- Protocolo: HTTP/REST + JSON
- Endpoint: `POST http://localhost:8000/recommend`
- Sem autenticação (serviço interno)

### Backend → TMDB API
- Protocolo: HTTP/REST + JSON
- Uso: busca de posters e metadados de filmes
- Limitação de taxa: requisições em lotes de 3 com tratamento de falhas

## Modelo de Recomendação

O serviço de IA usa uma abordagem híbrida:

- **SVD (Decomposição de Valor Singular):** Aprende padrões latentes a partir de um corpus de avaliações (MovieLens). Para cada usuário novo, calcula um vetor de preferências via *fold-in* com base nos filmes já avaliados.

- **Cold-start:** Quando o usuário tem poucos ratings ou nenhum, utiliza as preferências declaradas (gênero, época, popularidade) para filtrar e pontuar candidatos com base em metadados.

- **Combinação:** O peso do SVD cresce proporcionalmente à quantidade de avaliações do usuário (satura em 10 ratings). O cold-start complementa com peso inverso.

## Estrutura de Pastas

```
cinematch/
├── ai/          # Serviço de inteligência artificial (Python)
├── backend/     # API REST (Node.js/Bun)
├── frontend/    # Interface web (React)
├── testes/      # Suítes de teste organizadas por serviço
│   ├── backend/
│   ├── frontend/
│   └── ia/
└── docs/        # Documentação do projeto
```
