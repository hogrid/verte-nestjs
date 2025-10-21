# Configuração de Ambiente - Laravel para NestJS

## Variáveis de Ambiente Críticas

### Configurações Básicas da Aplicação
```bash
# Nome da aplicação
APP_NAME=VerteApp

# Ambiente (local, production, development)
APP_ENV=local

# Chave de criptografia da aplicação (Laravel)
APP_KEY=base64:XMbQZ67I//VqwaICFNSaXZ5WA7SPIaqjAAwOJ6pMa+o=

# Debug mode
APP_DEBUG=true

# URL base da aplicação
APP_URL=http://localhost:5009
```

### Configurações de Banco de Dados
```bash
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=VerteApp
DB_USERNAME=root
DB_PASSWORD=yPiS83D8iN
```

**Equivalência NestJS:**
```typescript
// TypeORM configuration
{
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false, // usar migrations
  logging: process.env.APP_ENV === 'development'
}
```

### Configurações de Cache e Queue
```bash
# Cache (Redis)
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis

# Redis
REDIS_CLIENT=phpredis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# Session
SESSION_DRIVER=file
SESSION_LIFETIME=120
```

**Equivalência NestJS:**
```typescript
// Redis configuration para cache e queue
{
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD || undefined
}

// Bull Queue configuration
BullModule.forRoot({
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT)
  }
})
```

### Configurações de Email
```bash
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=karfexadm1@gmail.com
MAIL_PASSWORD=molojdsmtgulyefz
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=karfexadm1@gmail.com
MAIL_FROM_NAME="${APP_NAME}"
```

**Equivalência NestJS:**
```typescript
// Nodemailer configuration
{
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  secure: false, // true para 465, false para outros
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
}
```

### Configurações Pusher (WebSockets)
```bash
PUSHER_APP_ID=1880783
PUSHER_APP_KEY=4e1e7e027b12a5849238
PUSHER_APP_SECRET=4b626bd761dc86acdde1
PUSHER_APP_CLUSTER=sa1
MIX_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
MIX_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
BROADCAST_DRIVER=pusher
```

**Equivalência NestJS:**
```typescript
// Pusher configuration ou Socket.IO
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
  useTLS: true
});
```

### Configurações do Projeto Verte
```bash
PROJECT="verte"
URL_BACKEND_API="http://localhost:8000"
TOKEN_BACKEND_API="444reXm32NXC8Dam9fUscs68WG801Zw7Q"
URL_DOMAIN="brasatecnologia.com.br"
PATH_UPLOAD="uploads"
```

**Equivalações NestJS:**
- `PROJECT`: Usado para identificação em logs e contexto
- `URL_BACKEND_API`: URL para comunicação entre serviços
- `TOKEN_BACKEND_API`: Token para autenticação entre serviços
- `URL_DOMAIN`: Domínio principal da aplicação
- `PATH_UPLOAD`: Diretório para uploads de arquivos

### Configurações WhatsApp API (WAHA)
```bash
API_WHATSAPP_GLOBALKEY="429683C4C977415CAAFCCE10F7D57E11"
API_WHATSAPP_APIURL="http://localhost:8080"
API_WHATSAPP_MODEL="waha"
WAHA_URL=http://localhost:8080
WAHA_API_KEY=
```

**Equivalência NestJS:**
```typescript
// WAHA service configuration
{
  baseUrl: process.env.WAHA_URL,
  apiKey: process.env.WAHA_API_KEY,
  globalKey: process.env.API_WHATSAPP_GLOBALKEY,
  timeout: 600000
}
```

### Configurações de Timing e Valores
```bash
TIMER_NORMAL=40
TIMER_FAST=25
NUMBER_VALUE=97
```

**Uso:**
- `TIMER_NORMAL`: Tempo padrão entre mensagens (segundos)
- `TIMER_FAST`: Tempo rápido entre mensagens (segundos)
- `NUMBER_VALUE`: Valor numérico para configurações específicas

### Configurações de Pagamento
```bash
GATEWAY="stripe"

# Stripe
STRIPE_SECRET_KEY="sk_test_PLACEHOLDER_REPLACE_WITH_YOUR_STRIPE_KEY"
STRIPE_SECRET_WEBHOOK="whsec_8LLHxZPtUN9rcOUGkdaZwuha0XpzR4dP"
STRIPE_EXTRA_NUMBER="price_1QDbNEP3hVpEWBNh4dgAHrk7"

# MercadoPago
MERCADOPAGO_ACCESSTOKEN=
MERCADOPAGO_APIURL="https://api.mercadopago.com"
```

**Equivalência NestJS:**
```typescript
// Stripe configuration
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15'
});

// MercadoPago configuration
const mercadoPagoConfig = {
  accessToken: process.env.MERCADOPAGO_ACCESSTOKEN,
  apiUrl: process.env.MERCADOPAGO_APIURL
};
```

### Configurações AWS (Opcional)
```bash
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

# SQS
SQS_PREFIX=https://sqs.us-east-2.amazonaws.com/195275674288
SQS_QUEUE=default
```

### Configurações de Log
```bash
LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=info
```

**Equivalência NestJS:**
```typescript
// Winston logger configuration
{
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
}
```

## Configurações CORS

### Laravel CORS (`config/cors.php`)
```php
[
    'paths' => ['api/*', 'sanctum/csrf-cookie', '*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['http://localhost:3000', 'https://w-verte.com.br'],
    'allowed_headers' => [
        'Accept',
        'Authorization',
        'Content-Type',
        'X-Requested-With',
        'X-CSRF-TOKEN',
        'X-XSRF-TOKEN',
        'Origin',
        'User-Agent',
        'Cache-Control',
        'X-Socket-Id',
        'X-Tenant'
    ],
    'supports_credentials' => true,
]
```

**Equivalência NestJS:**
```typescript
// main.ts
app.enableCors({
  origin: ['http://localhost:3000', 'https://w-verte.com.br'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Accept',
    'Authorization',
    'Content-Type',
    'X-Requested-With',
    'X-CSRF-TOKEN',
    'X-XSRF-TOKEN',
    'Origin',
    'User-Agent',
    'Cache-Control',
    'X-Socket-Id',
    'X-Tenant'
  ],
  credentials: true
});
```

## Configurações Sanctum

### Laravel Sanctum (`config/sanctum.php`)
```php
[
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 
        'localhost,localhost:3000,localhost:5009,127.0.0.1,127.0.0.1:8000,::1'
    )),
    'guard' => ['web'],
    'expiration' => null,
]
```

**Equivalência NestJS (JWT):**
```typescript
// JWT configuration
JwtModule.register({
  secret: process.env.JWT_SECRET,
  signOptions: { 
    expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
  }
})

// Variáveis adicionais necessárias
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
```

## Configurações de Serviços Terceiros

### Laravel Services (`config/services.php`)
```php
[
    'waha' => [
        'url' => env('WAHA_URL', 'http://waha:8080'),
        'api_key' => env('WAHA_API_KEY', ''),
    ],
]
```

## Estrutura de Configuração Recomendada para NestJS

### 1. `config/database.config.ts`
```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development'
};
```

### 2. `config/redis.config.ts`
```typescript
export const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD || undefined
};
```

### 3. `config/mail.config.ts`
```typescript
export const mailConfig = {
  transport: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT),
    secure: false,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
    }
  },
  defaults: {
    from: `"${process.env.APP_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`
  }
};
```

## Variáveis de Ambiente Mínimas para NestJS

```bash
# Aplicação
NODE_ENV=development
PORT=3000
APP_NAME=VerteApp
APP_URL=http://localhost:3000

# Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=yPiS83D8iN
DB_DATABASE=VerteApp

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=karfexadm1@gmail.com
MAIL_PASSWORD=molojdsmtgulyefz
MAIL_FROM_ADDRESS=karfexadm1@gmail.com

# WhatsApp API
WAHA_URL=http://localhost:8080
WAHA_API_KEY=

# Pagamentos
STRIPE_SECRET_KEY=sk_test_PLACEHOLDER_REPLACE_WITH_YOUR_STRIPE_KEY
STRIPE_WEBHOOK_SECRET=whsec_8LLHxZPtUN9rcOUGkdaZwuha0XpzR4dP
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_API_URL=https://api.mercadopago.com

# Pusher
PUSHER_APP_ID=1880783
PUSHER_APP_KEY=4e1e7e027b12a5849238
PUSHER_APP_SECRET=4b626bd761dc86acdde1
PUSHER_APP_CLUSTER=sa1

# Projeto
PROJECT=verte
URL_DOMAIN=brasatecnologia.com.br
UPLOAD_PATH=uploads
TIMER_NORMAL=40
TIMER_FAST=25
```

## Notas Importantes para Migração

1. **JWT vs Sanctum**: Substituir Sanctum por JWT no NestJS
2. **Laravel Queue**: Usar Bull Queue com Redis no NestJS
3. **Eloquent ORM**: Substituir por TypeORM
4. **Laravel Broadcasting**: Usar Socket.IO ou Pusher no NestJS
5. **Laravel Storage**: Usar Multer ou similar no NestJS
6. **Middleware**: Converter para Guards/Interceptors no NestJS
7. **Service Container**: Usar Dependency Injection nativo do NestJS