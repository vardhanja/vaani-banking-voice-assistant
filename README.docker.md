# Docker / Local Compose

Quick instructions to run the project locally using Docker Compose.

Prerequisites:
- Docker & Docker Compose installed

Setup:

1. Copy the example env file and edit any secrets:

```
cp .env.example .env
# edit .env as needed
```

2. Build and start services:

```
docker compose build
docker compose up
```

This will start three services:
- `backend` on host port `8000` (mapped to container `8000`)
- `ai` on host port `8001` (mapped to container `8001`)
- `db` Postgres on host port `5432`

Notes:
- The compose setup uses a local Postgres for development. For production, provide an external `DATABASE_URL`.
- `ai/chroma_db` is mounted as a host volume so vector DB state is preserved.
- If you change Python dependencies, rebuild with `docker compose build --no-cache`.
