# Verte NestJS Backend

Backend da plataforma Verte de automacao de marketing via WhatsApp, migrado de Laravel 8 para NestJS.

## Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Evolution  │
│  (React)    │     │  (NestJS)   │     │    API      │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              ┌─────▼─────┐ ┌─────▼─────┐
              │   MySQL   │ │   Redis   │
              │ (TypeORM) │ │  (Bull)   │
              └───────────┘ └───────────┘
```

## Funcionalidades Principais

- **Autenticacao**: JWT com refresh token
- **WhatsApp**: Integracao com Evolution API v2 (multi-sessao)
- **Campanhas**: Criacao, agendamento e envio em massa
- **Filas**: Processamento assincrono com Bull/Redis
- **Contatos**: CRUD com sincronizacao do WhatsApp
- **Rastreamento**: Tracking de envio/entrega/leitura por contato

## Stack Tecnica

| Componente | Tecnologia |
|------------|------------|
| Framework | NestJS 10.x |
| ORM | TypeORM 0.3.x |
| Database | MySQL 8.x |
| Cache/Queue | Redis + Bull |
| WhatsApp | Evolution API v2 |
| Auth | JWT (Passport) |
| Docs | Swagger/OpenAPI |

## Setup do Ambiente

### Pre-requisitos

- Node.js v22.x+
- Docker e Docker Compose
- npm

### 1. Clonar e Instalar

```bash
git clone <repo-url>
cd verte-nestjs
npm install
```

### 2. Configurar Variaveis de Ambiente

```bash
cp .env.example .env
```

Configuracoes criticas no `.env`:

```bash
# Servidor
PORT=3006

# Database (Docker: verte_mysql)
DB_HOST=127.0.0.1
DB_PORT=5306
DB_DATABASE=VerteApp
DB_USERNAME=root
DB_PASSWORD=yPiS83D8iN

# Redis (Docker: evolution_redis)
REDIS_HOST=127.0.0.1
REDIS_PORT=6380

# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your-api-key
```

### 3. Iniciar Servicos Docker

```bash
docker-compose up -d
```

Containers iniciados:
- `verte_mysql` - MySQL na porta 5306
- `evolution_redis` - Redis na porta 6380
- `evolution_api` - Evolution API na porta 8080

### 4. Popular Banco de Dados

```bash
# Seed incremental (pula tabelas existentes)
npm run seed

# Seed fresh (limpa e recria tudo)
npm run seed:fresh
```

### 5. Iniciar Aplicacao

```bash
npm run start:dev
```

- API: http://localhost:3006
- Docs: http://localhost:3006/api/docs

## Credenciais de Teste

| Email | Senha | Perfil |
|-------|-------|--------|
| admin@verte.com | 123456 | Administrador |
| pro@verte.com | 123456 | Usuario Pro |
| basico@verte.com | 123456 | Usuario Basico |
| free@verte.com | 123456 | Usuario Free |

## Estrutura de Diretorios

```
src/
├── auth/              # Autenticacao JWT
├── campaigns/         # Gestao de campanhas
├── contacts/          # Gestao de contatos
├── whatsapp/          # Integracao Evolution API
├── queue/             # Processadores de filas
│   └── processors/
│       ├── campaigns.processor.ts
│       └── whatsapp-message.processor.ts
├── database/
│   └── entities/      # Entidades TypeORM
├── config/            # Configuracoes (Redis, etc)
└── seeder/            # Seeds do banco
```

## Fluxo de Campanhas

```
1. CampaignsService.changeStatus()
   └── Adiciona job na fila 'campaigns'

2. CampaignsProcessor.handleCampaign()
   ├── Busca contatos (inclui public_id NULL)
   ├── Cria registros MessageByContact
   └── Enfileira jobs 'whatsapp-message'

3. WhatsappMessageProcessor.handleMessage()
   ├── Envia via Evolution API
   ├── Atualiza MessageByContact.send = 1
   └── Atualiza progresso da campanha
```

## Endpoints Principais

### Autenticacao
- `POST /api/v1/login` - Login
- `POST /api/v1/register` - Registro

### Campanhas
- `GET /api/v1/campaigns` - Listar campanhas
- `POST /api/v1/campaigns` - Criar campanha
- `POST /api/v1/campaigns/change-status` - Alterar status

### Contatos
- `GET /api/v1/contacts` - Listar contatos
- `POST /api/v1/contacts` - Criar/atualizar contatos

### WhatsApp
- `GET /api/v1/numbers` - Listar numeros
- `POST /api/v1/numbers` - Conectar numero
- `GET /api/v1/numbers/:id/qrcode` - Obter QR code

## Scripts Disponiveis

```bash
npm run start:dev     # Desenvolvimento com watch
npm run start:prod    # Producao
npm run build         # Compilar TypeScript
npm run test          # Testes unitarios
npm run test:e2e      # Testes E2E
npm run seed          # Popular banco
npm run seed:fresh    # Limpar e popular banco
```

## Resolucao de Problemas

### Redis nao conecta
- Verificar se container `evolution_redis` esta rodando
- Confirmar porta 6380 no .env

### MySQL nao conecta
- Usar `127.0.0.1` em vez de `localhost`
- Verificar senha no .env

### Campanha nao encontra contatos
- Contatos sincronizados tem `public_id = NULL`
- Processor tem fallback para buscar esses contatos

### Mensagens nao enviam
- Verificar se Evolution API esta conectada
- Checar logs do WhatsappMessageProcessor

## Migracao Laravel -> NestJS

Este projeto e uma migracao do backend Laravel original. Pontos importantes:

- Compatibilidade 100% com formato de resposta Laravel
- Mesmo esquema de banco de dados
- Endpoints mantidos para nao quebrar frontend
- TypeORM entities mapeiam tabelas existentes
