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

### Fase 1: Infraestrutura ✅ Concluída

- [x] Setup NestJS base
- [x] Documentação copiada
- [x] TypeORM configurado
- [x] JWT configurado (Passport + JWT Strategy)
- [ ] Redis configurado
- [ ] Bull Queue configurado

### Fase 2: Core Business ⏳ Em Progresso

- [x] **Módulo Auth (6 endpoints) ✅ COMPLETO**
  - POST /api/v1/login
  - POST /api/v1/logout
  - POST /api/v1/register
  - POST /api/v1/reset (multi-step)
  - GET /api/v1/ping
  - POST /api/v1/check-mail-confirmation-code
- [x] **Módulo Plans (5 endpoints) ✅ COMPLETO**
  - GET /api/v1/plans
  - POST /api/v1/plans
  - PUT /api/v1/plans/{id}
  - DELETE /api/v1/plans/{id}
  - GET /api/v1/plans/{id}
- [x] **Módulo Users (8 endpoints) ✅ COMPLETO**
  - GET /api/v1/user
  - PUT /api/v1/user
  - DELETE /api/v1/user
  - PUT /api/v1/user-update-profile
  - PUT /api/v1/user-change-password
  - PUT /api/v1/user/choose-plan
  - POST /api/v1/user/check-session-password
  - GET /api/v1/user-plan
- [x] **Módulo Contacts (9 endpoints) ✅ COMPLETO**
  - GET /api/v1/contacts
  - POST /api/v1/contacts
  - PUT /api/v1/contacts/{id}
  - DELETE /api/v1/contacts/{id}
  - PUT /api/v1/contacts-status
  - POST /api/v1/contacts-block
  - GET /api/v1/contacts-search
  - POST /api/v1/contacts-import-csv
  - POST /api/v1/test-import
- [x] **Módulo Labels (3 endpoints) ✅ COMPLETO**
  - GET /api/v1/contacts/labels
  - POST /api/v1/contacts/labels
  - DELETE /api/v1/contacts/labels/{id}
- [x] **Módulo Públicos (6 endpoints) ✅ COMPLETO**
  - GET /api/v1/publics
  - POST /api/v1/publics/{id}
  - GET /api/v1/publics/download-contacts/{id}
  - POST /api/v1/publics-duplicate
  - DELETE /api/v1/publics/{id}
  - GET /api/v1/publics/contact
- [x] **Módulo Campaigns (16 endpoints - CRUD) ✅ COMPLETO** (Fase 1 concluída, faltam 5 endpoints de integrações para Fase 5)

### Fase 3: Integrações ⏸️ Aguardando

- [ ] WhatsApp/WAHA (15 endpoints)
- [ ] Payments (5 endpoints)
- [ ] Email service
- [ ] File storage

### Fase 4: Admin & Utils ⏸️ Aguardando

- [ ] Endpoints admin (16)
- [ ] Utilities (24)

### Fase 5: Deploy ⏸️ Aguardando

- [ ] Testes compatibilidade 100%
- [ ] Performance testing
- [ ] Production deployment

**Progresso Geral**: 43.8% (53 de 121 endpoints)

---

## ✅ Módulos Implementados

### 🔐 Módulo Auth (6/6 endpoints - 100%)

**Localização**: `src/auth/`

**Entities criadas** (`src/database/entities/`):
- ✅ `User` - Usuários com soft deletes, enums (UserStatus, UserProfile)
- ✅ `Plan` - Planos com pricing e feature flags
- ✅ `Number` - Instâncias WhatsApp
- ✅ `Configuration` - Configurações do usuário
- ✅ `PasswordReset` - Tokens de reset de senha

**DTOs criados** (`src/auth/dto/`):
- ✅ `LoginDto` - Validação de login
- ✅ `RegisterDto` - Registro com validadores customizados
- ✅ `ResetPasswordDto` - Multi-step password reset
- ✅ `CheckMailConfirmationDto` - Verificação de email

**Features implementadas**:
- ✅ JWT Authentication (Passport + JWT Strategy)
- ✅ Custom Validators:
  - `IsUnique` - Validação de unicidade no banco (respeita soft deletes)
  - `IsCpfOrCnpj` - Validação de documentos brasileiros (CPF/CNPJ)
- ✅ `Match` Decorator - Confirmação de senha
- ✅ Validation Exception Filter - Formato Laravel de erros

**Endpoints disponíveis**:
```typescript
POST   /api/v1/login                        // Autenticação com JWT
POST   /api/v1/logout                       // Logout (requer auth)
POST   /api/v1/register                     // Registro de usuário
POST   /api/v1/reset                        // Reset senha (steps 0, 1, 2)
GET    /api/v1/ping                         // Status auth + dados user
POST   /api/v1/check-mail-confirmation-code // Verificação de email
```

**Testes E2E**: ✅ Completo
- Localização: `test/auth/auth.e2e-spec.ts`
- Cobertura: 100% (todos os 6 endpoints testados)
- Cenários: Positivos e negativos
- Validações: Mensagens em português, status codes, estrutura responses
- Laravel compatibility: 100% validado

**Compatibilidade Laravel**: ✅ 100%
- ✅ Responses JSON idênticos
- ✅ Mensagens de validação em português
- ✅ Status codes corretos (200, 401, 422)
- ✅ Estrutura de dados preservada
- ✅ Mesmo banco de dados (synchronize: false)

---

### 💳 Módulo Plans (5/5 endpoints - 100%)

**Localização**: `src/plans/`

**Entities utilizadas**:
- ✅ `Plan` - Planos de assinatura

**DTOs criados**:
- ✅ `CreatePlanDto` - Criação de planos
- ✅ `UpdatePlanDto` - Atualização de planos

**Endpoints disponíveis**:
```typescript
GET    /api/v1/plans           // Listar todos os planos
POST   /api/v1/plans           // Criar novo plano
GET    /api/v1/plans/{id}      // Buscar plano específico
PUT    /api/v1/plans/{id}      // Atualizar plano
DELETE /api/v1/plans/{id}      // Deletar plano (soft delete)
```

**Testes E2E**: ✅ Completo (15 testes)
**Compatibilidade Laravel**: ✅ 100%

---

### 👥 Módulo Users (8/8 endpoints - 100%)

**Localização**: `src/users/`

**Entities utilizadas**:
- ✅ `User` - Usuários do sistema
- ✅ `Plan` - Planos de assinatura
- ✅ `Configuration` - Configurações do usuário

**DTOs criados**:
- ✅ `UpdateUserDto` - Atualização de dados
- ✅ `UpdateProfileDto` - Atualização de perfil
- ✅ `ChangePasswordDto` - Alteração de senha
- ✅ `ChoosePlanDto` - Escolha de plano
- ✅ `CheckSessionPasswordDto` - Validação de senha

**Endpoints disponíveis**:
```typescript
GET    /api/v1/user                      // Dados do usuário autenticado
PUT    /api/v1/user                      // Atualizar dados básicos
DELETE /api/v1/user                      // Deletar conta (soft delete)
PUT    /api/v1/user-update-profile       // Atualizar perfil
PUT    /api/v1/user-change-password      // Alterar senha
PUT    /api/v1/user/choose-plan          // Escolher plano
POST   /api/v1/user/check-session-password  // Validar senha na sessão
GET    /api/v1/user-plan                 // Dados do plano do usuário
```

**Testes E2E**: ✅ Completo (24 testes)
**Compatibilidade Laravel**: ✅ 100%

---

### 📇 Módulo Contacts (9/9 endpoints - 100%)

**Localização**: `src/contacts/`

**Entities utilizadas**:
- ✅ `Contact` - Contatos do usuário
- ✅ `Label` - Labels/tags para contatos
- ✅ `Number` - Instâncias WhatsApp

**DTOs criados**:
- ✅ `CreateContactDto` - Criação de contato
- ✅ `UpdateContactStatusDto` - Atualização de status
- ✅ `BlockContactsDto` - Bloqueio de contatos
- ✅ `SearchContactsDto` - Busca de contatos
- ✅ `ImportCsvDto` - Importação CSV
- ✅ `TestImportDto` - Teste de importação

**Features implementadas**:
- ✅ CRUD completo de contatos
- ✅ Importação CSV com validação
- ✅ Teste de importação antes de salvar
- ✅ Bloqueio em massa de contatos
- ✅ Busca com filtros
- ✅ Helper de formatação de números WhatsApp

**Endpoints disponíveis**:
```typescript
GET    /api/v1/contacts                  // Listar contatos
POST   /api/v1/contacts                  // Criar contato
PUT    /api/v1/contacts/{id}             // Atualizar contato
DELETE /api/v1/contacts/{id}             // Deletar contato (soft delete)
PUT    /api/v1/contacts-status           // Atualizar status
POST   /api/v1/contacts-block            // Bloquear contatos em massa
GET    /api/v1/contacts-search           // Buscar contatos
POST   /api/v1/contacts-import-csv       // Importar CSV
POST   /api/v1/test-import               // Testar importação
```

**Testes E2E**: ✅ Completo (57 testes)
**Compatibilidade Laravel**: ✅ 100%

---

### 🏷️ Módulo Labels (3/3 endpoints - 100%)

**Localização**: `src/labels/`

**Entities utilizadas**:
- ✅ `Label` - Labels/tags para contatos

**DTOs criados**:
- ✅ `CreateLabelDto` - Criação de label

**Endpoints disponíveis**:
```typescript
GET    /api/v1/contacts/labels           // Listar labels do usuário
POST   /api/v1/contacts/labels           // Criar nova label
DELETE /api/v1/contacts/labels/{id}      // Deletar label
```

**Testes E2E**: ✅ Completo (15 testes)
**Compatibilidade Laravel**: ✅ 100%

---

### 👥 Módulo Públicos (6/6 endpoints - 100%)

**Localização**: `src/publics/`

**Entities criadas**:
- ✅ `Public` - Públicos-alvo para campanhas
- ✅ `PublicByContact` - Relacionamento público-contato com métricas

**DTOs criados**:
- ✅ `ListPublicsDto` - Listagem com filtros
- ✅ `UpdatePublicDto` - Atualização de público
- ✅ `DuplicatePublicDto` - Duplicação de público
- ✅ `GetRandomContactDto` - Busca de contato aleatório

**Features implementadas**:
- ✅ Listagem com agregações complexas (5 subqueries)
- ✅ Atualização com upload de foto (Multer)
- ✅ Download de contatos em CSV com UTF-8 BOM
- ✅ Duplicação de público + todos os contatos
- ✅ Busca de contato aleatório com critérios
- ✅ Soft delete

**Endpoints disponíveis**:
```typescript
GET    /api/v1/publics                       // Listar com agregações
POST   /api/v1/publics/{id}                  // Atualizar (com foto)
GET    /api/v1/publics/download-contacts/{id} // Download CSV
POST   /api/v1/publics-duplicate             // Duplicar público
DELETE /api/v1/publics/{id}                  // Deletar (soft)
GET    /api/v1/publics/contact               // Buscar contato random
```

**Testes E2E**: ✅ Completo (27 testes)
**Compatibilidade Laravel**: ✅ 100%

---

### 📢 Módulo Campaigns (16/16 endpoints - 100%)

**Localização**: `src/campaigns/`

**Entities utilizadas**:
- ✅ `Campaign` - Campanhas de marketing
- ✅ `Message` - Mensagens das campanhas
- ✅ `SimplifiedPublic` - Públicos simplificados
- ✅ `CustomPublic` - Públicos customizados (upload XLSX)
- ✅ `Number` - Instâncias WhatsApp
- ✅ `Public` - Públicos-alvo
- ✅ `Contact` - Contatos dos usuários

**DTOs criados**:
- ✅ `ListCampaignsDto` - Listagem com filtros avançados
- ✅ `CreateCampaignDto` - Criação de campanha com mensagens
- ✅ `ListSimplifiedPublicDto` - Listagem de contatos de público
- ✅ `CreateSimplifiedPublicDto` - Criação de público simplificado
- ✅ `UpdateSimplifiedPublicDto` - Atualização/cancelamento
- ✅ `CreateCustomPublicDto` - Criação de público customizado (XLSX)
- ✅ `UpdateCustomPublicDto` - Atualização/cancelamento customizado
- ✅ `CreateLabelPublicDto` - Criação de público filtrado por labels
- ✅ `CancelMultipleCampaignsDto` - Cancelamento em massa
- ✅ `ChangeStatusDto` - Alteração de status com validação de transições

**Features implementadas**:
- ✅ CRUD completo de campanhas com relacionamentos
- ✅ Listagem com filtros avançados (search, filterFields, ordenação)
- ✅ Paginação estilo Laravel (meta: current_page, from, to, per_page, total, last_page)
- ✅ Criação de campanhas com múltiplas mensagens (text, image, video, audio)
- ✅ Agendamento de campanhas (conversão timezone America/Sao_Paulo → UTC)
- ✅ Cálculo automático de total_contacts e date_end baseado no plano
- ✅ Públicos simplificados (processamento assíncrono preparado)
- ✅ Públicos customizados com upload XLSX (Multer configurado)
- ✅ Públicos filtrados por etiquetas/labels
- ✅ Verificação de campanhas ativas (status 0 e 3)
- ✅ Cancelamento em massa de campanhas
- ✅ Alteração de status com validação de transições de estado
- ✅ Soft delete preparado para integrações futuras

**Endpoints disponíveis**:
```typescript
// CRUD Básico
GET    /api/v1/campaigns                        // Listar com filtros
POST   /api/v1/campaigns                        // Criar campanha
GET    /api/v1/campaigns/:id                    // Detalhes
POST   /api/v1/campaigns/:id/cancel             // Cancelar campanha

// Gestão de Status
GET    /api/v1/campaigns-check                  // Ver campanhas ativas
POST   /api/v1/campaigns-check                  // Cancelar múltiplas
POST   /api/v1/campaigns/change-status          // Alterar status (0/1/2)

// Públicos Simplificados
GET    /api/v1/campaigns/simplified/public      // Listar contatos
GET    /api/v1/campaigns/simplified/public/:id  // Mostrar público
POST   /api/v1/campaigns/simplified/public      // Criar público
PUT    /api/v1/campaigns/simplified/public/:id  // Atualizar/cancelar

// Públicos Customizados (XLSX)
POST   /api/v1/campaigns/custom/public          // Criar (upload XLSX)
GET    /api/v1/campaigns/custom/public          // Listar contatos
GET    /api/v1/campaigns/custom/public/:id      // Mostrar público
PUT    /api/v1/campaigns/custom/public/:id      // Atualizar/cancelar

// Públicos por Labels
POST   /api/v1/campaigns/label/public           // Criar público filtrado
```

**Regras de Negócio Implementadas**:
- ✅ Validação de número WhatsApp ativo e conectado
- ✅ Criação automática de público "Todos os contatos" se public_id = "new"
- ✅ Cálculo de date_end baseado no days_recurrency do plano
- ✅ Conversão de timezone para agendamento (America/Sao_Paulo → UTC)
- ✅ Validação de transições de status (não pode descancel ar campanha cancelada)
- ✅ Cancelamento com flags: status=2, canceled=1
- ✅ Upload XLSX limitado a 20MB com validação de mimetype
- ✅ Formatação de status human-readable (Ativa, Pausada, Cancelada, Agendada)

**Testes E2E**: ✅ Completo (30+ testes em campaigns.e2e-spec.ts)
- Cenários positivos e negativos para todos os 16 endpoints
- Validação de transições de status
- Validação de cancelamento em massa
- Validação de uploads XLSX
- Mensagens de erro em português
- 100% compatibilidade Laravel

**Compatibilidade Laravel**: ✅ 100%
- ✅ Responses JSON idênticos
- ✅ Mensagens de validação em português
- ✅ Status codes corretos (200, 201, 400, 404, 422)
- ✅ Estrutura de paginação Laravel
- ✅ Lógica de negócio fiel ao original
- ✅ Preparado para jobs assíncronos (Fase 5)

**Próximos Passos (Fase 5)**:
- [ ] Implementar CampaignsJob para disparo assíncrono
- [ ] Implementar SimplifiedPublicJob para processamento
- [ ] Implementar CustomPublicJob para processar XLSX
- [ ] Integrar com Bull Queue + Redis
- [ ] Adicionar webhooks e callbacks de status

---

## ✅ TypeCheck e Validação

### Configuração de Type Safety

O projeto possui TypeScript strict mode configurado com validações pragmáticas para NestJS:

**Scripts de validação** (`package.json`):
```bash
npm run typecheck         # Verificação rápida de tipos
npm run typecheck:watch   # Modo watch para desenvolvimento
npm run validate          # typecheck + lint + build
npm run validate:full     # typecheck + lint + build + tests (OBRIGATÓRIO antes de commit)
```

**tsconfig.json** - Strict mode configurado:
- ✅ `strict: true` - Todas as verificações estritas
- ✅ `noImplicitAny: true` - Proíbe tipos `any` implícitos
- ✅ `strictNullChecks: true` - Verificação de null/undefined
- ✅ `noImplicitReturns: true` - Funções devem retornar valores
- ⚡ `strictPropertyInitialization: false` - TypeORM decorators inicializam
- ⚡ `noUnusedLocals/Parameters: false` - NestJS injeta parâmetros

**ESLint** - Regras pragmáticas:
- Erros críticos bloqueiam commit
- Warnings `no-unsafe-*` são aceitos (comuns em NestJS)
- Validação automática com `--fix`

**Workflow Obrigatório**:
```bash
# Durante desenvolvimento
npm run typecheck:watch  # Verificação em tempo real

# Antes de QUALQUER commit (OBRIGATÓRIO)
npm run validate:full    # 0 erros de tipo, 0 erros de lint, build OK, testes OK
```

**Documentação completa**: [VALIDATION-CHECKLIST.md](./VALIDATION-CHECKLIST.md)

**⚠️ Regra Crítica**: NUNCA commitar com erros de typecheck, build ou testes!

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

### Status dos Testes

**Total de Testes E2E**: 246 testes (100% passando)

| Módulo | Testes | Status |
|--------|--------|--------|
| Auth | 27 | ✅ 100% |
| Plans | 15 | ✅ 100% |
| Users | 24 | ✅ 100% |
| Contacts | 57 | ✅ 100% |
| Labels | 15 | ✅ 100% |
| Públicos | 27 | ✅ 100% |
| Campaigns | 30 | ✅ 100% |
| Configuration | 24 | ✅ 100% |
| User Profile | 27 | ✅ 100% |

**Cobertura**: 100% dos endpoints implementados testados

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

## 🔍 Processo de Revisão e Validação de Código

### Checklist de Revisão Obrigatória

Antes de considerar qualquer módulo ou endpoint como "completo", SEMPRE executar este processo de revisão:

#### 1. Verificação de Compatibilidade com Laravel

```bash
# Fluxo de revisão sistemática:
1. Ler o código Laravel original (../verte-back/)
2. Identificar TODOS os campos da tabela no banco de dados
3. Comparar com a Entity TypeORM criada
4. Verificar DTO de entrada (todos os campos necessários?)
5. Validar Service (lógica idêntica ao Laravel?)
6. Revisar Controller (responses idênticos?)
7. Confirmar documentação Swagger completa
```

#### 2. Validação de Enums e Tipos

**CRÍTICO**: Enums devem ter valores EXATOS do banco de dados.

**Processo de verificação:**

```typescript
// 1. Verificar valores no Laravel
// Laravel: 'profile' => 'user' ou 'administrator'

// 2. Criar enum TypeORM com valores CORRETOS
export enum UserProfile {
  USER = 'user',              // ✅ Valor exato do banco
  ADMINISTRATOR = 'administrator',  // ✅ Valor exato do banco
}

// ❌ ERRADO: Valores diferentes do banco
export enum UserProfile {
  USER = 'user',
  ADMIN = 'admin',  // ❌ Banco usa 'administrator', não 'admin'
}
```

**Validação obrigatória:**
- ✅ Verificar valores no código Laravel
- ✅ Consultar estrutura da tabela no banco (se possível)
- ✅ Validar enums na Entity
- ✅ Validar enums nos DTOs
- ✅ Documentar valores aceitos no Swagger com precisão

#### 3. Verificação de Campos Automáticos

Muitos campos são setados automaticamente pelo sistema. **NUNCA** esperar que o usuário envie esses campos.

**Exemplo do módulo Auth - campos automáticos:**

```typescript
// Campos que o SISTEMA seta automaticamente (NÃO vêm do request):
{
  status: UserStatus.ACTIVED,      // Sempre 'actived' no registro
  confirmed_mail: 1,                // Sempre 1 no registro
  active: 0,                        // Sempre 0 (aguardando ativação)
  plan_id: null,                    // Definido depois
  email_verified_at: null,          // Definido depois
  created_at: Date,                 // Timestamp automático
  updated_at: Date,                 // Timestamp automático
}
```

**Checklist de campos automáticos:**
- [ ] Identificar no Laravel quais campos são setados automaticamente
- [ ] Verificar valores padrão (default values)
- [ ] Confirmar que DTO NÃO espera esses campos do usuário
- [ ] Documentar no JSDoc do DTO quais campos são automáticos
- [ ] Documentar no Swagger (description) os campos automáticos

#### 4. Validação de DTOs

**Processo sistemático:**

```typescript
// 1. Listar TODOS os campos da tabela
// Tabela 'users': id, name, last_name, email, cel, cpfCnpj, password,
//                 status, profile, confirmed_mail, active, plan_id...

// 2. Separar em categorias:

// A) Campos obrigatórios do usuário:
@ApiProperty({ required: true })
@IsNotEmpty()
name: string;

// B) Campos opcionais do usuário:
@ApiPropertyOptional({ required: false })
@IsOptional()
last_name?: string;

// C) Campos automáticos (NÃO vão no DTO):
// - status: setado pelo service
// - confirmed_mail: setado pelo service
// - active: setado pelo service
// - created_at: timestamp automático
// - updated_at: timestamp automático
```

**Validação de enums em DTOs:**

```typescript
// ✅ CORRETO: Usar enum TypeScript + validador @IsEnum
import { UserProfile } from '../entities/user.entity';

export class RegisterDto {
  @ApiPropertyOptional({
    description: 'Perfil do usuário',
    enum: UserProfile,           // ✅ Usar o enum TypeScript
    enumName: 'UserProfile',     // ✅ Nome do enum
    example: UserProfile.USER,   // ✅ Usar valor do enum
  })
  @IsOptional()
  @IsEnum(UserProfile, {         // ✅ Validador de enum
    message: 'O campo permission deve ser "user" ou "administrator".'
  })
  permission?: UserProfile;
}

// ❌ ERRADO: Valores hardcoded sem validação
export class RegisterDto {
  @ApiPropertyOptional({
    enum: ['admin', 'user'],     // ❌ Valores diferentes do banco
  })
  @IsOptional()
  @IsString()                    // ❌ Sem validação de enum
  permission?: string;           // ❌ Tipo genérico
}
```

#### 5. Documentação Swagger Completa

**Checklist de documentação (OBRIGATÓRIO para cada endpoint):**

##### Controller:
- [ ] `@ApiTags('ModuleName')` - Tag de agrupamento
- [ ] `@ApiOperation({ summary, description })` - Descrição do endpoint
- [ ] `@ApiBody({ type: DtoClass })` - DTO para POST/PUT/PATCH
- [ ] `@ApiResponse({ status: 200/201 })` - Response de sucesso com exemplo
- [ ] `@ApiResponse({ status: 400/401/404/422 })` - Todos os erros possíveis
- [ ] `@ApiBearerAuth('JWT-auth')` - Se endpoint protegido

##### DTO:
- [ ] `@ApiProperty()` em TODOS os campos obrigatórios
- [ ] `@ApiPropertyOptional()` em TODOS os campos opcionais
- [ ] `description` detalhada em cada campo
- [ ] `example` realista (não usar "string", "123", etc)
- [ ] `enum` com valores CORRETOS se aplicável
- [ ] `required: true/false` explícito
- [ ] `type` correto (String, Number, Boolean, etc)
- [ ] JSDoc documentando campos automáticos

##### Exemplos de Documentação:

```typescript
/**
 * Register DTO
 *
 * Campos setados automaticamente (NÃO enviar no request):
 * - status: 'actived' (usuário criado como ativo)
 * - confirmed_mail: 1 (email confirmado)
 * - active: 0 (aguardando ativação/pagamento)
 * - plan_id: null (definido quando escolher plano)
 * - created_at, updated_at: timestamps automáticos
 */
export class RegisterDto {
  @ApiProperty({
    description: 'Nome do usuário (obrigatório)',
    example: 'João Silva',        // ✅ Exemplo realista
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  name: string;
}
```

#### 6. Validação de Service

**Checklist de implementação:**

- [ ] Comparar método Laravel linha por linha
- [ ] Verificar lógica de negócio idêntica
- [ ] Validar uso correto de enums (não usar strings hardcoded)
- [ ] Confirmar campos automáticos setados corretamente
- [ ] Verificar relacionamentos (criar registros relacionados se necessário)
- [ ] Validar response idêntico ao Laravel

**Exemplo - uso correto de enums:**

```typescript
// ✅ CORRETO: Usar enum importado
import { UserProfile, UserStatus } from '../entities/user.entity';

const user = this.userRepository.create({
  name: dto.name,
  status: UserStatus.ACTIVED,              // ✅ Enum type-safe
  profile: dto.permission || UserProfile.USER,  // ✅ Enum type-safe
});

// ❌ ERRADO: Strings hardcoded
const user = this.userRepository.create({
  name: dto.name,
  status: 'actived',                       // ❌ String sem tipo
  profile: dto.permission || 'user',       // ❌ String sem tipo
});
```

#### 7. Testes de Validação

Após implementação, SEMPRE testar:

```bash
# 1. Compilação TypeScript
npm run build

# 2. Testes unitários (se existirem)
npm run test

# 3. Testes E2E
npm run test:e2e

# 4. Documentação Swagger
# - Abrir http://localhost:3000/api/docs
# - Verificar se endpoint aparece
# - Testar com "Try it out"
# - Validar exemplos funcionam
# - Confirmar mensagens em português
```

### Fluxo de Revisão Completo (Exemplo Real)

**Cenário**: Revisar endpoint POST /api/v1/register

#### Passo 1: Consultar Laravel
```bash
# Abrir arquivo Laravel
../verte-back/app/Services/UserService.php

# Identificar:
# - Campos validados: name, email, cpfCnpj, cel, password, password_confirmation
# - Campos setados: status => 1, confirmed_mail => 1, active => 0, profile => 'user'
# - Campo opcional: permission (default 'user', pode ser 'administrator')
```

#### Passo 2: Verificar Entity
```typescript
// src/database/entities/user.entity.ts

// Verificar enums:
export enum UserProfile {
  USER = 'user',                    // ✅ Correto
  ADMINISTRATOR = 'administrator',  // ✅ Correto (não 'admin')
}

export enum UserStatus {
  ACTIVED = 'actived',    // ✅ Correto
  INACTIVED = 'inactived', // ✅ Correto
}
```

#### Passo 3: Revisar DTO
```typescript
// src/auth/dto/register.dto.ts

// Verificar:
// ✅ Campos obrigatórios: name, email, cpfCnpj, cel, password, password_confirmation
// ✅ Campos opcionais: last_name, permission
// ✅ Enum permission usa UserProfile (não string genérica)
// ✅ Validação @IsEnum aplicada
// ✅ JSDoc documenta campos automáticos
```

#### Passo 4: Validar Service
```typescript
// src/auth/auth.service.ts

// Verificar:
// ✅ Usa UserProfile.USER (não 'user' como string)
// ✅ Seta status: UserStatus.ACTIVED
// ✅ Seta confirmed_mail: 1
// ✅ Seta active: 0
// ✅ Cria Number (instância WhatsApp) automaticamente
```

#### Passo 5: Documentação Swagger
```typescript
// src/auth/auth.controller.ts

// Verificar:
// ✅ @ApiOperation com descrição completa
// ✅ Lista de campos aceitos documentada
// ✅ Lista de campos automáticos documentada
// ✅ Exemplos realistas (não "string", "123")
// ✅ Response de sucesso com estrutura completa
// ✅ Response de erro 422 com estrutura Laravel
```

#### Passo 6: Testar
```bash
# Build sem erros
npm run build

# Abrir Swagger
open http://localhost:3000/api/docs

# Testar no Swagger:
# - permission: "user" → ✅ Aceita
# - permission: "administrator" → ✅ Aceita
# - permission: "admin" → ❌ Rejeita (erro de validação)
```

### Problemas Comuns e Soluções

#### Problema 1: Enum com valores errados
```typescript
// ❌ ERRADO
enum: ['admin', 'user']  // Laravel usa 'administrator', não 'admin'

// ✅ CORRETO
enum: UserProfile  // Enum com valores do banco: 'user', 'administrator'
```

#### Problema 2: Falta validação de enum
```typescript
// ❌ ERRADO
@IsString()
permission?: string;

// ✅ CORRETO
@IsEnum(UserProfile, {
  message: 'O campo permission deve ser "user" ou "administrator".'
})
permission?: UserProfile;
```

#### Problema 3: Documentação incompleta
```typescript
// ❌ ERRADO - Sem informação sobre campos automáticos
export class RegisterDto { ... }

// ✅ CORRETO - JSDoc completo
/**
 * Campos setados automaticamente (NÃO enviar):
 * - status: 'actived'
 * - confirmed_mail: 1
 * - active: 0
 * - plan_id: null
 */
export class RegisterDto { ... }
```

#### Problema 4: Exemplos não realistas
```typescript
// ❌ ERRADO
@ApiProperty({ example: 'string' })
name: string;

// ✅ CORRETO
@ApiProperty({ example: 'João Silva' })
name: string;
```

### Resumo - Checklist Final

Antes de considerar módulo/endpoint completo:

- [ ] **Laravel consultado** - Código original analisado linha por linha
- [ ] **Enums validados** - Valores EXATOS do banco de dados
- [ ] **Entity correta** - Mapeamento fiel da tabela
- [ ] **DTO completo** - Todos os campos necessários, validações corretas
- [ ] **Service fiel** - Lógica idêntica ao Laravel, type-safe
- [ ] **Controller documentado** - @ApiOperation, @ApiResponse completos
- [ ] **Swagger completo** - Todos os campos documentados com exemplos realistas
- [ ] **Campos automáticos** - Documentados no JSDoc e Swagger description
- [ ] **Compilação OK** - `npm run build` sem erros
- [ ] **Swagger testado** - Interface funcionando, exemplos válidos
- [ ] **Testes E2E** - Passando com 100% compatibilidade

**Se QUALQUER item acima falhar, o código NÃO está completo.**

---

## 📖 Documentação Swagger/OpenAPI

### Acesso à Documentação Interativa

**URL**: http://localhost:3000/api/docs

A API possui documentação completa e interativa usando Swagger/OpenAPI onde você pode:
- Ver todos os endpoints disponíveis
- Testar endpoints diretamente no navegador
- Ver exemplos de requests e responses
- Entender validações e tipos de dados

### Padrões de Documentação (OBRIGATÓRIO)

**Todos os novos endpoints DEVEM ser documentados seguindo o padrão**:

#### Controller
```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('NomeDoModulo')  // OBRIGATÓRIO
@Controller('api/v1')
export class ExemploController {
  @Post('criar')
  @ApiOperation({
    summary: 'Título curto',
    description: 'Descrição detalhada do endpoint',
  })
  @ApiBody({ type: SeuDto })
  @ApiResponse({ status: 200, description: 'Sucesso' })
  @ApiResponse({ status: 400, description: 'Erro de validação' })
  async criar(@Body() dto: SeuDto) {
    // ...
  }
}
```

#### DTOs
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SeuDto {
  @ApiProperty({
    description: 'Descrição do campo',
    example: 'valor-exemplo-realista',
    type: String,
  })
  @IsNotEmpty()
  campo: string;

  @ApiPropertyOptional({
    description: 'Campo opcional',
    example: 'valor',
  })
  @IsOptional()
  campoOpcional?: string;
}
```

### Checklist de Documentação

Antes de considerar um endpoint completo:

- [ ] `@ApiTags` no controller
- [ ] `@ApiOperation` com summary e description
- [ ] `@ApiBody` se POST/PUT/PATCH
- [ ] `@ApiResponse` para status 200/201
- [ ] `@ApiResponse` para status de erro (400/401/404)
- [ ] `@ApiBearerAuth` se protegido por JWT
- [ ] Todos os campos do DTO têm `@ApiProperty`
- [ ] Exemplos são realistas e funcionam
- [ ] Descrições em português
- [ ] Testado na interface Swagger

**Documento completo**: [docs/swagger-standards.md](./docs/swagger-standards.md)

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

**Última atualização**: Novembro 2024
**Status**: Migração em andamento (30.6% - 37/121 endpoints)
**Módulos completos**: Auth (6), Plans (5), Users (8), Contacts (9), Labels (3), Públicos (6) ✅
**Total de testes E2E**: 216 testes passando (100%)
**TypeCheck**: ✅ Configurado com strict mode + validação obrigatória
