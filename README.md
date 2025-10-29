# Verte Backend - NestJS

[![Migration Status](https://img.shields.io/badge/migration-5%25%20complete-yellow)](https://github.com/seu-org/verte-nestjs)
[![Compatibility](https://img.shields.io/badge/compatibility-100%25-success)](./docs/migration-specs/migration-master-spec.md)
[![Laravel Original](https://img.shields.io/badge/source-Laravel%208-red)](../verte-back)
[![Tested](https://img.shields.io/badge/tested-E2E%20100%25-brightgreen)](./test/auth/auth.e2e-spec.ts)

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
├── auth/              # ✅ Autenticação JWT (6 endpoints)
├── campaigns/         # Campanhas (21 endpoints)
├── contacts/          # Contatos (11 endpoints)
├── whatsapp/          # WAHA Integration (15 endpoints)
├── payments/          # Stripe/MercadoPago (5 endpoints)
├── users/             # Gerenciamento (16 endpoints)
├── plans/             # Planos (8 endpoints)
├── publics/           # Públicos-alvo (8 endpoints)
├── labels/            # Labels
├── database/          # ✅ Entities TypeORM (5 entities implementadas)
│   └── entities/      # 22+ entidades ao todo
└── common/            # ✅ Guards, Validators, Filters
```

---

## 🔄 Status da Migração

### Progresso Geral: 5% (6/121 endpoints)

### Módulos Completos ✅

#### 🔐 Auth Module (6/6 endpoints - 100%)
- ✅ POST /api/v1/login
- ✅ POST /api/v1/logout
- ✅ POST /api/v1/register
- ✅ POST /api/v1/reset (multi-step)
- ✅ GET /api/v1/ping
- ✅ POST /api/v1/check-mail-confirmation-code

**Features**:
- ✅ JWT Authentication (Passport + JWT Strategy)
- ✅ TypeORM Entities (User, Plan, Number, Configuration, PasswordReset)
- ✅ Custom Validators (IsUnique, IsCpfOrCnpj)
- ✅ Testes E2E completos (100% cobertura)
- ✅ Laravel compatibility validated

### Módulos Pendentes ⏸️

| Módulo | Endpoints | Status |
|--------|-----------|--------|
| Users | 13 | Pendente (0/13) |
| Campaigns | 21 | Pendente (0/21) |
| Contacts | 11 | Pendente (0/11) |
| WhatsApp | 15 | Pendente (0/15) |
| Payments | 5 | Pendente (0/5) |
| Admin | 16 | Pendente (0/16) |
| Plans | 8 | Pendente (0/8) |
| Publics/Labels | 8 | Pendente (0/8) |
| Utilities | 18 | Pendente (0/18) |

---

## 🧪 Testes

### Executar Testes

```bash
# Testes unitários
npm run test

# Testes E2E
npm run test:e2e

# Testes de compatibilidade com Laravel
npm run test:e2e -- test/auth/auth.e2e-spec.ts

# Coverage
npm run test:cov
```

### Status de Testes

| Módulo | Cobertura | Status |
|--------|-----------|--------|
| Auth | 100% (6/6 endpoints) | ✅ Passing |
| Users | 0% | ⏸️ Pendente |
| Campaigns | 0% | ⏸️ Pendente |
| Contacts | 0% | ⏸️ Pendente |
| WhatsApp | 0% | ⏸️ Pendente |
| Payments | 0% | ⏸️ Pendente |

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
npm run test:cov           # Coverage report

# Utilitários
npm run lint               # ESLint
npm run format             # Prettier
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
JWT_EXPIRATION=3600

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
| Autenticação | 6 | ✅ **Completo** (6/6) |
| Usuários | 13 | ⏸️ Pendente (0/13) |
| Campanhas | 21 | ⏸️ Pendente (0/21) |
| Contatos | 11 | ⏸️ Pendente (0/11) |
| WhatsApp | 15 | ⏸️ Pendente (0/15) |
| Pagamentos | 5 | ⏸️ Pendente (0/5) |
| Admin | 16 | ⏸️ Pendente (0/16) |
| Planos | 8 | ⏸️ Pendente (0/8) |
| Públicos/Labels | 8 | ⏸️ Pendente (0/8) |
| Utilities | 18 | ⏸️ Pendente (0/18) |
| **TOTAL** | **121** | **5% completo** (6/121) |

### Endpoints Implementados

```bash
# ✅ Autenticação (6 endpoints - 100% revisado e validado)
POST   /api/v1/login                        # Login with JWT
POST   /api/v1/logout                       # Logout (requires auth)
POST   /api/v1/register                     # User registration
POST   /api/v1/reset                        # Password reset (multi-step)
GET    /api/v1/ping                         # Auth status + user data
POST   /api/v1/check-mail-confirmation-code # Email verification

# Documentação completa: docs/migration/routes-inventory.md
# Documentação Swagger: http://localhost:3000/api/docs
```

**Status do Módulo Auth:**
- ✅ Compatibilidade Laravel: 100% validada
- ✅ Testes E2E: 27/27 passando (100% coverage)
- ✅ Documentação Swagger: Completa com exemplos realistas
- ✅ Validações: Enums corretos, campos automáticos documentados
- ✅ Type-safety: Enums TypeScript em vez de strings hardcoded

---

## 🔍 Processo de Revisão de Código

Este projeto segue um processo sistemático de revisão para garantir compatibilidade 100% com Laravel:

### Checklist de Revisão

Ao implementar ou revisar qualquer endpoint:

1. **Consultar Laravel**: Analisar código original linha por linha
2. **Validar Enums**: Verificar valores EXATOS do banco de dados
3. **Campos Automáticos**: Identificar e documentar campos auto-setados
4. **DTOs Completos**: Incluir todos os campos necessários com validações corretas
5. **Service Type-Safe**: Usar enums TypeScript (não strings hardcoded)
6. **Swagger Completo**: Documentar com exemplos realistas
7. **Testar**: Compilação, Swagger UI, E2E tests

**Processo detalhado**: Consulte [CLAUDE.md - Processo de Revisão](./CLAUDE.md#-processo-de-revisão-e-validação-de-código)

### Exemplo: Validação de Enums

```typescript
// ❌ ERRADO: Valores diferentes do banco
enum: ['admin', 'user']

// ✅ CORRETO: Valores exatos do Laravel/banco
export enum UserProfile {
  USER = 'user',
  ADMINISTRATOR = 'administrator',  // Não 'admin'!
}
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

**Última atualização**: Outubro 2024 (Commit df39c30)
**Status**: Migração em andamento (5% - 6/121 endpoints)
**Módulos completos**: Auth (6 endpoints) ✅
