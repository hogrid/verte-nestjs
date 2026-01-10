# Deploy no Coolify - Guia Completo

Este guia fornece instruções passo a passo para fazer deploy do Verte Backend (NestJS) e Frontend (React/Vite) no Coolify.

## Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Configuração do Backend](#configuração-do-backend)
4. [Configuração do Frontend](#configuração-do-frontend)
5. [Serviços Auxiliares](#serviços-auxiliares)
6. [Monitoramento e Logs](#monitoramento-e-logs)

---

## Visão Geral

### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        Coolify                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Frontend      │    │    Backend      │                │
│  │   (React/Vite)  │───▶│   (NestJS)      │                │
│  │   Porta 80      │    │   Porta 3006    │                │
│  └─────────────────┘    └────────┬────────┘                │
│                                  │                          │
│                         ┌────────┴────────┐                │
│                         │  Dependencies   │                │
│                         └────────┬────────┘                │
│                                  │                          │
│              ┌───────────────────┼──────────────────┐       │
│              ▼                   ▼                  ▼       │
│      ┌───────────┐      ┌─────────────┐    ┌───────────┐  │
│      │   MySQL   │      │   Redis     │    │ Evolution │  │
│      │ (Managed) │      │  (Managed)  │    │    API    │  │
│      └───────────┘      └─────────────┘    └───────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Portas

| Serviço | Porta |
|---------|-------|
| Frontend (Nginx) | 80 |
| Backend (NestJS) | 3006 |
| Evolution API | 8080 |
| MySQL | 3306 |
| Redis | 6379 |

---

## Pré-requisitos

### 1. Servidor Coolify

- Coolify instalado e funcionando
- Acesso ao painel de administração
- Domínios configurados:
  - `api.w-verte.com.br` → Backend
  - `w-verte.com.br` → Frontend

### 2. Variáveis de Ambiente

Tenha em mãos:
- JWT Secret (gerar: `openssl rand -base64 32`)
- Stripe API Keys (dashboard.stripe.com)
- Credenciais do banco de dados
- Evolution API Key

---

## Configuração do Backend

### 1. Criar Novo Projeto

1. No Coolify: **New Project** → **New Resource**
2. Selecione: **Dockerfile**
3. Configure:
   - **Name**: `verte-backend`
   - **Repository**: URL do seu repositório Git
   - **Branch**: `main`

### 2. Configurar Build

```yaml
Context: / (raiz do projeto)
Dockerfile Path: Dockerfile
```

### 3. Variáveis de Ambiente

| Variável | Valor | Obrigatório |
|----------|-------|-------------|
| `NODE_ENV` | `production` | ✅ |
| `PORT` | `3006` | ✅ |
| `CORS_ORIGIN` | `https://w-verte.com.br,https://www.w-verte.com.br,https://api.w-verte.com.br` | ✅ |
| `DB_HOST` | `[endereço do MySQL]` | ✅ |
| `DB_PORT` | `3306` | ✅ |
| `DB_DATABASE` | `VerteApp` | ✅ |
| `DB_USERNAME` | `[usuário do MySQL]` | ✅ |
| `DB_PASSWORD` | `[senha do MySQL]` | ✅ |
| `JWT_SECRET` | `[chave segura 32+ chars]` | ✅ |
| `JWT_EXPIRATION` | `86400` | ✅ |
| `REDIS_HOST` | `[endereço do Redis]` | ✅ |
| `REDIS_PORT` | `6379` | ✅ |
| `EVOLUTION_API_URL` | `[URL do Evolution API]` | ✅ |
| `EVOLUTION_API_KEY` | `[chave do Evolution API]` | ✅ |
| `APP_URL` | `https://api.w-verte.com.br` | ✅ |
| `FRONTEND_URL` | `https://w-verte.com.br` | ✅ |
| `STRIPE_SECRET_KEY` | `sk_live_...` (produção) | ✅ |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (produção) | ✅ |

### 4. Configurar Domínio

- **Domain**: `api.w-verte.com.br`
- **Port**: `3006`
- **HTTPS**: Habilitar (Let's Encrypt automático)

### 5. Volumes Persistentes

| Volume | Caminho no Container |
|--------|---------------------|
| `uploads` | `/app/uploads` |

### 6. Health Check

```yaml
Endpoint: /api/v1/health
Interval: 30s
Timeout: 10s
Retries: 3
Start Period: 40s
```

---

## Configuração do Frontend

### 1. Criar Novo Projeto

1. No Coolify: **New Project** → **New Resource**
2. Selecione: **Dockerfile**
3. Configure:
   - **Name**: `verte-frontend`
   - **Repository**: URL do repositório Git
   - **Branch**: `main`

### 2. Configurar Build

```yaml
Context: / (raiz do projeto)
Dockerfile Path: Dockerfile
```

### 3. Variáveis de Ambiente

| Variável | Valor |
|----------|-------|
| `VITE_PAYMENTS` | `TRUE` |
| `VITE_GATEWAY` | `stripe` |
| `VITE_PLANS` | `TRUE` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_51Q7oK9P3hVpEWBNhmmtDQxonhUeYLwJ9qKy0LDJLPI71ZQAtU9j6sxnD5swNzbn1MAs0gz3PplnjfbZHrVS3DomY00nEItyz3s` |
| `VITE_BACKEND_BASE_URL` | `https://api.w-verte.com.br/api/v1` |
| `VITE_BACKEND_BASE` | `https://api.w-verte.com.br` |
| `VITE_BACKEND_BASE_UPLOADS` | `https://api.w-verte.com.br/uploads/` |
| `VITE_BACKEND_ASSETS_TENANT` | `https://api.w-verte.com.br/uploads/` |
| `VITE_BACKEND_ASSET` | `https://api.w-verte.com.br/uploads/` |
| `VITE_WAHA_URL` | `https://api.w-verte.com.br` |
| `VITE_SOCKET_CONNECTION` | `https://api.w-verte.com.br` |

### 4. Configurar Domínio

- **Domain**: `w-verte.com.br`
- **Port**: `80`
- **HTTPS**: Habilitar

### 5. Health Check

```yaml
Endpoint: /health
Interval: 30s
Timeout: 10s
Retries: 3
```

---

## Serviços Auxiliares

### MySQL

**Opção 1: Coolify Managed Database**
1. **New Project** → **New Resource** → **MySQL**
2. Configure credenciais e volume

**Opção 2: Banco Existente**
- Use o MySQL compartilhado com Laravel (porta 5306)
- Configure `DB_HOST` como IP ou domínio

### Redis

**Opção 1: Coolify Managed**
1. **New Project** → **New Resource** → **Redis**

**Opção 2: Docker Compose**
- Use o `docker-compose.prod.yml` para Redis local

### Evolution API

**Opção 1: Serviço Separado**
```yaml
Image: evoapicloud/evolution-api:latest
Environment Variables: ver .env.production.example
```

**Opção 2: Externo**
- Configure `EVOLUTION_API_URL` para o serviço externo
- Configure `EVOLUTION_API_KEY` com a chave do serviço

---

## Monitoramento e Logs

### Logs no Coolify

1. **Acessar Logs**:
   - Clique no recurso (Backend/Frontend)
   - Aba "Logs"
   - Tempo real ou histórico

### Métricas

O Coolify fornece:
- Uso de CPU
- Uso de memória
- Uso de disco
- Status de health check

---

## Troubleshooting

### Backend não inicia

```bash
# Verificar logs
docker logs <container_id>

# Testar health check
curl https://api.w-verte.com.br:3006/api/v1/health
```

### Frontend não carrega

```bash
# Verificar se o build foi feito
docker exec <container_id> ls -la /usr/share/nginx/html

# Verificar logs nginx
docker logs <container_id>
```

---

## Segurança

### Boas Práticas

1. ✅ Use HTTPS em todos os domínios
2. ✅ Rode containers como usuário não-root (configurado no Dockerfile)
3. ✅ Nunca commit `.env` com valores reais
4. ✅ Use segredos fortes (32+ caracteres)
5. ✅ Configure CORS corretamente

### Variáveis Sensíveis

Estas variáveis **NUNCA** devem ser expostas:
- `JWT_SECRET`
- `DB_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `EVOLUTION_API_KEY`

---

## Checklist Final

### Backend
- [ ] Dockerfile otimizado para produção
- [ ] Variáveis de ambiente configuradas
- [ ] Dominio e HTTPS configurados
- [ ] Volume para uploads persistente
- [ ] Health check funcionando
- [ ] Conexão com MySQL testada
- [ ] Conexão com Redis testada
- [ ] Evolution API conectado

### Frontend
- [ ] Dockerfile com nginx
- [ ] Variáveis de ambiente configuradas
- [ ] Dominio e HTTPS configurados
- [ ] Build de produção testado localmente
- [ ] Health check funcionando

### Pós-Deploy
- [ ] Teste completo da aplicação
- [ ] Webhook Stripe configurado
- [ ] Monitoramento configurado
- [ ] Backup automático ativado
