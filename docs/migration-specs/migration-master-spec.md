# ESPECIFICAÇÃO MASTER DE MIGRAÇÃO LARAVEL → NESTJS

## REGRAS CRÍTICAS INVIOLÁVEIS

### 🚫 NUNCA ALTERAR

1. **Estrutura de Response**: JSON response deve ser IDÊNTICO ao Laravel
2. **Status Codes**: Manter exatos (200, 201, 422, 403, 404, 500)
3. **Rotas**: URIs, métodos HTTP e parâmetros inalterados
4. **Validações**: Mensagens de erro idênticas (português)
5. **Autenticação**: Comportamento de auth preservado
6. **Relacionamentos**: Estrutura de dados mantida
7. **Timestamps**: Formato Laravel (Y-m-d\TH:i:s.u\Z)
8. **Soft Deletes**: Comportamento com `deleted_at`

### ✅ MAPEAMENTO OBRIGATÓRIO LARAVEL → NESTJS

| Laravel Component | NestJS Equivalent | Migration Rule |
|-------------------|-------------------|----------------|
| `Controller@method` | `@Controller()` + `@Get/@Post()` | Manter mesmo comportamento |
| `FormRequest` | `class-validator DTO` | Mesmas validações |
| `Resource` | `@Transform()` ou custom serializer | Mesma estrutura JSON |
| `Middleware` | `@Guard()` ou `@Interceptor()` | Mesma lógica de filtro |
| `Model::find()` | `repository.findOne()` | Mesmo resultado |
| `Model::create()` | `repository.save()` | Mesma validação |
| `Eloquent Relations` | `TypeORM Relations` | Mesmos relacionamentos |
| `Event::dispatch()` | `EventEmitter.emit()` | Mesmo comportamento |
| `Queue::push()` | `@Queue()` decorator | Mesmo processamento |
| `Cache::get()` | `cacheManager.get()` | Mesmo comportamento |
| `SoftDeletes` | `@DeleteDateColumn()` | Mesmo comportamento |

### 🔒 VALIDAÇÕES CRÍTICAS

#### Request Validation Mapping

**Laravel FormRequest:**
```php
class StoreUserRequest extends FormRequest {
    public function rules() {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8|confirmed'
        ];
    }
    
    public function messages() {
        return [
            'name.required' => 'O campo nome é obrigatório.',
            'email.required' => 'O campo email é obrigatório.',
            'email.email' => 'O campo email deve ser um email válido.',
            'email.unique' => 'O campo email já está sendo utilizado.',
            'password.required' => 'O campo password é obrigatório.',
            'password.min' => 'O campo password deve ter pelo menos :min caracteres.',
            'password.confirmed' => 'A confirmação de password não confere.'
        ];
    }
}
```

**NestJS DTO (DEVE SER IDÊNTICO):**
```typescript
import { IsNotEmpty, IsString, MaxLength, IsEmail, MinLength } from 'class-validator';
import { IsUnique } from '../validators/is-unique.validator';
import { IsConfirmed } from '../validators/is-confirmed.validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  @IsString({ message: 'O campo nome deve ser uma string.' })
  @MaxLength(255, { message: 'O campo nome não pode ter mais de 255 caracteres.' })
  name: string;

  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  @IsUnique(['User', 'email'], { message: 'O campo email já está sendo utilizado.' })
  email: string;

  @IsNotEmpty({ message: 'O campo password é obrigatório.' })
  @MinLength(8, { message: 'O campo password deve ter pelo menos 8 caracteres.' })
  password: string;

  @IsConfirmed('password', { message: 'A confirmação de password não confere.' })
  password_confirmation: string;
}
```

#### Response Structure Mapping

**Laravel Response:**
```php
return response()->json([
    'data' => $user,
    'message' => 'Usuário criado com sucesso'
], 201);

// Error Response
return response()->json([
    'message' => 'Os dados fornecidos são inválidos.',
    'errors' => [
        'email' => ['O campo email já está sendo utilizado.']
    ]
], 422);
```

**NestJS Response (IDÊNTICO):**
```typescript
// Success Response
@HttpCode(201)
async create(@Body() createUserDto: CreateUserDto): Promise<any> {
  const user = await this.userService.create(createUserDto);
  
  return {
    data: user,
    message: 'Usuário criado com sucesso'
  };
}

// Error Response (via Exception Filter)
throw new ValidationException({
  message: 'Os dados fornecidos são inválidos.',
  errors: {
    email: ['O campo email já está sendo utilizado.']
  }
});
```

### 🔄 FLUXO DE MIGRAÇÃO OBRIGATÓRIO

#### 1. Setup Inicial NestJS

```bash
# Estrutura base NestJS
nest new verte-nestjs
cd verte-nestjs

# Dependências essenciais
npm install @nestjs/typeorm typeorm mysql2
npm install @nestjs/passport passport passport-jwt @nestjs/jwt
npm install @nestjs/config
npm install class-validator class-transformer
npm install @nestjs/swagger
npm install @nestjs/bull bull redis

# Dependências específicas do projeto
npm install @nestjs/event-emitter
npm install @nestjs/cache-manager cache-manager-redis-store
npm install bcryptjs
npm install moment
```

#### 2. Configuração TypeORM (CRÍTICO)

```typescript
// app.module.ts - DEVE refletir exatamente o schema Laravel
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // CRÍTICO: usar migrations
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      timezone: '+00:00',
      dateStrings: false
    })
  ]
})
export class AppModule {}
```

#### 3. Ordem de Implementação OBRIGATÓRIA

1. **📊 Database Entities** (baseado em models-analysis.json)
   - Implementar todas as 22+ entidades
   - Manter relacionamentos idênticos
   - Configurar soft deletes onde aplicável

2. **🔒 Authentication Module** (baseado em middleware-auth.md)
   - JWT strategy com Sanctum compatibility
   - Guards para autenticação
   - Role-based authorization

3. **📝 DTOs e Validators** (baseado em validation rules extraídas)
   - Mensagens de erro em português
   - Validações customizadas (unique, confirmed, etc.)

4. **🎛️ Controllers** (baseado em controllers-analysis.json)
   - Manter estrutura de rotas idêntica
   - Aplicar middleware/guards equivalentes

5. **⚙️ Services** (baseado em business logic)
   - Lógica de negócio preservada
   - Integrações externas mantidas

6. **🛡️ Guards/Interceptors** (baseado em middleware)
   - Rate limiting
   - CORS
   - Authentication/Authorization

### 📋 TEMPLATE DE MIGRAÇÃO POR ENDPOINT

#### Para cada rota em routes-detailed.json:

```markdown
## ENDPOINT: [METHOD] /api/endpoint

### Laravel Original
```php
// Route
Route::post('/api/users', [UserController::class, 'store'])
     ->middleware(['auth:sanctum', 'throttle:60,1']);

// Controller
class UserController extends Controller {
    public function store(StoreUserRequest $request) {
        $user = User::create($request->validated());
        
        event(new UserCreated($user));
        
        return new UserResource($user);
    }
}

// FormRequest
class StoreUserRequest extends FormRequest {
    public function rules() {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email'
        ];
    }
}

// Resource
class UserResource extends JsonResource {
    public function toArray($request) {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at
        ];
    }
}
```

### NestJS Target
```typescript
// Controller
@Controller('api/users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ThrottleInterceptor)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2
  ) {}
  
  @Post()
  @HttpCode(201)
  async store(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    const user = await this.userService.create(createUserDto);
    
    this.eventEmitter.emit('user.created', user);
    
    return this.transformUser(user);
  }
  
  private transformUser(user: User): UserResponse {
    return {
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    };
  }
}

// DTO
export class CreateUserDto {
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  @IsString({ message: 'O campo nome deve ser uma string.' })
  @MaxLength(255, { message: 'O campo nome não pode ter mais de 255 caracteres.' })
  name: string;

  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  @IsUnique(['User', 'email'], { message: 'O campo email já está sendo utilizado.' })
  email: string;
}

// Service
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}
  
  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }
}
```

### Checklist de Validação OBRIGATÓRIO
- [ ] Rota idêntica: POST /api/users
- [ ] Middleware aplicado: auth + throttle
- [ ] Validação idêntica: StoreUserRequest → CreateUserDto
- [ ] Response structure: UserResource → UserResponse
- [ ] Event dispatching: UserCreated → user.created
- [ ] Status code: 201
- [ ] Error handling: 422 para validação
- [ ] Mensagens em português preservadas
```

### 🧪 TEMPLATE DE TESTE DE COMPATIBILIDADE

```typescript
// tests/compatibility/user.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

describe('User Controller Compatibility (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  it('POST /api/users - should return identical Laravel response structure', async () => {
    // Laravel expected response
    const laravelResponse = {
      data: {
        id: 1,
        name: 'João Silva',
        email: 'joao@email.com',
        created_at: '2024-01-01T10:00:00.000000Z',
        updated_at: '2024-01-01T10:00:00.000000Z'
      },
      message: 'Usuário criado com sucesso'
    };
    
    const validUserData = {
      name: 'João Silva',
      email: 'joao@email.com',
      password: 'password123',
      password_confirmation: 'password123'
    };
    
    // NestJS actual response
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .send(validUserData)
      .expect(201);
    
    // Validate structure
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Usuário criado com sucesso');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('name');
    expect(response.body.data).toHaveProperty('email');
    expect(response.body.data).toHaveProperty('created_at');
    expect(response.body.data).toHaveProperty('updated_at');
  });

  it('POST /api/users - should return identical validation errors', async () => {
    const invalidData = {
      name: '', // required
      email: 'invalid-email', // invalid format
      password: '123' // too short
    };

    const response = await request(app.getHttpServer())
      .post('/api/users')
      .send(invalidData)
      .expect(422);

    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('errors');
    expect(response.body.message).toBe('Os dados fornecidos são inválidos.');
    expect(response.body.errors.name).toContain('O campo nome é obrigatório.');
    expect(response.body.errors.email).toContain('O campo email deve ser um email válido.');
    expect(response.body.errors.password).toContain('O campo password deve ter pelo menos 8 caracteres.');
  });
});
```

### 🚨 PONTOS DE ATENÇÃO CRÍTICOS

#### 1. Soft Deletes Implementation
```typescript
// Laravel behavior
User::find(1); // null if soft deleted
User::withTrashed()->find(1); // includes soft deleted
User::onlyTrashed()->get(); // only soft deleted

// NestJS equivalent
@Entity('users')
export class User {
  @DeleteDateColumn()
  deleted_at?: Date;
}

// Repository methods
async findOne(id: number): Promise<User> {
  return this.userRepository.findOne({ 
    where: { id, deleted_at: IsNull() } 
  });
}

async findOneWithTrashed(id: number): Promise<User> {
  return this.userRepository.findOne({ 
    where: { id },
    withDeleted: true 
  });
}

async softDelete(id: number): Promise<void> {
  await this.userRepository.softDelete(id);
}
```

#### 2. Timestamps Behavior
```typescript
// Laravel auto-manages created_at/updated_at
// NestJS equivalent
@Entity()
export class User {
  @CreateDateColumn({ 
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)'
  })
  created_at: Date;

  @UpdateDateColumn({ 
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)'
  })
  updated_at: Date;
}
```

#### 3. Authentication Compatibility
```typescript
// Laravel Sanctum behavior
Auth::user(); // returns authenticated user
Auth::id(); // returns user ID

// NestJS equivalent
@Injectable()
export class AuthService {
  async validateUser(payload: JwtPayload): Promise<User> {
    return this.userService.findById(payload.sub);
  }
}

// In controllers
@UseGuards(JwtAuthGuard)
@Get('profile')
async getProfile(@Request() req): Promise<User> {
  return req.user; // equivalent to Auth::user()
}
```

#### 4. Validation Messages (CRÍTICO)
```typescript
// Custom validator para unique
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isUnique', async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private dataSource: DataSource) {}

  async validate(value: any, args: ValidationArguments) {
    const [entityClass, field] = args.constraints;
    const repository = this.dataSource.getRepository(entityClass);
    
    const entity = await repository.findOne({
      where: { [field]: value }
    });
    
    return !entity;
  }

  defaultMessage(args: ValidationArguments) {
    return `O campo ${args.property} já está sendo utilizado.`;
  }
}

// Decorator
export function IsUnique(constraints: [string, string], validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: constraints,
      validator: IsUniqueConstraint,
    });
  };
}
```

### 📊 MÉTRICAS DE SUCESSO

#### Compatibilidade 100% OBRIGATÓRIA
- [ ] ✅ Todos os 121 endpoints testados e funcionais
- [ ] ✅ Responses JSON estruturalmente idênticos
- [ ] ✅ Status codes preservados (200, 201, 422, 403, 404, 500)
- [ ] ✅ Validações mantidas com mensagens em português
- [ ] ✅ Autenticação/autorização funcionais (JWT compatible)
- [ ] ✅ Relacionamentos preservados (22+ entidades)
- [ ] ✅ Soft deletes funcionando identicamente
- [ ] ✅ Timestamps em formato Laravel
- [ ] ✅ Performance equivalente ou superior
- [ ] ✅ Integrações externas funcionais (WAHA, Stripe, MercadoPago)

#### Documentação Automática
- [ ] ✅ Swagger/OpenAPI gerado automaticamente
- [ ] ✅ Postman collection exportada
- [ ] ✅ Testes E2E passando 100%
- [ ] ✅ Logs estruturados configurados
- [ ] ✅ Monitoring e health checks

### 🔧 FERRAMENTAS DE MIGRAÇÃO

#### Scripts de Verificação
```bash
# Verificar compatibilidade de endpoints
npm run test:compatibility

# Comparar responses Laravel vs NestJS
npm run test:response-diff

# Verificar performance
npm run test:performance

# Validar estrutura de dados
npm run test:data-structure
```

#### Utilitários de Conversão
```typescript
// utils/laravel-date.util.ts
export class LaravelDateUtil {
  static format(date: Date): string {
    return moment(date).utc().format('YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]');
  }
  
  static parse(dateString: string): Date {
    return moment.utc(dateString, 'YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]').toDate();
  }
}

// utils/response.util.ts
export class ResponseUtil {
  static success(data: any, message?: string, statusCode = 200) {
    return {
      data,
      message: message || 'Operação realizada com sucesso'
    };
  }
  
  static error(message: string, errors?: any, statusCode = 422) {
    return {
      message,
      errors: errors || {}
    };
  }
}
```

### 🚀 ORDEM DE MIGRAÇÃO RECOMENDADA

#### Fase 1: Infraestrutura (Semana 1)
1. ✅ Setup NestJS base
2. ✅ Configuração TypeORM
3. ✅ Entities principais (User, Plan, Number)
4. ✅ Authentication module

#### Fase 2: Core Business (Semana 2-3)
1. ✅ Models restantes (Campaign, Contact, Message)
2. ✅ Controllers principais
3. ✅ Services de negócio
4. ✅ Validações e DTOs

#### Fase 3: Integrações (Semana 4)
1. ✅ WhatsApp integration (WAHA)
2. ✅ Payment gateways (Stripe/MercadoPago)
3. ✅ Email service
4. ✅ File storage

#### Fase 4: Testes e Deploy (Semana 5)
1. ✅ Testes de compatibilidade
2. ✅ Performance testing
3. ✅ Documentation
4. ✅ Production deployment

### ⚡ VALIDAÇÃO FINAL

Antes de considerar a migração completa, TODOS os itens devem ser ✅:

- [ ] **Estrutural**: Todas as rotas respondem identicamente
- [ ] **Funcional**: Todos os fluxos de negócio preservados
- [ ] **Compatibilidade**: Frontend funciona sem alterações
- [ ] **Performance**: Tempos de resposta equivalentes
- [ ] **Segurança**: Autenticação e autorização funcionais
- [ ] **Integrações**: APIs externas operacionais
- [ ] **Dados**: Relacionamentos e constraints preservados
- [ ] **Testes**: 100% dos testes E2E passando

**CRÍTICO**: A migração só deve ser considerada bem-sucedida quando o frontend existente funcionar 100% sem nenhuma modificação conectado à API NestJS.