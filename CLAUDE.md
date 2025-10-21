# Verte Backend - NestJS

[![Migration Status](https://img.shields.io/badge/migration-in%20progress-yellow)](https://github.com/seu-org/verte-nestjs)
[![Compatibility](https://img.shields.io/badge/compatibility-100%25%20required-critical)](./docs/migration-specs/migration-master-spec.md)
[![Laravel Original](https://img.shields.io/badge/source-Laravel%208-red)](../verte-back)

Backend NestJS do sistema **Verte** - Plataforma de automação de marketing via WhatsApp.

> **⚠️ PROJETO EM MIGRAÇÃO**: Este é um projeto de migração Laravel → NestJS. Compatibilidade 100% com o projeto Laravel original é **OBRIGATÓRIA**.

---

## 📋 Sobre o Projeto

Este repositório contém a **migração do backend Verte de Laravel 8 para NestJS 10**, mantendo:

- ✅ **121 rotas** idênticas ao Laravel
- ✅ **Mesmo banco de dados** MySQL (22+ tabelas)
- ✅ **Responses JSON** idênticos
- ✅ **Validações** em português preservadas
- ✅ **Zero impacto** no frontend
- ✅ **Integrações** mantidas (WAHA, Stripe, MercadoPago)

### 🎯 Objetivo

**Trocar a tecnologia (Laravel → NestJS) mantendo tudo funcionando exatamente igual.**

O frontend **NÃO DEVE** perceber diferença nenhuma na API.

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- MySQL/MariaDB (mesmo banco do Laravel)
- Redis
- Docker (opcional)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-org/verte-nestjs.git
cd verte-nestjs

# Instale dependências
npm install

# Configure .env (baseado no Laravel)
cp .env.example .env

# IMPORTANTE: Configure para usar o MESMO banco de dados
# DB_DATABASE=verte_production (mesmo do Laravel)

# Inicie em desenvolvimento
npm run start:dev
```

### Configuração do Banco de Dados

**CRÍTICO**: Este projeto usa o **MESMO banco de dados** do Laravel.

```env
# .env
DB_HOST=localhost
DB_PORT=5306
DB_DATABASE=verte_production  # MESMO do Laravel
DB_USERNAME=root
DB_PASSWORD=root
```

**⚠️ NÃO executar migrations que criem novas tabelas!**

---

## 📚 Documentação

### Para Desenvolvedores

- **[CLAUDE.md](./CLAUDE.md)** - Instruções para Claude Code
- **[agents.md](./agents.md)** - Instruções para Agentes de IA
- **[docs/migration/](./docs/migration/)** - Documentação completa de migração

### Documentação de Migração

| Documento | Descrição |
|-----------|-----------|
| [README.md](./docs/migration/README.md) | Visão geral da migração |
| [routes-inventory.md](./docs/migration/routes-inventory.md) | 121 rotas documentadas |
| [business-rules.md](./docs/migration/business-rules.md) | Lógica de negócio |
| [database-schema.md](./docs/migration/database-schema.md) | 22+ tabelas |
| [models-relationships.md](./docs/migration/models-relationships.md) | Modelos e relacionamentos |
| [migration-master-spec.md](./docs/migration-specs/migration-master-spec.md) | **Regras críticas** |

---

## 🏗️ Arquitetura

### Stack Tecnológica

```
NestJS 10
├── TypeScript 5
├── TypeORM (MySQL)
├── Passport JWT
├── Bull Queue (Redis)
├── Class Validator
└── Jest (Testing)
```

### Estrutura de Módulos

```
src/
├── auth/              # Autenticação JWT (6 endpoints)
├── campaigns/         # Campanhas (21 endpoints)
├── contacts/          # Contatos (11 endpoints)
├── whatsapp/          # WAHA Integration (15 endpoints)
├── payments/          # Stripe/MercadoPago (5 endpoints)
├── users/             # Gerenciamento (16 endpoints)
├── plans/             # Planos (8 endpoints)
├── publics/           # Públicos-alvo (8 endpoints)
├── labels/            # Labels
├── database/          # Entities TypeORM
│   └── entities/      # 22+ entidades
└── common/            # Guards, Validators, etc.
```

---

## 🔄 Status da Migração

### Fase 1: Infraestrutura ⏳ Em Progresso

- [x] Setup NestJS base
- [x] Documentação copiada
- [ ] TypeORM configurado
- [ ] JWT configurado
- [ ] Redis configurado
- [ ] Bull Queue configurado

### Fase 2: Core Business ⏸️ Aguardando

- [ ] Módulo Auth (6 endpoints)
- [ ] Módulo Users (13 endpoints)
- [ ] Módulo Campaigns (21 endpoints)
- [ ] Módulo Contacts (11 endpoints)

### Fase 3: Integrações ⏸️ Aguardando

- [ ] WhatsApp/WAHA (15 endpoints)
- [ ] Payments (5 endpoints)
- [ ] Email service
- [ ] File storage

### Fase 4: Admin & Utils ⏸️ Aguardando

- [ ] Endpoints admin (16)
- [ ] Planos (8)
- [ ] Públicos/Labels (8)
- [ ] Utilities (24)

### Fase 5: Deploy ⏸️ Aguardando

- [ ] Testes compatibilidade 100%
- [ ] Performance testing
- [ ] Production deployment

**Progresso Geral**: 5% (6 de 121 endpoints)

---

## 🧪 Testes

### Executar Testes

```bash
# Testes unitários
npm run test

# Testes E2E
npm run test:e2e

# Testes de compatibilidade com Laravel
npm run test:compatibility

# Coverage
npm run test:cov
```

### Testes de Compatibilidade

```bash
# Testar endpoint específico
npm run test:compat -- --endpoint=/api/v1/login

# Testar módulo completo
npm run test:compat -- --module=auth

# Gerar relatório de diferenças
npm run test:diff-report
```

---

## 📖 Scripts Disponíveis

```bash
# Desenvolvimento
npm run start:dev          # Desenvolvimento com hot-reload
npm run build              # Build para produção
npm run start:prod         # Execução em produção

# Testes
npm run test               # Testes unitários
npm run test:e2e           # Testes E2E
npm run test:compat        # Testes de compatibilidade

# Utilitários
npm run lint               # ESLint
npm run format             # Prettier
npm run migration:status   # Status da migração
```

---

## 🔑 Variáveis de Ambiente

### Essenciais

```env
# App
NODE_ENV=development
PORT=3000

# Database (MESMO do Laravel!)
DB_HOST=localhost
DB_PORT=5306
DB_DATABASE=verte_production
DB_USERNAME=root
DB_PASSWORD=root

# JWT (compatível com Sanctum)
JWT_SECRET=your-secret-key
JWT_EXPIRATION=3600s

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# WAHA (WhatsApp API)
WAHA_URL=http://waha:8080
API_WHATSAPP_GLOBALKEY=your-global-key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR_xxx
```

---

## 📊 API Endpoints

### Resumo por Categoria

| Categoria | Endpoints | Status |
|-----------|-----------|--------|
| Autenticação | 6 | ⏸️ Pendente |
| Usuários | 13 | ⏸️ Pendente |
| Campanhas | 21 | ⏸️ Pendente |
| Contatos | 11 | ⏸️ Pendente |
| WhatsApp | 15 | ⏸️ Pendente |
| Pagamentos | 5 | ⏸️ Pendente |
| Admin | 16 | ⏸️ Pendente |
| Planos | 8 | ⏸️ Pendente |
| Públicos/Labels | 8 | ⏸️ Pendente |
| Utilities | 18 | ⏸️ Pendente |
| **TOTAL** | **121** | **5% completo** |

### Exemplos de Endpoints

```bash
# Autenticação
POST   /api/v1/login
POST   /api/v1/logout
GET    /api/v1/ping

# Campanhas
GET    /api/v1/campaigns
POST   /api/v1/campaigns
GET    /api/v1/campaigns/{id}

# WhatsApp
GET    /api/v1/connect-whatsapp
GET    /api/v1/connect-whatsapp-check
POST   /api/v1/force-check-whatsapp-connections

# Documentação completa: docs/migration/routes-inventory.md
```

---

## 🚨 Regras Críticas

### SEMPRE Faça

✅ Consultar projeto Laravel em `../verte-back/`
✅ Ler documentação em `docs/migration/`
✅ Manter URIs de rotas idênticas
✅ Preservar estrutura de responses
✅ Manter validações em português
✅ Usar mesmo banco de dados
✅ Escrever testes de compatibilidade

### NUNCA Faça

❌ Alterar URIs de rotas
❌ Criar novas tabelas
❌ Mudar estrutura de responses
❌ Alterar mensagens de validação
❌ Ignorar soft deletes
❌ Usar diferentes status codes
❌ Implementar sem consultar Laravel

---

## 🔗 Links Úteis

- **Projeto Laravel Original**: [`../verte-back/`](../verte-back/)
- **Documentação de Migração**: [`docs/migration/`](./docs/migration/)
- **Regras Críticas**: [`docs/migration-specs/migration-master-spec.md`](./docs/migration-specs/migration-master-spec.md)
- **NestJS Docs**: https://docs.nestjs.com
- **TypeORM Docs**: https://typeorm.io

---

## 🤝 Contribuindo

### Workflow de Contribuição

1. **Consulte a documentação**
   - Leia `docs/migration/routes-inventory.md`
   - Consulte `../verte-back/` para o código Laravel original

2. **Implemente mantendo compatibilidade**
   - URIs idênticas
   - Validações idênticas
   - Responses idênticos

3. **Escreva testes**
   - Testes E2E obrigatórios
   - Validar compatibilidade 100%

4. **Submeta PR**
   - Descrição clara das mudanças
   - Testes passando
   - Documentação atualizada

---

## 📝 License

[Especificar licença do projeto]

---

## 👥 Equipe

- **Projeto Original (Laravel)**: [Time original]
- **Migração (NestJS)**: [Time de migração]

---

## 🆘 Suporte

**Dúvidas sobre a migração?**

1. Consulte: [`CLAUDE.md`](./CLAUDE.md) ou [`agents.md`](./agents.md)
2. Leia: [`docs/migration/`](./docs/migration/)
3. Veja código Laravel: [`../verte-back/`](../verte-back/)

---

**Última atualização**: Outubro 2024
**Status**: Migração em andamento (5%)
