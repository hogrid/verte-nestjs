# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 REGRA CRÍTICA - LEIA PRIMEIRO

**Este é um projeto de MIGRAÇÃO Laravel → NestJS. COMPATIBILIDADE 100% é OBRIGATÓRIA.**

### Obrigações Absolutas

1. **SEMPRE consultar o projeto Laravel original** localizado em `../verte-back/` antes de implementar qualquer funcionalidade
2. **NUNCA alterar nomes de rotas** - todas as 121 rotas devem manter URIs idênticas
3. **USAR o mesmo banco de dados** - não criar novas tabelas, usar as 22+ tabelas existentes
4. **RESPONSES idênticos** - estrutura JSON deve ser exatamente igual ao Laravel
5. **Validações em português** - mensagens de erro devem ser idênticas
6. **Zero impacto no frontend** - o frontend não deve precisar de alterações

### Como Trabalhar Neste Projeto

```bash
# SEMPRE siga este fluxo:
1. Ler documentação em docs/migration/ sobre o endpoint
2. Consultar código Laravel em ../verte-back/
3. Implementar em NestJS mantendo compatibilidade
4. Testar compatibilidade com testes E2E
5. Validar response idêntico ao Laravel
```

---

## Project Overview

Este é o backend **NestJS** do sistema "Verte" - uma plataforma de automação de marketing via WhatsApp. O projeto está sendo **migrado do Laravel 8** mantendo 100% de compatibilidade.

### Stack Tecnológica

**Original (Laravel 8):**
- PHP 8.0
- Laravel Sanctum (auth)
- Eloquent ORM
- MySQL/MariaDB
- Redis (queues/cache)
- WAHA API (WhatsApp)

**Destino (NestJS 10):**
- Node.js 18+
- TypeScript
- Passport JWT (auth - compatível com Sanctum)
- TypeORM (compatível com Eloquent)
- MySQL/MariaDB (MESMO banco de dados)
- Bull Queue (compatível com Laravel Queue)
- WAHA API (mesma integração)

---

## Architecture

### Estrutura de Módulos NestJS

```
src/
├── auth/              # Autenticação (6 endpoints)
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   └── dto/
│       ├── login.dto.ts
│       └── register.dto.ts
│
├── campaigns/         # Campanhas (21 endpoints)
│   ├── campaigns.controller.ts
│   ├── campaigns.service.ts
│   ├── entities/
│   │   └── campaign.entity.ts
│   └── dto/
│
├── contacts/          # Contatos (11 endpoints)
│   ├── contacts.controller.ts
│   ├── contacts.service.ts
│   └── csv-import/
│
├── whatsapp/          # Integração WhatsApp (15 endpoints)
│   ├── whatsapp.controller.ts
│   ├── whatsapp.service.ts
│   ├── waha/
│   │   └── waha-api.service.ts
│   └── jobs/
│       └── check-connections.job.ts
│
├── payments/          # Pagamentos (5 endpoints)
│   ├── payments.controller.ts
│   ├── payments.service.ts
│   ├── stripe/
│   └── mercadopago/
│
├── users/             # Gerenciamento de Usuários (16 endpoints admin)
│   ├── users.controller.ts
│   └── users.service.ts
│
├── plans/             # Planos de Assinatura (8 endpoints)
│   ├── plans.controller.ts
│   └── plans.service.ts
│
├── publics/           # Públicos-alvo (8 endpoints)
│   ├── publics.controller.ts
│   └── publics.service.ts
│
├── labels/            # Labels/Etiquetas
│   ├── labels.controller.ts
│   └── labels.service.ts
│
├── database/          # Entities TypeORM
│   ├── entities/
│   │   ├── user.entity.ts          # Tabela: users
│   │   ├── campaign.entity.ts      # Tabela: campaigns
│   │   ├── contact.entity.ts       # Tabela: contacts
│   │   ├── number.entity.ts        # Tabela: numbers
│   │   ├── plan.entity.ts          # Tabela: plans
│   │   └── ... (22+ entidades)
│   └── migrations/
│
├── common/            # Utilitários Compartilhados
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── admin.guard.ts
│   ├── interceptors/
│   ├── filters/
│   │   └── validation-exception.filter.ts
│   ├── decorators/
│   └── validators/
│       ├── is-unique.validator.ts
│       └── is-cpf-cnpj.validator.ts
│
└── config/            # Configurações
    ├── database.config.ts
    ├── jwt.config.ts
    └── redis.config.ts
```

---

## Core Components

### Integração WhatsApp (CRÍTICO)

**Laravel Original:**
- Service: `app/Services/WhatsappService.php`
- Trait: `app/Traits/WahaAPITrait.php`
- Job: `app/Jobs/CheckWhatsappConnectionsJob.php`

**NestJS Equivalente:**
- Service: `src/whatsapp/whatsapp.service.ts`
- WAHA Service: `src/whatsapp/waha/waha-api.service.ts`
- Job: `src/whatsapp/jobs/check-connections.job.ts`

**Importante:**
- Verificação em tempo real a cada 5 minutos
- NUNCA usar dados em cache para status de conexão
- Sempre consultar WAHA API diretamente

### Sistema de Campanhas

**Laravel Original:**
- Controllers: `app/Http/Controllers/CampaignsController.php`
- Jobs: `CampaignsJob`, `CampaignsMessageJob`, `CampaignsNextDayJob`
- Models: `Campaign`, `Message`, `Public`

**NestJS Equivalente:**
- Controller: `src/campaigns/campaigns.controller.ts`
- Queue Processors: `src/campaigns/processors/*.processor.ts`
- Entities: `Campaign`, `Message`, `Public`

**Fluxo de Processamento:**
```typescript
// Manter lógica idêntica ao Laravel:
1. Criar campanha
2. Validar número WhatsApp conectado
3. Verificar limite do plano
4. Processar mensagens via Bull Queue
5. Enviar com delay configurado (timer)
6. Atualizar estatísticas em tempo real
```

### Autenticação

**Laravel Original:**
- Sanctum tokens com TTL de 3600s
- Middleware: `CheckAuthCookie`
- Guards: `auth:sanctum`

**NestJS Equivalente:**
```typescript
// JWT Strategy compatível com Sanctum
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    // Validar exatamente como Sanctum
    return {
      userId: payload.sub,
      email: payload.email
    };
  }
}
```

**Guards:**
- `@UseGuards(JwtAuthGuard)` → equivalente a `auth:sanctum`
- `@UseGuards(JwtAuthGuard, AdminGuard)` → equivalente a `auth:sanctum + AdminAccess`

### Banco de Dados

**CRÍTICO: Usar as MESMAS tabelas do Laravel**

```typescript
// TypeORM deve mapear tabelas existentes:
@Entity('users')  // Tabela já existe no MySQL
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  // IMPORTANTE: Soft deletes como Laravel
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  // IMPORTANTE: Timestamps como Laravel
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)'
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)'
  })
  updatedAt: Date;
}
```

**NUNCA:**
- Criar novas tabelas
- Alterar estrutura de tabelas existentes
- Mudar nomes de colunas
- Alterar tipos de dados

**SEMPRE:**
- Usar `synchronize: false` no TypeORM
- Mapear tabelas existentes exatamente
- Preservar relacionamentos

---

## Development Commands

### Setup Inicial

```bash
# Instalar dependências
npm install

# Configurar .env (copiar do Laravel)
cp ../verte-back/.env .env

# IMPORTANTE: Usar o MESMO banco de dados
# DB_HOST=localhost
# DB_PORT=5306
# DB_DATABASE=verte_production  # MESMO do Laravel
# DB_USERNAME=root
# DB_PASSWORD=root

# Validar conexão com banco
npm run db:check
```

### Desenvolvimento

```bash
# Desenvolvimento com hot-reload
npm run start:dev

# Build de produção
npm run build

# Rodar testes
npm run test

# Testes E2E de compatibilidade
npm run test:compatibility

# Comparar responses com Laravel
npm run test:response-diff
```

### Testes de Compatibilidade

```bash
# Testar endpoint específico
npm run test:compat -- --endpoint=/api/v1/login

# Testar todos os endpoints de autenticação
npm run test:compat -- --module=auth

# Gerar relatório de diferenças
npm run test:diff-report
```

---

## Configuration

### Variáveis de Ambiente Críticas

**IMPORTANTE: Usar as MESMAS configurações do Laravel**

```env
# Database (MESMO banco do Laravel)
DB_HOST=localhost
DB_PORT=5306
DB_DATABASE=verte_production
DB_USERNAME=root
DB_PASSWORD=root

# JWT (compatível com Sanctum)
JWT_SECRET=same_as_laravel_app_key
JWT_EXPIRATION=3600s

# Redis (MESMO servidor)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# WAHA (MESMA API)
WAHA_URL=http://waha:8080
API_WHATSAPP_GLOBALKEY=same_as_laravel

# Stripe (MESMAS credenciais)
STRIPE_SECRET_KEY=same_as_laravel
STRIPE_WEBHOOK_SECRET=same_as_laravel

# MercadoPago (MESMAS credenciais)
MERCADOPAGO_ACCESS_TOKEN=same_as_laravel
```

---

## API Endpoints Reference

### TODAS as 121 rotas devem ser idênticas ao Laravel

Consulte: `docs/migration/routes-inventory.md`

**Exemplo de Compatibilidade Obrigatória:**

```typescript
// Laravel:
// POST /api/v1/login
// Body: { email, password }
// Response: { expiresIn, userData, token }

// NestJS (IDÊNTICO):
@Post('api/v1/login')
@HttpCode(200)
async login(@Body() loginDto: LoginDto) {
  const result = await this.authService.login(loginDto);

  // Response EXATAMENTE igual ao Laravel
  return {
    expiresIn: 3600,
    userData: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      numbersConnected: result.user.numbersConnected,
      totalNumber: result.user.totalNumber.toString(),
      extraNumbers: result.user.extraNumbers,
      numberActive: result.user.numberActive,
      serverType: 'waha',
      plan: result.user.plan,
      config: result.user.config,
    },
    token: result.token,
  };
}
```

---

## Validation Rules

### Compatibilidade de Validações (CRÍTICO)

**Laravel FormRequest → NestJS DTO**

Consulte: `docs/migration-specs/validation-compatibility-guide.md`

```typescript
// Laravel:
// 'email' => 'required|email|unique:users,email'

// NestJS (IDÊNTICO):
export class CreateUserDto {
  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  @IsUnique(['User', 'email'], {
    message: 'O campo email já está sendo utilizado.'
  })
  email: string;
}
```

**Mensagens de Erro em Português (OBRIGATÓRIO):**
- Todas as mensagens devem ser IDÊNTICAS ao Laravel
- Usar mesma estrutura de erro: `{ message, errors }`
- Status codes idênticos: 422 para validação

---

## Testing & Quality

### Testes de Compatibilidade Obrigatórios

```typescript
// test/compatibility/auth.e2e-spec.ts
describe('Auth Compatibility Tests', () => {
  it('POST /api/v1/login should return Laravel-compatible response', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    // Validar estrutura idêntica
    expect(response.body).toHaveProperty('expiresIn');
    expect(response.body).toHaveProperty('userData');
    expect(response.body).toHaveProperty('token');
    expect(response.body.expiresIn).toBe(3600);
  });

  it('should return identical validation errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({ email: 'invalid', password: '' })
      .expect(422);

    expect(response.body.message).toBe('Os dados fornecidos são inválidos.');
    expect(response.body.errors.email).toContain('O campo email deve ser um email válido.');
    expect(response.body.errors.password).toContain('O campo password é obrigatório.');
  });
});
```

---

## Migration Documentation

### Documentação Completa Disponível em `/docs/`

**Leitura OBRIGATÓRIA antes de implementar:**

1. **`docs/migration/README.md`**
   Visão geral da migração e estratégia

2. **`docs/migration/routes-inventory.md`**
   Todas as 121 rotas documentadas com detalhes

3. **`docs/migration/business-rules.md`**
   Lógica de negócio de cada endpoint

4. **`docs/migration/database-schema.md`**
   Estrutura completa das 22+ tabelas

5. **`docs/migration/models-relationships.md`**
   Modelos Laravel e mapeamento TypeORM

6. **`docs/migration-specs/migration-master-spec.md`**
   REGRAS CRÍTICAS INVIOLÁVEIS

---

## Common Patterns

### Padrão de Response (OBRIGATÓRIO)

```typescript
// Success Response
return {
  data: result,
  message: 'Operação realizada com sucesso'
};

// Error Response (ValidationException)
throw new ValidationException({
  message: 'Os dados fornecidos são inválidos.',
  errors: {
    field: ['Mensagem de erro em português']
  }
});
```

### Soft Deletes (Como Laravel)

```typescript
// Buscar sem deletados (padrão)
await this.repository.findOne({ where: { id } });

// Buscar incluindo deletados
await this.repository.findOne({
  where: { id },
  withDeleted: true
});

// Soft delete
await this.repository.softDelete(id);

// Restore
await this.repository.restore(id);
```

### Queue Processing (Como Laravel Queue)

```typescript
// Laravel: dispatch(new SendCampaignJob($campaign));

// NestJS:
await this.campaignQueue.add('send-campaign', {
  campaignId: campaign.id,
  timer: campaign.timer,
});
```

---

## Critical Notes

### ⚠️ NUNCA FAÇA ISSO:

❌ Alterar URIs de rotas
❌ Criar novas tabelas no banco
❌ Mudar estrutura de responses
❌ Alterar mensagens de validação
❌ Ignorar soft deletes
❌ Usar diferentes status codes
❌ Implementar sem consultar Laravel

### ✅ SEMPRE FAÇA ISSO:

✅ Consultar projeto Laravel em `../verte-back/`
✅ Ler documentação em `docs/migration/`
✅ Manter compatibilidade 100%
✅ Testar com testes E2E
✅ Validar responses idênticos
✅ Preservar mensagens em português
✅ Usar mesmo banco de dados

---

## Support & References

### Consultar Antes de Implementar

1. **Projeto Laravel:** `../verte-back/`
2. **Documentação de Migração:** `docs/migration/`
3. **Especificações Master:** `docs/migration-specs/migration-master-spec.md`
4. **Guia de Validações:** `docs/migration-specs/validation-compatibility-guide.md`
5. **Suite de Testes:** `docs/migration-specs/testing-compatibility-suite.md`

### Fluxo de Trabalho Recomendado

```bash
1. Ler docs/migration/routes-inventory.md para o endpoint
2. Consultar ../verte-back/app/Http/Controllers/[Controller].php
3. Consultar ../verte-back/app/Models/[Model].php
4. Implementar em NestJS mantendo compatibilidade
5. Escrever testes E2E
6. Validar responses idênticos
7. Commit com mensagem descritiva
```

---

## Final Reminder

🚨 **COMPATIBILIDADE 100% É OBRIGATÓRIA**

Este projeto é uma **MIGRAÇÃO**, não uma reescrita. O objetivo é trocar a tecnologia mantendo TUDO funcionando exatamente igual. O frontend **NÃO DEVE** precisar de nenhuma alteração.

Toda funcionalidade deve ser validada contra o Laravel original antes de ser considerada completa.

**Quando em dúvida, SEMPRE consulte o código Laravel em `../verte-back/`**
