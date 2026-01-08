# Tech Context

## Stack
- Backend: NestJS 11, TypeScript 5.7, RxJS 7.8, TypeORM 0.3.
- Evolution API v2.3.6 (`evoapicloud/evolution-api:latest`).
- DBs: MySQL (plataforma), Postgres (Evolution), Redis (cache Evolution).

## Config
- `.env`:
  - `EVOLUTION_API_URL=http://localhost:8080`
  - `EVOLUTION_API_KEY=change-me-to-secure-api-key`
  - `APP_URL=http://host.docker.internal:3000`
  - `EVOLUTION_API_WEBHOOK_URL=http://host.docker.internal:3500/api/v1/whatsapp/webhook`
- `docker-compose.yml` Evolution:
  - `CONFIG_SESSION_PHONE_VERSION=2.3000.1028178858`
  - Logs Baileys: `info`

## Endpoints
- `GET /api/v1/whatsapp/status`
- `GET /api/v1/whatsapp/qrcode/:number`
- `POST /api/v1/whatsapp/webhook`
- `SSE /api/v1/whatsapp/status/stream`
- `POST /api/v1/whatsapp/disconnect`

