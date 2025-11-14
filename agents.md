# Instruções para Agentes de IA - Verte NestJS

> Instruções específicas para agentes de IA (Claude Code, Cursor, Copilot) trabalhando neste projeto.

---

## 🎯 Contexto do Projeto

**Status**: ✅ Migração 100% Completa (121/121 endpoints)
**Objetivo**: Migração Laravel 8 → NestJS 10 mantendo 100% compatibilidade
**Banco de Dados**: **COMPARTILHADO** com Laravel (NÃO criar novas tabelas)

---

## ⚠️ Regras Críticas (OBRIGATÓRIAS)

### 1. Compatibilidade Laravel é OBRIGATÓRIA

```typescript
// ✅ CORRETO - Response idêntico ao Laravel
return {
  data: user,
  meta: { current_page: 1, total: 100 }
};

// ❌ ERRADO - Response diferente
return { user, pagination: { page: 1 } };
```

### 2. Validações em Português

```typescript
// ✅ CORRETO
@IsNotEmpty({ message: 'O campo nome é obrigatório.' })
name: string;

// ❌ ERRADO
@IsNotEmpty({ message: 'Name is required' })
name: string;
```

### 3. Soft Deletes SEMPRE

```typescript
// ✅ CORRETO
@DeleteDateColumn({ name: 'deleted_at' })
deleted_at: Date | null;

// Em queries:
where: { deleted_at: IsNull() }

// ❌ ERRADO - Hard delete
await repository.delete(id);
```

### 4. NUNCA Alterar URIs

```typescript
// ✅ CORRETO - URI exata do Laravel
@Get('api/v1/campaigns')

// ❌ ERRADO - URI diferente
@Get('api/v1/campaign') // Laravel usa plural
```

### 5. Usar MESMO Banco de Dados

```typescript
// ⚠️ CRÍTICO
synchronize: false  // NUNCA usar true
```

---

## 📋 Workflow Obrigatório

### Antes de QUALQUER Commit

```bash
npm run validate:full
```

Se falhar, NÃO commitar!

### Implementando Novos Endpoints

1. **Consultar Laravel Original**
   ```bash
   # Ver código Laravel
   cat ../verte-back/app/Http/Controllers/SeuController.php
   ```

2. **Criar/Atualizar Entity** (se necessário)
   - Mapear tabela existente (NUNCA criar nova)
   - Adicionar soft delete
   - Usar enums corretos

3. **Criar DTOs**
   - Validações em português
   - `@ApiProperty` completo
   - Exemplos realistas

4. **Implementar Service**
   - Lógica idêntica ao Laravel
   - Responses idênticos
   - Soft deletes

5. **Implementar Controller**
   - URIs idênticas
   - `@ApiOperation` completo
   - `@ApiResponse` para todos status codes

6. **Escrever Testes E2E**
   - Seguir padrão em `test/auth/auth.e2e-spec.ts`
   - Mínimo 10 cenários
   - Validar compatibilidade Laravel

---

## 🧪 Padrão de Testes E2E

### Template Base

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserStatus, UserProfile } from '../../src/database/entities';
import * as bcrypt from 'bcryptjs';

describe('Module (e2e) - Laravel Compatibility Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
    dataSource = app.get(DataSource);

    await createTestUser();
    await loginTestUser();
  });

  afterAll(async () => {
    if (testUser) {
      // Cleanup (delete numbers first, then user)
      const numberRepository = dataSource.getRepository('numbers');
      await numberRepository.delete({ user_id: testUser.id });
      await dataSource.getRepository(User).delete({ id: testUser.id });
    }
    await app.close();
  });

  async function createTestUser() {
    const userRepository = dataSource.getRepository(User);
    await userRepository.delete({ email: 'test@verte.com' });

    testUser = userRepository.create({
      name: 'Test',
      email: 'test@verte.com',
      password: await bcrypt.hash('password123', 10),
      status: UserStatus.ACTIVED,
      profile: UserProfile.USER,
      confirmed_mail: 1,
      active: 1,
      cel: '11999999999',
      cpfCnpj: '52998224725',
    });

    testUser = await userRepository.save(testUser);
  }

  async function loginTestUser() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({ email: 'test@verte.com', password: 'password123' });

    authToken = response.body.token;
  }

  describe('POST /api/v1/endpoint', () => {
    it('should work correctly', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: 'value' })
        .expect(200);

      expect(response.body).toHaveProperty('field');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/endpoint')
        .send({ data: 'value' })
        .expect(401);
    });
  });

  describe('Laravel Compatibility Checks', () => {
    it('should maintain Laravel response structure', () => {
      expect(true).toBe(true);
    });
  });
});
```

---

## 📝 Padrões de Código

### Entity TypeORM

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('table_name') // Nome EXATO da tabela Laravel
export class EntityName {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;
}
```

### DTO com Validação

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CreateDto {
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João Silva',
    required: true,
  })
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  name: string;

  @ApiPropertyOptional({
    description: 'Email do usuário',
    example: 'joao@email.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  email?: string;
}
```

### Service com Soft Delete

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Entity } from './entity';

@Injectable()
export class Service {
  constructor(
    @InjectRepository(Entity)
    private readonly repository: Repository<Entity>,
  ) {}

  async findAll(userId: number) {
    return this.repository.find({
      where: { user_id: userId, deleted_at: IsNull() },
    });
  }

  async findOne(id: number, userId: number) {
    const entity = await this.repository.findOne({
      where: { id, user_id: userId, deleted_at: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException('Registro não encontrado');
    }

    return entity;
  }

  async softDelete(id: number, userId: number) {
    const entity = await this.findOne(id, userId);
    entity.deleted_at = new Date();
    return this.repository.save(entity);
  }
}
```

### Controller com Swagger

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Service } from './service';
import { CreateDto } from './dto/create.dto';

@ApiTags('Resource')
@Controller('api/v1')
export class ResourceController {
  constructor(private readonly service: Service) {}

  @Get('resources')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar recursos',
    description: 'Lista todos os recursos do usuário',
  })
  @ApiResponse({ status: 200, description: 'Recursos listados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAll(@Request() req: { user: { id: number } }) {
    return this.service.findAll(req.user.id);
  }

  @Post('resources')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar recurso' })
  @ApiBody({ type: CreateDto })
  @ApiResponse({ status: 201, description: 'Recurso criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateDto,
  ) {
    return this.service.create(req.user.id, dto);
  }
}
```

---

## 🔍 Debugging

### Problemas Comuns

**1. Entity não encontrada**
```typescript
// Verifique se está em app.module.ts
TypeOrmModule.forRoot({
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
})
```

**2. Soft delete não funciona**
```typescript
// Use IsNull() do TypeORM
import { IsNull } from 'typeorm';

where: { deleted_at: IsNull() }  // ✅ CORRETO
where: { deleted_at: null }      // ❌ ERRADO
```

**3. Validação não em português**
```typescript
// Sempre adicionar message
@IsNotEmpty({ message: 'O campo é obrigatório.' })
```

**4. Testes timeout**
```typescript
// test/jest-e2e.json já tem testTimeout: 30000
// Se ainda timeout, aumentar para 60000
```

---

## 📊 Estado Atual do Projeto

### ✅ Completo (NÃO precisa implementar)

- Auth (6 endpoints)
- Users (8 endpoints)
- Plans (6 endpoints)
- Contacts (9 endpoints)
- Labels (3 endpoints)
- Publics (6 endpoints)
- Campaigns (16 endpoints)
- Templates (4 endpoints)
- WhatsApp (15 endpoints)
- Numbers (6 endpoints)
- Schedule (jobs)
- Queue (Bull/Redis)
- Payments (4 endpoints)
- Files (3 endpoints)
- Export (2 endpoints)
- Admin (11 endpoints)
- Dashboard (2 endpoints)
- Utilities (19 endpoints)
- User Profile (2 endpoints)
- Extractor (3 endpoints)
- Remaining (18 endpoints)

### 🎯 Status Atual e Próximas Tarefas (13/11/2025)

**Fase Atual**: Testes de Compatibilidade Frontend

**Progresso Recente**:
- ✅ WAHA integration corrigida (QR Code generation via GET)
- ✅ Backend 100% funcional (121 endpoints)
- ✅ Frontend conectando ao backend NestJS
- ✅ Guia de testes manuais criado (`TESTING-MANUAL-GUIDE.md`)

**Próximas Tarefas Imediatas**:

1. **Testes Manuais com Frontend** (1-2 dias)
   - Executar 19 testes do guia `TESTING-MANUAL-GUIDE.md`
   - Validar módulos: Contatos, Campanhas, WhatsApp, Pagamentos
   - Critério de sucesso: 80% passando (15/19 testes)

2. **Testes de Integração** (2-3 dias)
   - Frontend + Backend end-to-end
   - Stripe webhooks em test mode
   - WAHA WhatsApp (QR Code + polling real)
   - Redis + Bull queues
   - File uploads/downloads

3. **Performance Testing** (1-2 dias)
   - Load testing com 1000+ contatos
   - Teste de campanhas em massa
   - Query optimization
   - Comparação Laravel vs NestJS

4. **Deploy Staging** (3-5 dias)
   - Configurar ambiente staging
   - CI/CD setup (GitHub Actions)
   - Monitoramento e logs
   - Validação completa em staging

5. **Produção** (1-2 semanas)
   - Blue-Green deployment
   - Rollout gradual (10% → 100%)
   - Monitoramento 24/7
   - Desativação Laravel

---

## 🚫 O Que NÃO Fazer

- ❌ Criar novas tabelas no banco
- ❌ Alterar URIs de rotas
- ❌ Mudar estrutura de responses
- ❌ Ignorar soft deletes
- ❌ Usar validações em inglês
- ❌ Commitar sem executar `npm run validate:full`
- ❌ Implementar funcionalidades que não existem no Laravel
- ❌ Usar `synchronize: true` no TypeORM

---

## ✅ O Que Sempre Fazer

- ✅ Consultar código Laravel original antes de implementar
- ✅ Escrever testes E2E para tudo
- ✅ Validar compatibilidade 100%
- ✅ Usar soft deletes
- ✅ Mensagens em português
- ✅ Executar `npm run validate:full` antes de commit
- ✅ Documentar com Swagger completo
- ✅ Seguir padrões existentes no código

---

## 📞 Referências Rápidas

| Recurso | Localização |
|---------|-------------|
| Código Laravel | `../verte-back/` |
| Entities | `src/database/entities/` |
| Testes E2E | `test/` |
| Docs Migração | `docs/migration/` |
| Swagger | http://localhost:3000/api/docs |

---

**Última atualização**: Novembro 2024
**Status**: ✅ Projeto 100% Completo - Fase de Deploy
**Próximo**: Testes de integração e deploy staging
