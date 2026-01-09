# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Verte Backend** - NestJS migration from Laravel 8. This is a WhatsApp marketing automation platform with **100% complete migration** (121/121 endpoints). The system shares the same MySQL database with the legacy Laravel application.

**Status**: Production-ready with 415+ E2E tests passing.

---

## Common Development Commands

### Running the Application

```bash
# Development with hot-reload
npm run start:dev

# Production build
npm run build
npm run start:prod

# Start Docker services (Evolution API, MySQL, Redis, PostgreSQL)
docker-compose up -d
```

### Testing (Required Before Commits)

```bash
# E2E tests (415+ scenarios)
npm run test:e2e

# Run specific test file
npm run test:e2e -- test/auth/auth.e2e-spec.ts

# TypeScript validation
npm run typecheck

# Linting
npm run lint

# COMPLETE VALIDATION (required before commit)
npm run validate:full    # typecheck + lint + build + tests
```

### Database Seeding

```bash
# Incremental seed (skips existing data)
npm run seed

# Fresh seed (clears and recreates all data)
npm run seed:fresh

# Check existing users
npm run check:users

# Create admin user
npm run create:admin
```

### Test Credentials

| Email | Password | Profile | Plan |
|-------|----------|---------|------|
| `admin@verte.com` | `123456` | Administrator | Professional |
| `pro@verte.com` | `123456` | User | Professional |
| `basico@verte.com` | `123456` | User | Basic |
| `free@verte.com` | `123456` | User | Free |

---

## High-Level Architecture

### Provider Pattern (WhatsApp Integration)

The system uses a **decoupled provider architecture** for WhatsApp integration. This is critical for understanding how WhatsApp features work:

**Interface**: `IWhatsAppProvider` (src/whatsapp/providers/whatsapp-provider.interface.ts)
- Abstract interface defining all WhatsApp operations
- Allows swapping providers without changing business logic

**Current Implementation**: `EvolutionApiProvider`
- Multi-session support (each user connects their own number via QR Code)
- No Meta approval required
- Self-hosted and free

**Usage Pattern**:
```typescript
// In services - inject the abstract interface
constructor(
  @Inject(WHATSAPP_PROVIDER)
  private readonly whatsappProvider: IWhatsAppProvider,
) {}

// Call provider methods - implementation is transparent
await this.whatsappProvider.sendText(instanceName, { to, text });
```

**To switch providers**: Only update the provider registration in `whatsapp.module.ts` - no service/controller changes needed.

### Authentication & Authorization

**JWT Authentication** (Passport JWT):
- Strategy: `src/auth/strategies/jwt.strategy.ts`
- Guard: `JwtAuthGuard` - applied globally in `app.module.ts`
- Public endpoints: Use `@Public()` decorator from `src/auth/decorators/public.decorator`

**Admin Authorization**:
- Guard: `AdminGuard` - checks `user.profile === 'administrator'`
- Apply to controller methods: `@UseGuards(AdminGuard)`

**User Extraction**:
- Decorator: Create `@CurrentUser()` decorator to extract `request.user`
- User entity attached to request by JWT strategy

### Validation Architecture (Laravel Compatible)

**Critical**: All validation messages must be in **Portuguese** to maintain Laravel compatibility.

**Pipeline**:
1. DTO validation with `class-validator` decorators
2. Custom exception factory (main.ts) converts to Laravel-style format
3. `BadRequestToValidationFilter` converts 400 → 422 status code
4. `ValidationExceptionFilter` formats response as:
   ```json
   {
     "success": false,
     "message": "Erro de validação",
     "errors": ["Campo obrigatório", ...]
   }
   ```

**Status Codes**:
- Validation errors: **422** (not 400)
- Not found: **404**
- Unauthorized: **401**
- Forbidden: **403**

### Soft Delete Pattern

All main entities implement soft delete via TypeORM:
- Field: `deleted_at` (nullable timestamp)
- Query filtering: Use `IsNull` for `deleted_at`
- Repository methods: `.softDelete()`, `.withDeleted()`

```typescript
// Correct: exclude deleted records
.where({ deleted_at: IsNull() })

// Include deleted records
.withDeleted()

// Soft delete
await repository.softDelete(id)
```

### Laravel Pagination Style

All list endpoints must return Laravel-style pagination:

```typescript
{
  data: [...],           // Array of items
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

Helper: `paginateResults()` utility creates this format.

### Scheduled Jobs (Cron)

**Service**: `ScheduleService` (src/schedule/schedule.service.ts)

**Active Jobs**:
- `dispatchScheduledCampaigns`: Every minute - enqueues scheduled campaigns
- `syncContactsPeriodic`: Every 30 minutes - syncs contacts from Evolution API

**Pattern**: Uses `@Cron()` decorator with concurrency flags (`isProcessing`, `isSyncingContacts`) to prevent parallel execution.

### Queue System (Bull + Redis)

**Configuration**: `src/config/redis.config.ts`

**Queue Names**:
- `campaigns` - Campaign processing jobs
- `simplified-public` - Simplified public creation
- `custom-public` - Custom public creation
- `whatsapp-message` - WhatsApp message sending

**Features**:
- Exponential backoff retry
- Dead Letter Queues (DLQ) for failed jobs
- Job options configured in `bullDefaultJobOptions`

**Testing**: Mock queues with `createMockQueueProviders()` helper.

---

## Critical Constraints (Laravel Compatibility)

### ALWAYS DO:
- ✅ Keep route URIs **identical** to Laravel
- ✅ Preserve JSON response structure exactly
- ✅ Maintain validation messages in **Portuguese**
- ✅ Use the **same MySQL database** (no new tables)
- ✅ Implement soft deletes on all main entities
- ✅ Use correct HTTP status codes
- ✅ Consult Laravel code in `../verte-back/` when uncertain

### NEVER DO:
- ❌ Change route URIs
- ❌ Create new database tables
- ❌ Modify response structure
- ❌ Change validation messages to English
- ❌ Ignore soft deletes
- ❌ Use different status codes than Laravel

---

## Important Configuration

### Environment Variables

```bash
# Database (CRITICAL: Same as Laravel)
DB_HOST=localhost
DB_PORT=5306
DB_DATABASE=VerteApp
DB_USERNAME=root
DB_PASSWORD=yPiS83D8iN

# JWT (Sanctum compatible)
JWT_SECRET=your-secret-key
JWT_EXPIRATION=3600

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Evolution API (WhatsApp)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=change-me-to-secure-api-key
EVOLUTION_API_WEBHOOK_URL=http://localhost:3000/api/v1/whatsapp/webhook

# Evolution PostgreSQL (for instance data)
EVOLUTION_PG_URI=postgres://postgres:postgres@localhost:5433/evolution
```

### TypeScript Configuration

**Strict Mode**: Currently **disabled** (`strict: false` in tsconfig.json)
- Pragmatic approach for TypeORM entity initialization
- Still use proper typing where possible
- Run `npm run typecheck` before commits

### Docker Services

**Evolution API Stack** (docker-compose.yml):
- `evolution-api`:8080 - WhatsApp API
- `postgres`:5433 - Evolution's database
- `redis`:6380 - Cache for Evolution
- `db_mysql`:5306 - Main application database (shared with Laravel)

**Network**: All services on `VerteApp` network for inter-service communication.

---

## Module Structure (21 Modules)

**Core**: Auth, Users, Plans
**Contacts**: Contacts, Labels, Publics
**Campaigns**: Campaigns, Templates, Queue
**WhatsApp**: Whatsapp (Evolution API), Numbers, Schedule
**Payments**: Payments (Stripe)
**Files**: Files, Export
**Admin**: Admin, Dashboard, Utilities
**Extras**: UserProfile, Extractor, Remaining

---

## Common Patterns

### Controller Pattern

```typescript
@Controller('api/v1/resource')
@UseGuards(JwtAuthGuard)  // Apply JWT auth
export class ResourceController {
  constructor(private readonly service: ResourceService) {}

  @Post()
  async create(@RequestUser() user: User, @Body() dto: CreateDto) {
    return this.service.create(user.id, dto);
  }

  @Get(':id')
  async findOne(@RequestUser() user: User, @Param('id') id: number) {
    return this.service.findOne(user.id, id);
  }
}
```

### Service Pattern

```typescript
@Injectable()
export class ResourceService {
  constructor(
    @InjectRepository(Entity)
    private readonly repository: Repository<Entity>,
  ) {}

  async create(userId: number, dto: CreateDto) {
    const entity = this.repository.create({ ...dto, user_id: userId });
    return this.repository.save(entity);
  }

  async findOne(userId: number, id: number) {
    const entity = await this.repository.findOne({
      where: { id, user_id: userId, deleted_at: IsNull() },
    });
    if (!entity) throw new NotFoundException('Recurso não encontrado');
    return entity;
  }
}
```

### Creating a New Endpoint

1. Add DTO in `module/dto/` with Portuguese validation messages
2. Add service method in `module.service.ts`
3. Add controller method in `module.controller.ts`
4. Add E2E test case in `test/module/module.e2e-spec.ts`
5. Run `npm run validate:full`

---

## Troubleshooting

### WhatsApp Connection Issues

**Problem**: QR Code not generating or connection failing

**Solution**: Check `InstanceManagerService` logs - automatic health checks and recovery are built-in. Corrupted instances are auto-cleaned.

### Test Failures

**Problem**: E2E tests failing

**Solutions**:
1. Check MySQL is running: `docker-compose up db_mysql`
2. Check Redis is running: `docker-compose up redis`
3. Run tests with mocks: `MOCK_STRIPE=1 MOCK_BULL=1 npm run test:e2e`
4. Clear test data: `npm run seed:fresh`

### TypeORM Issues

**Problem**: Entity relation errors

**Solution**: Ensure `strictPropertyInitialization: false` in tsconfig.json for TypeORM entities with relations.

---

## Documentation

- **Swagger Docs**: http://localhost:3000/api/docs
- **Migration Specs**: See `docs/migration-specs/`
- **Laravel Reference**: `../verte-back/` (legacy codebase)
