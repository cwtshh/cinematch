# 🎬 CineMatch - Documentação do Projeto

O **CineMatch** é uma plataforma inteligente de recomendação de filmes. O sistema usa inteligência artificial para entregar sugestões personalizadas de acordo com as preferências, ano de lançamento e avaliações inseridas pelos usuários.

---

## Equipe 

<div align="center">
  <table>
    <tr>
     <td align="center">
        <a href="https://github.com/cwtshh">
            <img src="http://github.com/cwtshh.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>Gustavo Costa</b></sub>
        </a>
        </td>
        <td align="center">
        <a href="https://github.com/Angelicahaas">
            <img src="https://github.com/Angelicahaas.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>Harleny Angelica</b></sub>
        </a>
        </td>
        <td align="center">
        <a href="https://github.com/Jadequilin">
            <img src="http://github.com/Jadequilin.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>João </b></sub>
        </a>
        </td>
                <td align="center">
        <a href="https://github.com/raquel-andrade">
            <img src="http://github.com/raquel-andrade.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>Raquel Andrade</b></sub>
        </a>
        </td>
    </tr>
  </table>
</div> 

---

## Tecnologias Usadas
* **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons, Bun

* **Backend:** Fastify, Drizzle ORM, PostgreSQL, Bun, Docker

* **Inteligência Artificial:** Python, Uvicorn, FastAPI

---

## Requisitos
Antes de começar, você precisará ter instalado em sua máquina:
* **Docker & Docker Compose** (Para o Banco de Dados)
* **Python 3.10+** (Para o módulo de IA)
* **Bun** (Gerenciador de pacotes e runtime JS) -> [Baixar Bun](https://bun.sh/)

---

## Executando o Projeto

O projeto é dividido em três partes que devem ser executadas na seguinte ordem:

### 1. Configurando o Backend (`/backend`)
O backend necessita do Docker para rodar o banco de dados e do Bun para rodar os scripts de sementes (seeds).

```bash
# Entre na pasta do backend
cd backend

# Suba os containers do banco de dados PostgreSQL
docker compose -f docker-compose.dev.yml up -d --build

# Para instalar dependencias
bun install

# Execute as migrações do Drizzle Kit para estruturar as tabelas
bunx drizzle-kit migrate

# Popule o banco com os gêneros e filmes iniciais
bun run db:seed:genres
bun run db:import:movies

```
### 2. Configurando o Inteligência Artificial (`/ai`)

```bash
# Entre na pasta da IA
cd ../ai

# Crie o ambiente virtual do Python
python -m venv venv

# Ative o ambiente virtual
source venv/bin/activate

# Instale as dependências de machine learning e API
pip install -r requirements.txt

# Inicie o servidor de inferência
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Configurando o Inteligência Artificial (`/ai`)

```bash
# Abra um novo terminal e entre na pasta do frontend
cd frontend

# Instale as dependências de interface
bun install

# Inicie o servidor de desenvolvimento do React
bun run dev
```

## Acessando a Aplicação

Após iniciar todos os serviços com sucesso, as seguintes URLs locais estarão disponíveis para acesso:

- **Interface Web (Frontend):** http://localhost:5173

- **API do Servidor (Backend):** http://localhost:3000

- **Serviço de Inferência (IA):** http://localhost:8000


> 💡 **Nota:** Certifique-se de preencher corretamente os arquivos `.env` na raiz do `/backend` e da `/ai` com suas credenciais do banco e chaves de API necessárias (como o token do TMDB) antes de rodar os comandos.