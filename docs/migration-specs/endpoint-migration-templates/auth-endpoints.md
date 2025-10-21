# TEMPLATE DE MIGRAÇÃO - ENDPOINTS DE AUTENTICAÇÃO

## ENDPOINTS DO MÓDULO AUTH

### 1. POST /api/auth/login

#### Laravel Original
```php
// Route
Route::post('/api/auth/login', [AuthController::class, 'login']);

// Controller
class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $credentials = $request->only('email', 'password');
        
        if (!Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Credenciais inválidas'
            ], 401);
        }
        
        $user = Auth::user();
        $token = $user->createToken('auth-token')->plainTextToken;
        
        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => config('sanctum.expiration')
            ],
            'message' => 'Login realizado com sucesso'
        ], 200);
    }
}

// FormRequest
class LoginRequest extends FormRequest
{
    public function rules()
    {
        return [
            'email' => 'required|email',
            'password' => 'required'
        ];
    }
    
    public function messages()
    {
        return [
            'email.required' => 'O campo email é obrigatório.',
            'email.email' => 'O campo email deve ser um email válido.',
            'password.required' => 'O campo password é obrigatório.'
        ];
    }
}
```

#### NestJS Target
```typescript
// auth.controller.ts
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    
    const payload = { email: user.email, sub: user.id };
    const token = this.jwtService.sign(payload);
    
    return {
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        token: token,
        token_type: 'Bearer',
        expires_in: process.env.JWT_EXPIRES_IN || '24h'
      },
      message: 'Login realizado com sucesso'
    };
  }
}

// DTOs
export class LoginDto {
  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  email: string;

  @IsNotEmpty({ message: 'O campo password é obrigatório.' })
  password: string;
}

export interface LoginResponse {
  data: {
    user: {
      id: number;
      name: string;
      email: string;
      created_at: Date;
      updated_at: Date;
    };
    token: string;
    token_type: string;
    expires_in: string;
  };
  message: string;
}

// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ 
      where: { email } 
    });
    
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    
    return null;
  }
}
```

### 2. POST /api/auth/register

#### Laravel Original
```php
// Route
Route::post('/api/auth/register', [AuthController::class, 'register']);

// Controller
public function register(RegisterRequest $request)
{
    $userData = $request->validated();
    $userData['password'] = Hash::make($userData['password']);
    
    $user = User::create($userData);
    $token = $user->createToken('auth-token')->plainTextToken;
    
    event(new UserRegistered($user));
    
    return response()->json([
        'data' => [
            'user' => new UserResource($user),
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => config('sanctum.expiration')
        ],
        'message' => 'Usuário registrado com sucesso'
    ], 201);
}

// FormRequest
class RegisterRequest extends FormRequest
{
    public function rules()
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8|confirmed'
        ];
    }
    
    public function messages()
    {
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

#### NestJS Target
```typescript
// auth.controller.ts
@Post('register')
@HttpCode(201)
async register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
  const hashedPassword = await bcrypt.hash(registerDto.password, 10);
  
  const userData = {
    ...registerDto,
    password: hashedPassword
  };
  
  const user = await this.authService.register(userData);
  
  const payload = { email: user.email, sub: user.id };
  const token = this.jwtService.sign(payload);
  
  // Emit event
  this.eventEmitter.emit('user.registered', user);
  
  return {
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token: token,
      token_type: 'Bearer',
      expires_in: process.env.JWT_EXPIRES_IN || '24h'
    },
    message: 'Usuário registrado com sucesso'
  };
}

// DTOs
export class RegisterDto {
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

### 3. POST /api/auth/logout

#### Laravel Original
```php
// Route
Route::post('/api/auth/logout', [AuthController::class, 'logout'])
     ->middleware('auth:sanctum');

// Controller
public function logout(Request $request)
{
    $request->user()->currentAccessToken()->delete();
    
    return response()->json([
        'message' => 'Logout realizado com sucesso'
    ], 200);
}
```

#### NestJS Target
```typescript
// auth.controller.ts
@Post('logout')
@UseGuards(JwtAuthGuard)
@HttpCode(200)
async logout(@Request() req): Promise<{ message: string }> {
  // In JWT, we don't need to delete tokens server-side
  // Client should remove token from storage
  
  return {
    message: 'Logout realizado com sucesso'
  };
}
```

### 4. GET /api/auth/me

#### Laravel Original
```php
// Route
Route::get('/api/auth/me', [AuthController::class, 'me'])
     ->middleware('auth:sanctum');

// Controller
public function me(Request $request)
{
    return response()->json([
        'data' => new UserResource($request->user())
    ], 200);
}
```

#### NestJS Target
```typescript
// auth.controller.ts
@Get('me')
@UseGuards(JwtAuthGuard)
@HttpCode(200)
async me(@Request() req): Promise<{ data: any }> {
  return {
    data: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      profile: req.user.profile,
      status: req.user.status,
      plan_id: req.user.plan_id,
      created_at: req.user.created_at,
      updated_at: req.user.updated_at
    }
  };
}
```

### 5. POST /api/auth/refresh

#### Laravel Original
```php
// Route
Route::post('/api/auth/refresh', [AuthController::class, 'refresh'])
     ->middleware('auth:sanctum');

// Controller
public function refresh(Request $request)
{
    $user = $request->user();
    $user->currentAccessToken()->delete();
    
    $token = $user->createToken('auth-token')->plainTextToken;
    
    return response()->json([
        'data' => [
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => config('sanctum.expiration')
        ],
        'message' => 'Token renovado com sucesso'
    ], 200);
}
```

#### NestJS Target
```typescript
// auth.controller.ts
@Post('refresh')
@UseGuards(JwtAuthGuard)
@HttpCode(200)
async refresh(@Request() req): Promise<RefreshResponse> {
  const payload = { email: req.user.email, sub: req.user.id };
  const token = this.jwtService.sign(payload);
  
  return {
    data: {
      token: token,
      token_type: 'Bearer',
      expires_in: process.env.JWT_EXPIRES_IN || '24h'
    },
    message: 'Token renovado com sucesso'
  };
}
```

## VALIDADORES CUSTOMIZADOS NECESSÁRIOS

### IsUnique Validator
```typescript
// validators/is-unique.validator.ts
import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

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

### IsConfirmed Validator
```typescript
// validators/is-confirmed.validator.ts
import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isConfirmed', async: false })
export class IsConfirmedConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `A confirmação de ${args.property} não confere.`;
  }
}

export function IsConfirmed(property: string, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsConfirmedConstraint,
    });
  };
}
```

## GUARDS E ESTRATÉGIAS

### JWT Strategy
```typescript
// strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.authService.findUserById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException();
    }
    
    return user;
  }
}
```

### JWT Auth Guard
```typescript
// guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token de acesso inválido');
    }
    return user;
  }
}
```

## EXCEPTION FILTERS

### Validation Exception Filter
```typescript
// filters/validation-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    
    const exceptionResponse = exception.getResponse();
    
    if (status === 422 || (exceptionResponse as any).statusCode === 400) {
      const errors = (exceptionResponse as any).message;
      
      response.status(422).json({
        message: 'Os dados fornecidos são inválidos.',
        errors: this.formatErrors(errors)
      });
    } else {
      response.status(status).json(exceptionResponse);
    }
  }
  
  private formatErrors(errors: string[]): any {
    const formattedErrors = {};
    
    errors.forEach(error => {
      // Extract field name from error message
      const field = this.extractFieldFromError(error);
      if (!formattedErrors[field]) {
        formattedErrors[field] = [];
      }
      formattedErrors[field].push(error);
    });
    
    return formattedErrors;
  }
  
  private extractFieldFromError(error: string): string {
    // Extract field name logic
    return 'field';
  }
}
```

## TESTES DE COMPATIBILIDADE

### Auth E2E Tests
```typescript
// auth.e2e-spec.ts
describe('Auth Module Compatibility (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Setup app
  });

  describe('POST /api/auth/login', () => {
    it('should return identical Laravel login response', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123'
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Login realizado com sucesso');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('token_type');
      expect(response.body.data).toHaveProperty('expires_in');
      expect(response.body.data.token_type).toBe('Bearer');
    });

    it('should return identical validation errors', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: ''
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(invalidData)
        .expect(422);

      expect(response.body.message).toBe('Os dados fornecidos são inválidos.');
      expect(response.body.errors.email).toContain('O campo email deve ser um email válido.');
      expect(response.body.errors.password).toContain('O campo password é obrigatório.');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return identical Laravel register response', async () => {
      const registerData = {
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'password123',
        password_confirmation: 'password123'
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body.message).toBe('Usuário registrado com sucesso');
      expect(response.body.data.user.name).toBe('João Silva');
      expect(response.body.data.user.email).toBe('joao@example.com');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return authenticated user data', async () => {
      const token = 'valid-jwt-token';

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('email');
    });
  });
});
```

## CHECKLIST DE VALIDAÇÃO

- [ ] ✅ Rota POST /api/auth/login implementada
- [ ] ✅ Rota POST /api/auth/register implementada  
- [ ] ✅ Rota POST /api/auth/logout implementada
- [ ] ✅ Rota GET /api/auth/me implementada
- [ ] ✅ Rota POST /api/auth/refresh implementada
- [ ] ✅ Validações idênticas ao Laravel
- [ ] ✅ Mensagens de erro em português
- [ ] ✅ Response structure idêntica
- [ ] ✅ Status codes corretos
- [ ] ✅ JWT strategy funcionando
- [ ] ✅ Guards aplicados corretamente
- [ ] ✅ Validators customizados (IsUnique, IsConfirmed)
- [ ] ✅ Exception filters configurados
- [ ] ✅ Testes E2E passando
- [ ] ✅ Eventos de usuário disparados
- [ ] ✅ Hash de password funcional
- [ ] ✅ Token expiration configurado