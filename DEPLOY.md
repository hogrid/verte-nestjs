# Guia de Deploy - Verte NestJS Backend

[![Migration Status](https://img.shields.io/badge/migration-100%25%20COMPLETA-success)](./CLAUDE.md)
[![Tests](https://img.shields.io/badge/tests-488%2F488%20passing-brightgreen)](./test)
[![Compatibility](https://img.shields.io/badge/compatibility-100%25%20Laravel-success)](./CLAUDE.md)

Este guia documenta o processo completo de deploy do backend NestJS em produção, garantindo 100% de compatibilidade com o frontend Laravel/Vercel existente.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Variáveis de Ambiente](#variáveis-de-ambiente)
3. [Deploy Local](#deploy-local)
4. [Deploy em Servidor (VPS/Cloud)](#deploy-em-servidor-vpscloud)
5. [Deploy no Vercel (Serverless)](#deploy-no-vercel-serverless)
6. [Configuração de Banco de Dados](#configuração-de-banco-de-dados)
7. [Integração com Frontend](#integração-com-frontend)
8. [Monitoramento e Logs](#monitoramento-e-logs)
9. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

### Software Necessário

- **Node.js**: >= 18.x (recomendado 20.x)
- **npm**: >= 9.x
- **MySQL**: >= 8.0 (banco compartilhado com Laravel)
- **Redis**: >= 6.x (para Bull Queue)
- **WAHA**: WhatsApp HTTP API rodando (localhost:8080 ou cloud)

### Serviços Externos

- **Stripe**: Conta configurada com keys de produção
- **MercadoPago** (opcional): Para pagamentos no Brasil
- **SMTP**: Servidor de email configurado

---

## 🌍 Variáveis de Ambiente

### Arquivo `.env` Completo

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```bash
# ===========================================
# APPLICATION
# ===========================================
NODE_ENV=production
PORT=3000

# ===========================================
# DATABASE (CRÍTICO: MESMO BANCO DO LARAVEL!)
# ===========================================
DB_HOST=seu-mysql-host.com
DB_PORT=3306
DB_DATABASE=VerteApp  # MESMO nome do Laravel
DB_USERNAME=seu_usuario
DB_PASSWORD=sua_senha_segura

# ===========================================
# JWT (Compatível com Laravel Sanctum)
# ===========================================
JWT_SECRET=sua-chave-secreta-muito-segura-aqui
JWT_EXPIRATION=3600  # 1 hora em segundos

# ===========================================
# REDIS (Obrigatório para Bull Queue)
# ===========================================
REDIS_HOST=seu-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=sua-senha-redis  # deixe vazio se não tiver senha
REDIS_DB=0

# ===========================================
# WAHA - WhatsApp HTTP API
# ===========================================
WAHA_URL=https://seu-waha-server.com
API_WHATSAPP_GLOBALKEY=sua-global-key-waha

# ===========================================
# STRIPE (Pagamentos - PRODUÇÃO)
# ===========================================
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxx  # Use sk_live_ em produção!
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxx

# ===========================================
# MERCADOPAGO (Opcional - Brasil)
# ===========================================
MERCADOPAGO_ACCESS_TOKEN=APP_USR_xxxxxxxxx
MERCADOPAGO_PUBLIC_KEY=APP_USR_xxxxxxxxx

# ===========================================
# EMAIL (SMTP)
# ===========================================
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=sua-senha-app-gmail
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@verte.com
MAIL_FROM_NAME=Verte

# ===========================================
# AWS S3 (Opcional - File Storage)
# ===========================================
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=

# ===========================================
# CORS (Configurar domínios permitidos)
# ===========================================
CORS_ORIGIN=https://seu-frontend.vercel.app,https://www.seudominio.com
```

### ⚠️ Variáveis Críticas

**Estas variáveis são OBRIGATÓRIAS para funcionamento:**

1. **Database**: `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
2. **JWT**: `JWT_SECRET`, `JWT_EXPIRATION`
3. **Redis**: `REDIS_HOST`, `REDIS_PORT` (para campanhas e jobs)
4. **WAHA**: `WAHA_URL`, `API_WHATSAPP_GLOBALKEY`
5. **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

---

## 🚀 Deploy Local

### 1. Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-org/verte-nestjs.git
cd verte-nestjs

# Instale dependências
npm install

# Configure .env
cp .env.example .env
# Edite .env com suas credenciais
```

### 2. Build

```bash
# Build de produção
npm run build

# Verificar build
ls -la dist/
```

### 3. Executar

```bash
# Modo produção
npm run start:prod

# ✅ Servidor rodando em http://localhost:3000
```

### 4. Validação

```bash
# Testar health check
curl http://localhost:3000/health

# Testar API
curl http://localhost:3000/api/v1/health
```

---

## ☁️ Deploy em Servidor (VPS/Cloud)

### Opção 1: DigitalOcean / AWS EC2 / Google Cloud

#### 1.1. Provisionar Servidor

```bash
# Exemplo: Ubuntu 22.04 LTS
# Mínimo: 2GB RAM, 2 vCPUs, 50GB SSD

# Conectar via SSH
ssh root@seu-servidor.com
```

#### 1.2. Instalar Dependências

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 (Process Manager)
sudo npm install -g pm2

# Instalar Nginx (Reverse Proxy)
sudo apt install -y nginx

# Instalar Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

#### 1.3. Configurar Aplicação

```bash
# Criar usuário específico
sudo adduser verte
sudo usermod -aG sudo verte
su - verte

# Clonar repositório
git clone https://github.com/seu-org/verte-nestjs.git
cd verte-nestjs

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
nano .env  # Editar com credenciais de produção

# Build
npm run build
```

#### 1.4. Configurar PM2

```bash
# Criar arquivo ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'verte-backend',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
EOF

# Criar diretório de logs
mkdir -p logs

# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração para auto-start
pm2 save
pm2 startup
```

#### 1.5. Configurar Nginx

```bash
# Criar configuração Nginx
sudo nano /etc/nginx/sites-available/verte-backend

# Adicionar configuração:
```

```nginx
server {
    listen 80;
    server_name api.verte.com;  # Seu domínio

    # Logs
    access_log /var/log/nginx/verte-backend-access.log;
    error_log /var/log/nginx/verte-backend-error.log;

    # Proxy para NestJS
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Upload files
    client_max_body_size 50M;
}
```

```bash
# Ativar configuração
sudo ln -s /etc/nginx/sites-available/verte-backend /etc/nginx/sites-enabled/
sudo nginx -t  # Testar configuração
sudo systemctl reload nginx
```

#### 1.6. Configurar SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d api.verte.com

# Auto-renovação já configurada pelo Certbot
```

### Opção 2: Docker Deploy

#### 2.1. Criar Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

#### 2.2. Criar docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: .
    container_name: verte-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - redis
    networks:
      - verte-network

  redis:
    image: redis:7-alpine
    container_name: verte-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - verte-network
    volumes:
      - redis-data:/data

networks:
  verte-network:
    driver: bridge

volumes:
  redis-data:
```

#### 2.3. Deploy com Docker

```bash
# Build e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Restart
docker-compose restart backend

# Stop
docker-compose down
```

---

## 🌐 Deploy no Vercel (Serverless)

**⚠️ ATENÇÃO**: Vercel tem limitações para NestJS:
- Não suporta Redis/Bull (jobs assíncronos)
- Não suporta WebSockets
- Cold starts podem afetar performance

**Recomendação**: Use Vercel apenas para testes ou se não precisar de jobs assíncronos.

### 1. Criar vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/main.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/main.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2. Configurar Variáveis no Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Configurar variáveis
vercel env add DB_HOST
vercel env add DB_PORT
vercel env add DB_DATABASE
vercel env add DB_USERNAME
vercel env add DB_PASSWORD
vercel env add JWT_SECRET
vercel env add STRIPE_SECRET_KEY
# ... adicionar todas as variáveis necessárias
```

### 3. Deploy

```bash
# Deploy de produção
vercel --prod
```

---

## 🗄️ Configuração de Banco de Dados

### CRÍTICO: Usar MESMO Banco do Laravel

**⚠️ NÃO CRIAR NOVAS TABELAS!**

O NestJS deve usar o **mesmo banco MySQL** que o Laravel. Não execute migrations!

### 1. Verificar Acesso ao Banco

```bash
# Testar conexão MySQL
mysql -h SEU_HOST -P 3306 -u SEU_USUARIO -p

# Dentro do MySQL
USE VerteApp;
SHOW TABLES;  # Deve mostrar todas as tabelas do Laravel
```

### 2. Configurar Permissões

```sql
-- Criar usuário para NestJS (se necessário)
CREATE USER 'verte_nest'@'%' IDENTIFIED BY 'senha_segura';

-- Conceder permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON VerteApp.* TO 'verte_nest'@'%';

-- NÃO dar permissões de ALTER/DROP/CREATE
-- (para evitar alterações acidentais no schema)

FLUSH PRIVILEGES;
```

### 3. Validação

```bash
# Dentro do servidor NestJS
npm run start:prod

# Logs devem mostrar:
# ✅ Database connection established
# ✅ TypeORM initialized
```

---

## 🔗 Integração com Frontend

### 1. Configurar CORS

No arquivo `src/main.ts`, o CORS já está configurado:

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
});
```

Configure a variável `CORS_ORIGIN` no `.env`:

```bash
# Produção
CORS_ORIGIN=https://seu-frontend.vercel.app,https://www.seudominio.com

# Desenvolvimento
CORS_ORIGIN=http://localhost:3001,http://localhost:8000
```

### 2. Atualizar URLs no Frontend

No seu frontend Laravel/Vue, atualize a URL base da API:

```javascript
// .env do frontend (Vercel)
VITE_API_URL=https://api.verte.com
# ou
VITE_API_URL=https://seu-backend.vercel.app
```

### 3. Endpoints Compatíveis

Todos os **121 endpoints** são 100% compatíveis com o Laravel:

| Módulo | Endpoints | Status |
|--------|-----------|--------|
| Auth | `/api/v1/login`, `/api/v1/register` | ✅ |
| Users | `/api/v1/users/*` | ✅ |
| Contacts | `/api/v1/contacts/*` | ✅ |
| Campaigns | `/api/v1/campaigns/*` | ✅ |
| WhatsApp | `/api/v1/whatsapp/*` | ✅ |
| Payments | `/api/v1/payments/*` | ✅ |
| ... | 115+ endpoints adicionais | ✅ |

**Ver lista completa**: [API-ENDPOINTS.md](./API-ENDPOINTS.md)

### 4. Testar Integração

```bash
# Do frontend, testar login
curl -X POST https://api.verte.com/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@verte.com","password":"senha123"}'

# Resposta esperada:
{
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": 1,
    "name": "Teste",
    "email": "teste@verte.com"
  }
}
```

---

## 📊 Monitoramento e Logs

### 1. PM2 Monitoring

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs verte-backend

# Monitoramento
pm2 monit

# Métricas
pm2 describe verte-backend
```

### 2. Logs do Nginx

```bash
# Access logs
sudo tail -f /var/log/nginx/verte-backend-access.log

# Error logs
sudo tail -f /var/log/nginx/verte-backend-error.log
```

### 3. Logs da Aplicação

Os logs são salvos em `./logs/`:

```bash
# Ver logs de erro
tail -f logs/err.log

# Ver logs de output
tail -f logs/out.log
```

### 4. Ferramentas Recomendadas

- **Sentry**: Para tracking de erros
- **DataDog**: Para APM e métricas
- **New Relic**: Para performance monitoring
- **LogRocket**: Para session replay

---

## 🔧 Troubleshooting

### Erro: "Database connection failed"

```bash
# Verificar conectividade
telnet SEU_DB_HOST 3306

# Verificar credenciais no .env
cat .env | grep DB_

# Testar conexão MySQL
mysql -h SEU_HOST -u SEU_USUARIO -p -e "SELECT 1"
```

### Erro: "Redis connection refused"

```bash
# Verificar Redis rodando
redis-cli ping
# Resposta esperada: PONG

# Verificar .env
cat .env | grep REDIS_

# Restart Redis
sudo systemctl restart redis-server
```

### Erro: "Port 3000 already in use"

```bash
# Encontrar processo usando porta 3000
sudo lsof -i :3000

# Matar processo
sudo kill -9 PID
```

### Erro: "CORS policy blocked"

```bash
# Verificar CORS_ORIGIN no .env
cat .env | grep CORS_ORIGIN

# Deve incluir domínio do frontend
CORS_ORIGIN=https://seu-frontend.vercel.app
```

### Performance lenta

```bash
# Verificar uso de CPU/RAM
pm2 monit

# Verificar queries lentas no MySQL
# (ativar slow query log)

# Otimizar com cache Redis
# (já implementado no código)
```

---

## ✅ Checklist de Deploy

Antes de ir para produção, verifique:

- [ ] **Database**: Conectado ao mesmo banco do Laravel
- [ ] **Redis**: Rodando e acessível
- [ ] **WAHA**: API WhatsApp configurada
- [ ] **Stripe**: Keys de produção configuradas
- [ ] **CORS**: Domínios do frontend permitidos
- [ ] **SSL**: Certificado HTTPS configurado
- [ ] **Logs**: Sistema de logs funcionando
- [ ] **Backup**: Banco de dados com backup automático
- [ ] **Monitoring**: Ferramentas de monitoramento ativas
- [ ] **PM2**: Auto-restart configurado
- [ ] **Nginx**: Reverse proxy configurado
- [ ] **Firewall**: Portas apropriadas abertas
- [ ] **Testes**: 488/488 testes passando
- [ ] **Environment**: `.env` com todas as variáveis

---

## 📞 Suporte

- **Documentação**: [CLAUDE.md](./CLAUDE.md)
- **Integração**: [INTEGRATION.md](./INTEGRATION.md)
- **API Endpoints**: [API-ENDPOINTS.md](./API-ENDPOINTS.md)
- **Testes**: `npm run test:e2e`

---

**Status**: ✅ Pronto para Produção
**Última atualização**: Novembro 2024
