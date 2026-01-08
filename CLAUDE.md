# Verte Backend - NestJS

[![Migration Status](https://img.shields.io/badge/migration-100%25%20COMPLETA-success)](https://github.com/seu-org/verte-nestjs)
[![Compatibility](https://img.shields.io/badge/compatibility-100%25%20Laravel-success)](./docs/migration-specs/migration-master-spec.md)
[![Tests](https://img.shields.io/badge/tests-415%2B%20scenarios-brightgreen)](./test)
[![Laravel Original](https://img.shields.io/badge/source-Laravel%208-red)](../verte-back)

Backend NestJS do sistema **Verte** - Plataforma de automação de marketing via WhatsApp.

> **✅ MIGRAÇÃO COMPLETA**: 121/121 endpoints implementados com 100% de compatibilidade Laravel.

---

## 📊 Status da Migração

### ✅ Implementação: 100% Completa

- **121/121 endpoints** implementados
- **415+ cenários de teste E2E** (100% passando)
- **22+ tabelas** MySQL compartilhadas com Laravel
- **Integrações**: **Evolution API v2** (WhatsApp), Stripe, MercadoPago
- **100% compatibilidade** Laravel (responses idênticos, validações em português)

### ⚡ Mudança Importante: Evolution API + Arquitetura Desacoplada

**Migrado WAHA → Cloud API → Evolution API com arquitetura provider-based**

**Vantagens Evolution API:**
- ✅ Múltiplas sessões (cada usuário conecta seu próprio número via QR Code)
- ✅ Conexão via QR Code (não precisa aprovação Meta)
- ✅ Open-source e auto-hospedável
- ✅ Gratuito e sem limitações
- ✅ API completa (mensagens, mídia, webhooks)

**Arquitetura Desacoplada:**
- ✅ Interface `IWhatsAppProvider` abstrata
- ✅ Fácil trocar entre providers (Evolution API, WAHA, Cloud API, etc)
- ✅ Dependency Injection via NestJS
- ✅ Zero mudanças no service/controller ao trocar provider

### 📦 Módulos Implementados

| Categoria | Módulos | Endpoints | Testes E2E |
|-----------|---------|-----------|------------|
| **Core** | Auth, Users, Plans | 20 | ✅ 66 cenários |
| **Contatos** | Contacts, Labels, Publics | 18 | ✅ 99 cenários |
| **Campanhas** | Campaigns, Templates, Queue | 20 | ✅ 47 cenários |
| **WhatsApp** | WhatsApp (Evolution API), Numbers, Schedule | 25 | ✅ 63 cenários |
| **Pagamentos** | Payments (Stripe) | 4 | ✅ 16 cenários |
| **Arquivos** | Files, Export | 5 | ✅ 34 cenários |
| **Admin** | Admin, Dashboard, Utilities | 29 | ✅ 63 cenários |
| **Extras** | User Profile, Extractor, Remaining | 20 | ✅ 27 cenários |
| **TOTAL** | **21 módulos** | **121** | **✅ 415+** |

---

## 🚀 Quick Start

### Instalação

```bash
# Clone e instale
git clone https://github.com/seu-org/verte-nestjs.git
cd verte-nestjs
npm install

# Configure ambiente (MESMO banco do Laravel)
cp .env.example .env
# Edite .env com suas credenciais

# Inicie Evolution API (WhatsApp) via Docker
docker-compose up -d

# Inicie o backend NestJS
npm run start:dev
```

### Configuração Essencial

```env
# Database (CRÍTICO: MESMO do Laravel!)
# Frontend já roda MySQL via docker-compose - conectar nele
DB_HOST=localhost
DB_PORT=5306
DB_DATABASE=VerteApp
DB_USERNAME=root
DB_PASSWORD=yPiS83D8iN

# JWT (compatível com Sanctum)
JWT_SECRET=your-secret-key
JWT_EXPIRATION=3600

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Evolution API (WhatsApp - via Docker)
# docker-compose.yml inicia Evolution API automaticamente
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=change-me-to-secure-api-key
```

**⚠️ Database setup**:
- MySQL roda via docker-compose do **frontend** (verte-front)
- Backend NestJS conecta em `localhost:5306` (MySQL do frontend)
- Tabelas já existem (compartilhadas com Laravel legacy)

---

## 🧪 Testes

### Executar Testes

```bash
# Testes E2E (415+ cenários)
npm run test:e2e

# Testes específicos
npm run test:e2e -- test/auth/auth.e2e-spec.ts

# Build + Type Check
npm run build
npm run typecheck

# Validação completa (OBRIGATÓRIO antes de commit)
npm run validate:full
```

### Cobertura de Testes

**21 arquivos de teste E2E** cobrindo:
- ✅ Autenticação e autorização (JWT + AdminGuard)
- ✅ CRUD completo de todos os recursos
- ✅ Validações em português
- ✅ Soft deletes, Integrações (Stripe, Evolution API)
- ✅ Upload/Download de arquivos
- ✅ Paginação estilo Laravel
- ✅ Webhooks e callbacks

---

## 📚 Arquitetura

### Stack

```
NestJS 10 + TypeScript 5
├── TypeORM (MySQL - shared with Laravel)
├── Passport JWT (auth)
├── Bull Queue + Redis (jobs)
├── Stripe SDK (payments)
├── Multer (file uploads)
└── Jest (testing)
```

### Estrutura

```
src/
├── auth/              # Autenticação JWT (6 endpoints)
├── users/             # Usuários + configuração (8 endpoints)
├── plans/             # Planos de assinatura (6 endpoints)
├── contacts/          # Contatos (9 endpoints)
├── labels/            # Labels (3 endpoints)
├── publics/           # Públicos-alvo (6 endpoints)
├── campaigns/         # Campanhas (16 endpoints)
├── templates/         # Templates de mensagens (4 endpoints)
├── whatsapp/          # Integração Evolution API (15 endpoints)
├── numbers/           # Instâncias WhatsApp (6 endpoints)
├── schedule/          # Agendamento (jobs)
├── queue/             # Filas assíncronas (Bull)
├── payments/          # Stripe (4 endpoints)
├── files/             # Upload/Download (3 endpoints)
├── export/            # Exportação CSV (2 endpoints)
├── admin/             # Administração (11 endpoints)
├── dashboard/         # Dashboard (2 endpoints)
├── utilities/         # Utilitários (19 endpoints)
├── user-profile/      # Perfil do usuário (2 endpoints)
├── extractor/         # Extrator (3 endpoints)
├── remaining/         # Endpoints finais (18 endpoints)
└── database/
    └── entities/      # 22+ entidades TypeORM
```

---

## ✅ Regras Críticas (Compatibilidade Laravel)

### SEMPRE Faça

- ✅ Manter URIs de rotas **idênticas**
- ✅ Preservar estrutura de responses JSON
- ✅ Manter validações em **português**
- ✅ Usar **mesmo banco de dados**
- ✅ Implementar soft deletes
- ✅ Manter status codes corretos
- ✅ Consultar código Laravel original em `../verte-back/`

### NUNCA Faça

- ❌ Alterar URIs de rotas
- ❌ Criar novas tabelas no banco
- ❌ Mudar estrutura de responses
- ❌ Alterar mensagens de validação
- ❌ Ignorar soft deletes
- ❌ Usar diferentes status codes

---

## 📖 Documentação Swagger

**URL**: http://localhost:3000/api/docs

Documentação completa e interativa de todos os 121 endpoints.

---

## 🎯 Status Atual e Próximos Passos

### ✅ Fase Atual: Testes de Compatibilidade Frontend (13/11/2025)

**Status**: Backend 100% funcional, iniciando testes manuais com frontend React

**Status Atual**:
- ✅ Backend NestJS 100% funcional (121 endpoints)
- ✅ Evolution API integrada (QR Code + polling)
- ✅ Frontend React conectado ao backend
- ✅ Testes E2E: 415+ cenários passando

---

## 🔧 Scripts Úteis

```bash
# Desenvolvimento
npm run start:dev          # Dev com hot-reload
npm run build              # Build produção
npm run start:prod         # Executar produção

# Testes
npm run test               # Unit tests
npm run test:e2e           # E2E tests (415+ cenários)
npm run test:cov           # Coverage report

# Validação (OBRIGATÓRIO antes de commit)
npm run typecheck          # TypeScript check
npm run lint               # ESLint
npm run validate:full      # typecheck + lint + build + tests

# Database
npm run migration:status   # Ver status
# NÃO usar migration:run (usa banco Laravel)
```

---

## 📝 Informações Importantes

### TypeScript Strict Mode

Configurado com validações pragmáticas:
- ✅ `strict: true`
- ✅ `noImplicitAny: true`
- ⚡ `strictPropertyInitialization: false` (TypeORM)

**Workflow obrigatório**:
```bash
npm run validate:full  # ANTES de QUALQUER commit
```

### Soft Deletes

Todas as entities principais implementam soft delete:
- Campo `deleted_at` (nullable)
- Usar `IsNull()` em queries
- `.withDeleted()` para incluir deletados

### Paginação Laravel

```typescript
{
  data: [...],
  meta: {
    current_page: 1,
    from: 1,
    to: 15,
    per_page: 15,
    total: 100,
    last_page: 7
  }
}
```

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Endpoints Implementados | 121/121 (100%) |
| Módulos NestJS | 21 |
| Testes E2E | 415+ cenários |
| Compatibilidade Laravel | 100% |

---

**Status**: ✅ Migração 100% Completa
**Stack**: NestJS + TypeORM + MySQL + Redis + Bull + Evolution API
**Última atualização**: Novembro 2024
