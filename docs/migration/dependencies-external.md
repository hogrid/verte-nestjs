# DEPENDÊNCIAS EXTERNAS E INTEGRAÇÕES

## Resumo das Integrações

O sistema integra com múltiplos serviços externos para funcionalidades de WhatsApp, pagamentos, email e infraestrutura. Todas as integrações utilizam **Guzzle HTTP Client** para comunicação via API.

### APIs Principais
1. **WAHA (WhatsApp HTTP API)** - Integração WhatsApp principal
2. **Stripe** - Gateway de pagamento primário
3. **MercadoPago** - Gateway de pagamento alternativo
4. **Gmail SMTP** - Serviço de email
5. **Evolution API** - API WhatsApp legacy (ainda presente no código)

---

## Dependências do Composer

### Packages Laravel Utilizados
```json
{
    "require": {
        "php": "^7.3|^8.0",
        "fruitcake/laravel-cors": "^2.0",
        "guzzlehttp/guzzle": "^7.0.1",
        "laravel/framework": "^8.75",
        "laravel/horizon": "^5.22",
        "laravel/sanctum": "^2.11",
        "laravel/tinker": "^2.5",
        "laravellegends/pt-br-validator": "^10.0",
        "maatwebsite/excel": "^3.1",
        "pusher/pusher-php-server": "^7.2",
        "stripe/stripe-php": "^16.1",
        "ticketpark/htmlphpexcel": "^2.2"
    },
    "require-dev": {
        "brianium/paratest": "^6.11",
        "spatie/laravel-ignition": "^1.0",
        "fakerphp/faker": "^1.9.1",
        "laravel/sail": "^1.0.1",
        "mockery/mockery": "^1.4.4",
        "nunomaduro/collision": "^5.10",
        "phpunit/phpunit": "^9.5.10",
        "squizlabs/php_codesniffer": "^3.13"
    }
}
```

### Packages Críticos para Migração
- **guzzlehttp/guzzle**: Cliente HTTP para todas as integrações
- **laravel/sanctum**: Autenticação API via tokens
- **laravel/horizon**: Gerenciamento de filas Redis
- **stripe/stripe-php**: SDK oficial do Stripe
- **maatwebsite/excel**: Exportação de relatórios
- **pusher/pusher-php-server**: WebSockets para notificações

---

## 1. INTEGRAÇÃO WAHA (WhatsApp HTTP API)

### Configuração (config/services.php)
```php
'waha' => [
    'url' => env('WAHA_URL', 'http://waha:8080'),
    'api_key' => env('WAHA_API_KEY', ''),
],
```

### Variáveis de Ambiente
```env
WAHA_URL=http://waha:8080
WAHA_API_KEY=                    # Opcional para WAHA OSS
API_WHATSAPP_GLOBALKEY=          # Chave global alternativa
API_WHATSAPP_APIURL=http://localhost:8080
API_WHATSAPP_MODEL=waha
```

### Trait de Integração (app/Traits/WahaAPITrait.php)

#### Métodos Principais
```php
// Gerenciamento de Sessões
createSession($sessionName)          // Criar nova sessão
removeSession($sessionName)          // Remover sessão
getSessionStatus($sessionName)       // Status da sessão
startSession($sessionName)           // Iniciar sessão

// Autenticação
getQrCode($sessionName, $asBase64)   // Obter QR Code

// Envio de Mensagens
sendMessage($session, $number, $text)           // Mensagem de texto
sendMedia($session, $number, $filePath, $caption)  // Mídia
sendAudio($sessionName, $chatId, $fileUrl)      // Áudio

// Contatos
findContacts($sessionName)           // Buscar contatos
```

#### Headers de Autenticação
```php
private function headers()
{
    $headers = [
        'Content-Type' => 'application/json',
    ];
    $apiKey = $this->wahaApiKey();
    if (!empty($apiKey)) {
        $headers['X-Api-Key'] = $apiKey;
    }
    return $headers;
}
```

#### Configuração do Cliente
```php
private function guzzle()
{
    return new Client([
        'base_uri' => $this->wahaUrlBase(),
        'timeout'  => 600.0,
    ]);
}
```

### Endpoints WAHA Utilizados

#### Sessões
- `POST /api/sessions` - Criar sessão
- `DELETE /api/sessions/{session}` - Remover sessão
- `GET /api/sessions/{session}` - Status da sessão
- `POST /api/sessions/start` - Iniciar sessão

#### Autenticação
- `GET /api/{session}/auth/qr` - Obter QR Code
- `GET /api/{session}/auth/qr?format=base64` - QR Code base64

#### Mensagens
- `POST /api/{session}/messages/text` - Enviar texto
- `POST /api/{session}/messages/image` - Enviar imagem

#### Contatos
- `GET /api/{session}/contacts` - Listar contatos
- `GET /api/{session}/contacts/all` - Todos os contatos

### Service Principal (app/Services/WhatsappService.php)

#### Detecção de Ambiente Docker
```php
private function isRunningInDocker()
{
    // Verifica /.dockerenv
    if (file_exists('/.dockerenv')) {
        return true;
    }
    
    // Verifica /proc/1/cgroup
    if (file_exists('/proc/1/cgroup')) {
        $cgroup = file_get_contents('/proc/1/cgroup');
        return strpos($cgroup, 'docker') !== false;
    }
    
    // Verifica variáveis de ambiente
    return getenv('DOCKER_CONTAINER') || getenv('CONTAINER_NAME');
}
```

#### Auto-configuração de URL
```php
public function __construct($instance = null)
{
    $this->url_base = config('services.waha.url');
    
    // Auto-detecção Docker
    if ($this->isRunningInDocker()) {
        $this->url_base = str_replace('localhost:8080', 'waha:8080', $this->url_base);
    }
}
```

#### Verificação de Status de Conexão
```php
public function instanceCheck($name = null)
{
    $result = $this->getSessionStatus($name);
    
    // Determinar se está conectado
    $connected = false;
    if (isset($result['status'])) {
        $wahaStatus = strtoupper($result['status']);
        $connected = in_array($wahaStatus, ['WORKING', 'AUTHENTICATED', 'READY']);
    }
    
    return [
        'status' => true,
        'connected' => $connected,
        'state' => $wahaStatus,
        'data' => $result
    ];
}
```

---

## 2. INTEGRAÇÃO STRIPE

### Configuração de Ambiente
```env
GATEWAY=stripe
STRIPE_SECRET_KEY=sk_test_PLACEHOLDER_REPLACE_WITH_YOUR_STRIPE_KEY
STRIPE_SECRET_WEBHOOK=whsec_8LLHxZPtUN9rcOUGkdaZwuha0XpzR4dP
STRIPE_EXTRA_NUMBER=price_1QDbNEP3hVpEWBNh4dgAHrk7
```

### PaymentController - Métodos Stripe

#### Criar Pagamento
```php
public function create(Request $request)
{
    $plan = Plan::findOrFail($request->plan_id);
    $user = User::findOrFail($request->user_id);
    
    // Criar/atualizar customer
    $customer = $this->createOrUpdateStripeCustomer($user, $request);
    
    // Criar subscription
    $subscription = \Stripe\Subscription::create([
        'customer' => $customer->id,
        'items' => [
            ['price' => $plan->code_product],
        ],
        'payment_behavior' => 'default_incomplete',
        'expand' => ['latest_invoice.payment_intent'],
    ]);
    
    // Confirmar pagamento
    $paymentIntent = $subscription->latest_invoice->payment_intent;
    $confirmedPayment = $paymentIntent->confirm([
        'payment_method' => $request->cardToken
    ]);
    
    if ($confirmedPayment->status === 'succeeded') {
        // Atualizar usuário e criar payment record
        $this->updateUserPlan($user, $plan);
        $this->createPaymentRecord($user, $plan, $paymentIntent);
    }
}
```

#### Webhook Handler
```php
public function webhookStripe(Request $request)
{
    $payload = $request->getContent();
    $sig_header = $request->header('Stripe-Signature');
    
    try {
        $event = \Stripe\Webhook::constructEvent(
            $payload, $sig_header, env('STRIPE_SECRET_WEBHOOK')
        );
    } catch(\UnexpectedValueException $e) {
        return response('Invalid payload', 400);
    } catch(\Stripe\Exception\SignatureVerificationException $e) {
        return response('Invalid signature', 400);
    }
    
    switch ($event->type) {
        case 'customer.subscription.deleted':
            $this->handleSubscriptionCancellation($event->data->object);
            break;
        case 'invoice.payment_succeeded':
            $this->handlePaymentSuccess($event->data->object);
            break;
        case 'invoice.payment_failed':
            $this->handlePaymentFailure($event->data->object);
            break;
    }
}
```

### Objetos Stripe Utilizados
- **Customer**: Clientes no Stripe
- **Subscription**: Assinaturas recorrentes
- **PaymentIntent**: Intenções de pagamento
- **Invoice**: Faturas geradas
- **Product**: Produtos (planos)
- **Price**: Preços dos produtos

---

## 3. INTEGRAÇÃO MERCADOPAGO

### Configuração (app/Services/MercadoPagoService.php)
```env
MERCADOPAGO_ACCESSTOKEN=
MERCADOPAGO_APIURL=https://api.mercadopago.com
```

#### Cliente HTTP
```php
public function guzzle()
{
    $client = new Client([
        'headers' => [
            'Authorization' => 'Bearer ' . $this->access_token,
        ],
        'decode_content' => true
    ]);
    
    return $client;
}
```

### Métodos de Integração

#### Criar Plano
```php
public function createPlan($data)
{
    $response = $client->post($this->api_url . '/preapproval_plan', [
        'json' => [
            "auto_recurring" => [
                "frequency" => 1,
                "frequency_type" => "months",
                "repetitions" => 12,
                "billing_day" => 5,
                "transaction_amount" => $data['amount'],
                "currency_id" => "BRL"
            ],
            "back_url" => "https://resgatafacil.com",
            "payment_methods_allowed" => [
                "payment_types" => [["id" => "credit_card"]],
                "payment_methods" => [["id" => "credit_card"]]
            ],
            "reason" => $data['name']
        ]
    ]);
}
```

#### Criar Assinatura
```php
public function createSubscription($data)
{
    $response = $client->post($this->api_url . '/preapproval', [
        'json' => [
            "auto_recurring" => [
                "frequency" => 12,
                "frequency_type" => "months",
                "start_date" => $data['start_date'],
                "end_date" => $data['end_date'],
                "transaction_amount" => $data['amount'],
                "currency_id" => "BRL",
            ],
            "card_token_id" => $data['card_token_id'],
            "external_reference" => $data['external_reference'],
            "payer_email" => $data['payer_email'],
            "preapproval_plan_id" => $data['plan_id'],
            "reason" => $data['name'],
            "status" => "authorized"
        ]
    ]);
}
```

### Webhook MercadoPago
```php
public function webhook(Request $request)
{
    $data = $request->all();
    
    if (isset($data['type']) && $data['type'] === 'subscription_preapproval') {
        $subscription = $this->mercadopagoService->showSubscription(['id' => $data['data']['id']]);
        
        if ($subscription['status'] === 'cancelled') {
            $user = User::where('stripe_id', $subscription['external_reference'])->first();
            if ($user) {
                $user->update([
                    'plan_id' => null,
                    'canceled_at' => now()
                ]);
            }
        }
    }
}
```

---

## 4. CONFIGURAÇÃO DE EMAIL

### SMTP Gmail
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=karfexadm1@gmail.com
MAIL_PASSWORD=molojdsmtgulyefz
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=karfexadm1@gmail.com
MAIL_FROM_NAME="${APP_NAME}"
```

### Mails Utilizados
- **SendCodeMailConfirmation**: Código de verificação de email
- **EmailTemplateDefault**: Template padrão de emails
- **SendCodeResetPassword**: Código de recuperação de senha
- **SendMailPurchase**: Confirmação de compra

---

## 5. NOTIFICAÇÕES PUSHER

### Configuração WebSockets
```env
PUSHER_APP_ID=1880783
PUSHER_APP_KEY=4e1e7e027b12a5849238
PUSHER_APP_SECRET=4b626bd761dc86acdde1
PUSHER_APP_CLUSTER=sa1
MIX_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
MIX_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
```

### Uso do Pusher
```php
use Pusher\Pusher;

$pusher = new Pusher(
    env('PUSHER_APP_KEY'),
    env('PUSHER_APP_SECRET'),
    env('PUSHER_APP_ID'),
    [
        'cluster' => env('PUSHER_APP_CLUSTER'),
        'useTLS' => true
    ]
);

// Notificar conexão WhatsApp
$pusher->trigger('whatsapp-channel', 'connection-update', [
    'user_id' => $userId,
    'connected' => true
]);
```

---

## 6. INTEGRAÇÕES AUXILIARES

### AWS S3 (Opcional)
```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false
```

### SQS (Opcional)
```env
SQS_PREFIX=https://sqs.us-east-2.amazonaws.com/195275674288
SQS_QUEUE=default
```

### Redis (Cache e Filas)
```env
REDIS_CLIENT=phpredis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379
```

---

## 7. TRATAMENTO DE ERROS GLOBAIS

### Padrão de Error Handling
```php
private function handleException($e)
{
    Log::error('API Error', [
        'message' => $e->getMessage(),
        'response' => $e->hasResponse() ? (string) $e->getResponse()->getBody() : null
    ]);
    
    return [
        'error' => true,
        'message' => $e->getMessage(),
        'status_code' => $e->hasResponse() ? $e->getResponse()->getStatusCode() : 500
    ];
}
```

### Logging Estruturado
```php
Log::info('WAHA_API_SEND_MESSAGE_REQUEST', [
    'session' => $session,
    'number' => $number,
    'text' => substr($text, 0, 50) . '...'
]);
```

---

## 8. TIMEOUTS E RETRY POLICIES

### Configurações de Timeout
```php
// WAHA API
'timeout' => 600.0,  // 10 minutos para operações longas

// Stripe
'timeout' => 30.0,   // 30 segundos

// MercadoPago
'timeout' => 30.0,   // 30 segundos

// Email
'timeout' => 10.0,   // 10 segundos
```

### Estratégias de Retry
```php
// WhatsApp QR Code Generation
$maxRetries = 5;
for ($i = 1; $i <= $maxRetries; $i++) {
    try {
        $qrCode = $this->connectWithOptimizedSettings();
        if (!empty($qrCode) && isset($qrCode['code'])) {
            return $qrCode;
        }
        if ($i < $maxRetries) {
            sleep(5);
        }
    } catch (\Exception $e) {
        if ($i < $maxRetries) {
            sleep(3);
        }
    }
}
```

---

## 9. MIGRAÇÃO PARA NESTJS

### Recomendações para NestJS

#### HTTP Client
```typescript
// Substituir Guzzle por Axios
import { HttpService } from '@nestjs/axios';

@Injectable()
export class WahaService {
  constructor(private httpService: HttpService) {}
  
  async createSession(sessionName: string) {
    const response = await this.httpService.post('/api/sessions', {
      name: sessionName
    }).toPromise();
    
    return response.data;
  }
}
```

#### Environment Configuration
```typescript
// config/services.config.ts
export default () => ({
  waha: {
    url: process.env.WAHA_URL || 'http://waha:8080',
    apiKey: process.env.WAHA_API_KEY || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_SECRET_WEBHOOK,
  },
  mercadopago: {
    accessToken: process.env.MERCADOPAGO_ACCESSTOKEN,
    apiUrl: process.env.MERCADOPAGO_APIURL,
  }
});
```

#### Error Handling
```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

async handleApiCall(fn: () => Promise<any>) {
  try {
    return await fn();
  } catch (error) {
    this.logger.error('API call failed', error);
    throw new HttpException(
      'External API error',
      HttpStatus.BAD_GATEWAY
    );
  }
}
```

#### Retry Logic
```typescript
import { retry } from 'rxjs/operators';

async retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

Esta documentação fornece todos os detalhes necessários para replicar as integrações externas no NestJS, mantendo a mesma funcionalidade e comportamento do sistema Laravel.