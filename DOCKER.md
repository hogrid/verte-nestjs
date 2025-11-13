# 🐳 Docker - Verte NestJS

Guia completo para executar o Verte NestJS com Docker.

---

## 📦 Arquivos Docker

```
.
├── Dockerfile                  # Build da aplicação NestJS
├── docker-compose.yml          # Produção/Staging
├── docker-compose.dev.yml      # Desenvolvimento (hot-reload)
└── .dockerignore              # Otimização do build
```

---

## 🚀 Quick Start

### Desenvolvimento (com hot-reload)

```bash
# Criar arquivo .env (se não existir)
cp .env.example .env

# Editar .env com suas credenciais
nano .env

# Iniciar todos os serviços
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f api

# Acessar
# API: http://localhost:3000
# Swagger: http://localhost:3000/api/docs
# PHPMyAdmin: http://localhost:8888
# WAHA: http://localhost:8080
```

### Produção/Staging

```bash
# Build e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Parar
docker-compose down
```

---

## 🛠️ Comandos Úteis

### Gerenciamento Básico

```bash
# Ver status dos containers
docker-compose ps

# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs apenas da API
docker-compose logs -f api

# Reiniciar apenas a API
docker-compose restart api

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (CUIDADO: apaga banco de dados!)
docker-compose down -v
```

### Build e Rebuild

```bash
# Rebuild da imagem (após mudanças no código)
docker-compose build api

# Rebuild forçado (sem cache)
docker-compose build --no-cache api

# Rebuild e restart
docker-compose up -d --build api
```

### Executar Comandos no Container

```bash
# Acessar shell do container
docker-compose exec api sh

# Executar comando npm
docker-compose exec api npm run typecheck

# Executar testes
docker-compose exec api npm run test:e2e

# Ver variáveis de ambiente
docker-compose exec api env
```

---

## 📋 Serviços Disponíveis

### 1. API NestJS (`api`)

**Produção**:
- Container: `verte_nestjs_api`
- Porta: `3000`
- Build otimizado (multi-stage)
- Health check: `/api/v1/health`

**Desenvolvimento**:
- Container: `verte_nestjs_dev`
- Porta: `3000`
- Volume montado para hot-reload
- Comando: `npm run start:dev`

### 2. MySQL/MariaDB (`mysql`)

- Container: `verte_db` (prod) / `verte_db_dev` (dev)
- Porta: `5306:3306`
- Volume persistente: `mysql_data`
- Credenciais: definidas no `.env`

**Conectar via CLI**:
```bash
docker-compose exec mysql mysql -u root -p
# Senha: valor de DB_PASSWORD no .env
```

### 3. Redis (`redis`)

- Container: `verte_redis` (prod) / `verte_redis_dev` (dev)
- Porta: `6379:6379`
- Volume persistente: `redis_data`
- Usado para: Cache + Bull Queue

**Conectar via CLI**:
```bash
docker-compose exec redis redis-cli
```

### 4. WAHA - WhatsApp (`waha`)

- Container: `verte_waha` (prod) / `verte_waha_dev` (dev)
- Porta: `8080:8080`
- Volume persistente: `waha_data`
- API: http://localhost:8080/api

**Debug mode**:
- Dev: `WAHA_DEBUG_MODE=true`
- Prod: `WAHA_DEBUG_MODE=false`

### 5. PHPMyAdmin (`phpmyadmin`)

- Container: `verte_dbadmin` (prod) / `verte_dbadmin_dev` (dev)
- Porta: `8888:80`
- URL: http://localhost:8888
- Login automático configurado

---

## ⚙️ Variáveis de Ambiente

### Arquivo `.env`

```env
# Database (CRÍTICO)
DB_HOST=mysql                  # Nome do serviço no Docker
DB_PORT=3306                   # Porta interna (não 5306!)
DB_DATABASE=verte_production
DB_USERNAME=root
DB_PASSWORD=yPiS83D8iN

# Redis
REDIS_HOST=redis               # Nome do serviço no Docker
REDIS_PORT=6379

# WAHA
WAHA_URL=http://waha:8080      # URL interna do Docker
API_WHATSAPP_GLOBALKEY=your-key

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=3600

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Node
NODE_ENV=production            # ou development
```

**⚠️ IMPORTANTE**:
- `DB_HOST=mysql` (não `localhost`)
- `DB_PORT=3306` (porta interna, não 5306)
- `REDIS_HOST=redis` (não `localhost`)
- `WAHA_URL=http://waha:8080` (URL interna)

---

## 🔧 Troubleshooting

### Erro: "Cannot connect to MySQL"

**Causa**: Backend tentando conectar antes do MySQL estar pronto

**Solução**:
```bash
# Verificar se MySQL está saudável
docker-compose ps

# Aguardar health check
docker-compose logs mysql | grep "ready for connections"

# Reiniciar API
docker-compose restart api
```

### Erro: "Port 3000 already in use"

**Causa**: Outra aplicação usando porta 3000

**Solução**:
```bash
# Encontrar processo
lsof -i :3000

# Matar processo
kill -9 <PID>

# Ou mudar porta no docker-compose.yml
ports:
  - "3001:3000"
```

### Container reiniciando constantemente

**Diagnóstico**:
```bash
# Ver logs
docker-compose logs -f api

# Ver últimos erros
docker-compose logs --tail=100 api

# Verificar health check
docker inspect verte_nestjs_api | grep -A 10 Health
```

### Hot-reload não funcionando (Dev)

**Causa**: Volume não montado corretamente

**Solução**:
```bash
# Rebuild sem cache
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d

# Verificar volumes
docker-compose -f docker-compose.dev.yml exec api ls -la /app
```

### Banco de dados vazio após restart

**Causa**: Volume não persistido

**Solução**:
```bash
# Verificar volumes
docker volume ls | grep mysql

# Inspecionar volume
docker volume inspect verte-nestjs_mysql_data

# Backup manual
docker-compose exec mysql mysqldump -u root -p verte_production > backup.sql
```

---

## 🎯 Workflow Recomendado

### Desenvolvimento Local

**Opção 1: Docker Dev (recomendado para novos devs)**
```bash
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml logs -f api
```

**Opção 2: Híbrido (banco no Docker, API local)**
```bash
# Subir apenas banco, redis e waha
docker-compose -f docker-compose.dev.yml up -d mysql redis waha phpmyadmin

# Rodar API localmente
npm run start:dev
```

### Staging

```bash
# Build e deploy
docker-compose build
docker-compose up -d

# Monitorar logs
docker-compose logs -f api

# Verificar saúde
curl http://localhost:3000/api/v1/health
```

### Produção

```bash
# Pull última imagem
docker-compose pull

# Deploy com zero downtime
docker-compose up -d --no-deps --build api

# Verificar
docker-compose ps
docker-compose logs -f api
```

---

## 📊 Monitoramento

### Health Checks

Todos os serviços possuem health checks configurados:

```bash
# Status geral
docker-compose ps

# Health da API
curl http://localhost:3000/api/v1/health

# Health do WAHA
curl http://localhost:8080/api/health

# Health do Redis
docker-compose exec redis redis-cli ping
```

### Métricas

```bash
# Uso de recursos
docker stats

# Logs em tempo real
docker-compose logs -f --tail=100

# Logs específicos
docker-compose logs -f api | grep ERROR
```

---

## 🔐 Segurança

### Produção

**SEMPRE** fazer antes de deploy em produção:

1. **Remover credenciais padrão**:
```env
DB_PASSWORD=SenhaForteAqui123!@#
MARIADB_ROOT_PASSWORD=SenhaForteAqui123!@#
```

2. **Alterar JWT secret**:
```env
JWT_SECRET=$(openssl rand -base64 32)
```

3. **Desabilitar PHPMyAdmin** (opcional):
```yaml
# Comentar serviço phpmyadmin no docker-compose.yml
```

4. **Usar secrets do Docker**:
```bash
# Ver documentação: https://docs.docker.com/engine/swarm/secrets/
```

---

## 📝 Scripts Auxiliares

### backup.sh

```bash
#!/bin/bash
# Backup do banco de dados
docker-compose exec mysql mysqldump -u root -p${DB_PASSWORD} ${DB_DATABASE} > backup-$(date +%Y%m%d).sql
```

### restore.sh

```bash
#!/bin/bash
# Restore do banco de dados
docker-compose exec -T mysql mysql -u root -p${DB_PASSWORD} ${DB_DATABASE} < backup.sql
```

### logs.sh

```bash
#!/bin/bash
# Ver logs coloridos
docker-compose logs -f --tail=100 api
```

---

## 🌐 Rede Docker

A rede `VerteApp` conecta todos os serviços:

```
VerteApp (bridge)
├── api (verte_nestjs_api)      → 3000
├── mysql (verte_db)            → 3306
├── redis (verte_redis)         → 6379
├── waha (verte_waha)           → 8080
└── phpmyadmin (verte_dbadmin)  → 80
```

**Comunicação interna**:
- API → MySQL: `mysql:3306`
- API → Redis: `redis:6379`
- API → WAHA: `http://waha:8080`

**Acesso externo** (host):
- API: `localhost:3000`
- MySQL: `localhost:5306`
- Redis: `localhost:6379`
- WAHA: `localhost:8080`
- PHPMyAdmin: `localhost:8888`

---

## 📚 Recursos Adicionais

- **Docker Docs**: https://docs.docker.com
- **Docker Compose Docs**: https://docs.docker.com/compose
- **NestJS Docker**: https://docs.nestjs.com/recipes/docker
- **Multi-stage Builds**: https://docs.docker.com/build/building/multi-stage/

---

**Última atualização**: Novembro 2024
**Status**: ✅ Pronto para uso
