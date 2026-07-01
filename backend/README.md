# ⚙️ CineMatch - Backend

Este é o módulo do servidor e banco de dados do **CineMatch**, responsável por processar as requisições, gerenciar o banco de dados relacional e servir os dados de filmes de forma eficiente para a aplicação.

---

## 🛠️ Tecnologias Utilizadas

* **Fastify** (Framework HTTP de altíssima performance para Node.js/Bun)
* **Drizzle ORM** (TypeScript ORM moderno e do tipo *SQL-first*)
* **PostgreSQL** (Banco de dados relacional robusto)
* **Docker & Docker Compose** (Para orquestração do ambiente de banco de dados)
* **Bun** (Runtime e gerenciador de pacotes utilizado para executar o servidor)

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:
* **Docker & Docker Compose** -> [Instalar Docker](https://docs.docker.com/get-docker/)
* **Bun** -> [Baixar Bun](https://bun.sh/)

---

## 🚀 Como Executar o Projeto

Siga os passos abaixo, na ordem correta, para subir o banco de dados, aplicar as estruturas e rodar o servidor:

```bash
# 1. Certifique-se de estar na pasta do backend
cd backend

# 2. Suba o container do banco de dados PostgreSQL em segundo plano
docker compose -f docker-compose.dev.yml up -d --build

# 3. Instale dependências
bun install

# 4. Execute as migrações do Drizzle para criar as tabelas no banco de dados
bunx drizzle-kit migrate

# 5. Popule o banco de dados rodando os scripts de sementes (seeds) e importações
bun run db:seed:genres
bun run db:import:movies

# 6. Inicie o servidor de desenvolvimento
bun run dev

```