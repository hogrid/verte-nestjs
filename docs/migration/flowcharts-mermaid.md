# FLOWCHARTS MERMAID - ANÁLISE VISUAL DO PROJETO

## 1. Arquitetura Geral do Sistema

```mermaid
graph TB
    %% Frontend Layer
    subgraph "FRONTEND APPLICATIONS"
        WEB[Web Dashboard<br/>React/Vue SPA]
        MOBILE[Mobile App<br/>React Native]
        ADMIN[Admin Panel<br/>Administrative Interface]
    end
    
    %% API Gateway Layer
    subgraph "API GATEWAY & MIDDLEWARE"
        CORS[CORS Handler<br/>Origin Validation]
        RATE[Rate Limiter<br/>60 req/min]
        AUTH_MW[Authentication<br/>CheckAuthCookie]
        ADMIN_MW[Authorization<br/>AdminAccess]
    end
    
    %% Business Layer
    subgraph "BUSINESS SERVICES"
        AUTH_SRV[Authentication Service<br/>Sanctum JWT]
        CAMPAIGN_SRV[Campaign Service<br/>Message Processing]
        CONTACT_SRV[Contact Service<br/>Import/Export/Sync]
        PAYMENT_SRV[Payment Service<br/>Stripe/MercadoPago]
        WHATSAPP_SRV[WhatsApp Service<br/>WAHA Integration]
        NOTIFICATION_SRV[Notification Service<br/>Email/WebSocket]
    end
    
    %% Data Layer
    subgraph "DATA PERSISTENCE"
        REDIS[(Redis Cache<br/>Sessions/Queue)]
        MYSQL[(MySQL Database<br/>22 Tables)]
        FILES[File Storage<br/>Campaigns/Media]
    end
    
    %% External Integrations
    subgraph "EXTERNAL SERVICES"
        WAHA[WAHA API<br/>WhatsApp HTTP API]
        STRIPE[Stripe<br/>Payment Gateway]
        MERCADOPAGO[MercadoPago<br/>Brazilian Payments]
        PUSHER[Pusher<br/>WebSocket Service]
        GMAIL[Gmail SMTP<br/>Email Service]
    end
    
    %% Connections
    WEB --> CORS
    MOBILE --> CORS
    ADMIN --> CORS
    
    CORS --> RATE
    RATE --> AUTH_MW
    AUTH_MW --> ADMIN_MW
    ADMIN_MW --> AUTH_SRV
    
    AUTH_SRV --> MYSQL
    AUTH_SRV --> REDIS
    
    CAMPAIGN_SRV --> WHATSAPP_SRV
    CAMPAIGN_SRV --> CONTACT_SRV
    CAMPAIGN_SRV --> MYSQL
    
    CONTACT_SRV --> FILES
    CONTACT_SRV --> MYSQL
    
    PAYMENT_SRV --> STRIPE
    PAYMENT_SRV --> MERCADOPAGO
    PAYMENT_SRV --> MYSQL
    
    WHATSAPP_SRV --> WAHA
    NOTIFICATION_SRV --> PUSHER
    NOTIFICATION_SRV --> GMAIL
    
    %% Background Processing
    REDIS -.->|Queue Jobs| CAMPAIGN_SRV
    REDIS -.->|Cache| AUTH_SRV
```

## 2. Fluxo de Autenticação Detalhado

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant MW as Middleware
    participant AUTH as Auth Service
    participant DB as MySQL
    participant CACHE as Redis
    
    %% Login Flow
    Note over U,CACHE: Authentication Process
    U->>F: Login Request (email/password)
    F->>MW: POST /api/auth/login
    MW->>AUTH: Validate Request
    AUTH->>DB: SELECT * FROM users WHERE email = ?
    DB-->>AUTH: User Record
    AUTH->>AUTH: Verify Password (bcrypt)
    
    alt Valid Credentials
        AUTH->>AUTH: Generate Sanctum Token
        AUTH->>CACHE: Store Session Data
        AUTH->>DB: UPDATE users SET last_login_at = ?
        AUTH-->>MW: JWT Token + User Data
        MW-->>F: 200 OK {token, user, expiresIn}
        F->>F: Store Token (localStorage)
        F-->>U: Dashboard Access
    else Invalid Credentials
        AUTH-->>MW: 422 Unprocessable Entity
        MW-->>F: Validation Error
        F-->>U: Error Message
    end
    
    %% Protected Route Access
    Note over U,CACHE: Accessing Protected Resources
    U->>F: Access Protected Feature
    F->>MW: GET /api/campaigns (Bearer Token)
    MW->>AUTH: Validate Token
    AUTH->>CACHE: Check Session Validity
    
    alt Valid Session
        CACHE-->>AUTH: Session Active
        AUTH->>DB: Check User Status (active/canceled)
        DB-->>AUTH: User Active
        AUTH-->>MW: Authorization Success
        MW->>MW: Process Business Logic
        MW-->>F: Resource Data
        F-->>U: Display Content
    else Invalid/Expired Session
        AUTH-->>MW: 401 Unauthorized
        MW-->>F: Authentication Required
        F->>F: Clear Stored Token
        F-->>U: Redirect to Login
    end
    
    %% Admin Access Check
    Note over U,CACHE: Administrative Access
    U->>F: Access Admin Feature
    F->>MW: GET /api/admin/users (Bearer Token)
    MW->>AUTH: Validate Token + Admin Check
    AUTH->>DB: Check user.profile = 'administrator'
    
    alt Is Administrator
        DB-->>AUTH: Profile Confirmed
        AUTH-->>MW: Admin Access Granted
        MW-->>F: Admin Data
    else Not Administrator
        AUTH-->>MW: 403 Forbidden
        MW-->>F: Access Denied
    end
```

## 3. Relacionamentos de Entidades (ERD)

```mermaid
erDiagram
    %% Core User Management
    USERS {
        bigint id PK
        string email UK
        string name
        enum status "active|inactive|canceled"
        enum profile "user|administrator"
        bigint plan_id FK
        string stripe_id
        datetime canceled_at
        datetime due_access_at
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    PLANS {
        bigint id PK
        string name
        float value
        boolean unlimited
        boolean medias
        boolean reports
        boolean schedule
        int numbers_limit
        int contacts_limit
        int campaigns_limit
        datetime created_at
        datetime updated_at
    }
    
    %% WhatsApp Infrastructure
    SERVERS {
        bigint id PK
        string name
        string url
        boolean status
        datetime created_at
        datetime updated_at
    }
    
    NUMBERS {
        bigint id PK
        bigint user_id FK
        bigint server_id FK
        string instance UK
        boolean status
        boolean status_connection
        boolean extra
        string webhook_url
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    %% Campaign Management
    CAMPAIGNS {
        bigint id PK
        bigint user_id FK
        bigint number_id FK
        bigint public_id FK
        string name
        int type "1|2|3|4"
        int status "1|2|3|4"
        datetime schedule_date
        int progress
        json settings
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    MESSAGES {
        bigint id PK
        bigint campaign_id FK
        int delay
        text content
        text media_path
        int type_message "1|2|3|4"
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    %% Contact Management
    CONTACTS {
        bigint id PK
        bigint user_id FK
        string number
        string name
        json variables
        json labels
        int type "1|2"
        int status "1|2"
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    PUBLICS {
        bigint id PK
        bigint user_id FK
        string name
        string description
        int type "1|2|3"
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    LABELS {
        bigint id PK
        bigint user_id FK
        string name
        string color
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    %% Relationship Tables
    PUBLIC_BY_CONTACTS {
        bigint id PK
        bigint public_id FK
        bigint contact_id FK
        datetime created_at
        datetime updated_at
    }
    
    MESSAGE_BY_CONTACTS {
        bigint id PK
        bigint message_id FK
        bigint contact_id FK
        boolean delivered
        boolean readed
        boolean error
        datetime created_at
        datetime updated_at
    }
    
    BLOCK_CONTACTS {
        bigint id PK
        bigint user_id FK
        string number
        datetime created_at
        datetime updated_at
    }
    
    %% Payment System
    PAYMENTS {
        bigint id PK
        bigint user_id FK
        string gateway "stripe|mercadopago"
        string transaction_id
        float amount
        string currency
        enum status "pending|completed|failed"
        json gateway_response
        datetime created_at
        datetime updated_at
    }
    
    %% System Configuration
    SETTINGS {
        bigint id PK
        string key UK
        text value
        string description
        datetime created_at
        datetime updated_at
    }
    
    CONFIGURATIONS {
        bigint id PK
        bigint user_id FK
        string key
        text value
        datetime created_at
        datetime updated_at
    }
    
    %% Audit and Logs
    LOGS {
        bigint id PK
        bigint user_id FK
        string action
        text description
        json data
        datetime created_at
    }
    
    WEBHOOKS_LOG {
        bigint id PK
        string type
        text url
        json payload
        int response_code
        text response_body
        datetime created_at
    }
    
    %% Relationships
    USERS ||--|| PLANS : belongs_to
    USERS ||--o{ NUMBERS : has_many
    USERS ||--o{ CAMPAIGNS : has_many
    USERS ||--o{ CONTACTS : has_many
    USERS ||--o{ PUBLICS : has_many
    USERS ||--o{ LABELS : has_many
    USERS ||--o{ PAYMENTS : has_many
    USERS ||--o{ CONFIGURATIONS : has_many
    USERS ||--o{ LOGS : has_many
    USERS ||--o{ BLOCK_CONTACTS : has_many
    
    SERVERS ||--o{ NUMBERS : has_many
    NUMBERS ||--o{ CAMPAIGNS : has_many
    
    CAMPAIGNS ||--|| PUBLICS : belongs_to
    CAMPAIGNS ||--o{ MESSAGES : has_many
    
    MESSAGES ||--o{ MESSAGE_BY_CONTACTS : has_many
    CONTACTS ||--o{ MESSAGE_BY_CONTACTS : has_many
    
    PUBLICS ||--o{ PUBLIC_BY_CONTACTS : has_many
    CONTACTS ||--o{ PUBLIC_BY_CONTACTS : has_many
```

## 4. Fluxos de Negócio Principais

### 4.1 Fluxo de Execução de Campanha

```mermaid
flowchart TD
    START([Criar Nova Campanha]) --> VALIDATE_USER{Usuário<br/>Autenticado?}
    VALIDATE_USER -->|Não| LOGIN[Redirecionar Login]
    VALIDATE_USER -->|Sim| CHECK_PLAN{Plano Permite<br/>Campanhas?}
    
    CHECK_PLAN -->|Não| UPGRADE[Sugerir Upgrade]
    CHECK_PLAN -->|Sim| SELECT_TYPE{Tipo de Campanha?}
    
    SELECT_TYPE -->|Padrão| CONFIG_STANDARD[Configurar Campanha Padrão]
    SELECT_TYPE -->|Simplificada| CONFIG_SIMPLE[Configurar Campanha Simples]
    SELECT_TYPE -->|Personalizada| CONFIG_CUSTOM[Configurar Campanha Custom]
    SELECT_TYPE -->|Por Labels| CONFIG_LABEL[Configurar por Labels]
    
    CONFIG_STANDARD --> VALIDATE_CONFIG[Validar Configurações]
    CONFIG_SIMPLE --> VALIDATE_CONFIG
    CONFIG_CUSTOM --> VALIDATE_CONFIG
    CONFIG_LABEL --> VALIDATE_CONFIG
    
    VALIDATE_CONFIG -->|Erro| ERROR_CONFIG[Mostrar Erros]
    VALIDATE_CONFIG -->|OK| CHECK_SCHEDULE{Agendada?}
    
    CHECK_SCHEDULE -->|Sim| SAVE_SCHEDULED[Salvar para Agendamento]
    CHECK_SCHEDULE -->|Não| CHECK_CONNECTION{WhatsApp<br/>Conectado?}
    
    SAVE_SCHEDULED --> QUEUE_SCHEDULE[Adicionar à Fila de Agendamento]
    QUEUE_SCHEDULE --> SUCCESS[Campanha Criada]
    
    CHECK_CONNECTION -->|Não| SHOW_QR[Mostrar QR Code]
    CHECK_CONNECTION -->|Sim| LOAD_CONTACTS[Carregar Contatos do Público]
    
    SHOW_QR --> WAIT_CONNECTION[Aguardar Conexão]
    WAIT_CONNECTION --> CHECK_CONNECTION
    
    LOAD_CONTACTS --> FILTER_BLOCKED[Filtrar Contatos Bloqueados]
    FILTER_BLOCKED --> START_EXECUTION[Iniciar Execução]
    
    START_EXECUTION --> PROCESS_MESSAGE[Processar Próxima Mensagem]
    PROCESS_MESSAGE --> SEND_MESSAGE[Enviar via WAHA API]
    
    SEND_MESSAGE -->|Sucesso| LOG_SUCCESS[Registrar Sucesso]
    SEND_MESSAGE -->|Erro| LOG_ERROR[Registrar Erro]
    
    LOG_SUCCESS --> UPDATE_PROGRESS[Atualizar Progresso]
    LOG_ERROR --> UPDATE_PROGRESS
    
    UPDATE_PROGRESS --> CHECK_MORE{Mais Contatos?}
    CHECK_MORE -->|Sim| APPLY_DELAY[Aplicar Timer]
    CHECK_MORE -->|Não| COMPLETE_CAMPAIGN[Finalizar Campanha]
    
    APPLY_DELAY --> WAIT_TIMER[Aguardar Timer]
    WAIT_TIMER --> PROCESS_MESSAGE
    
    COMPLETE_CAMPAIGN --> SEND_REPORT[Enviar Relatório]
    SEND_REPORT --> SUCCESS
    
    ERROR_CONFIG --> START
```

### 4.2 Fluxo de Importação de Contatos

```mermaid
flowchart TD
    UPLOAD[Upload Arquivo CSV] --> VALIDATE_FILE{Arquivo Válido?}
    VALIDATE_FILE -->|Não| ERROR_FILE[Erro: Formato Inválido]
    VALIDATE_FILE -->|Sim| READ_HEADERS[Ler Cabeçalhos CSV]
    
    READ_HEADERS --> MAP_FIELDS[Mapear Campos]
    MAP_FIELDS --> PARSE_ROWS[Processar Linhas]
    
    PARSE_ROWS --> VALIDATE_ROW{Linha Válida?}
    VALIDATE_ROW -->|Não| ADD_ERROR[Adicionar à Lista de Erros]
    VALIDATE_ROW -->|Sim| FORMAT_NUMBER[Formatar Número]
    
    FORMAT_NUMBER --> CHECK_DUPLICATE{Contato<br/>Duplicado?}
    CHECK_DUPLICATE -->|Sim| SKIP_CONTACT[Pular Contato]
    CHECK_DUPLICATE -->|Não| CREATE_CONTACT[Criar Registro]
    
    CREATE_CONTACT --> APPLY_LABELS{Aplicar Labels?}
    APPLY_LABELS -->|Sim| ADD_LABELS[Adicionar Labels]
    APPLY_LABELS -->|Não| NEXT_ROW{Mais Linhas?}
    
    ADD_LABELS --> NEXT_ROW
    ADD_ERROR --> NEXT_ROW
    SKIP_CONTACT --> NEXT_ROW
    
    NEXT_ROW -->|Sim| PARSE_ROWS
    NEXT_ROW -->|Não| GENERATE_REPORT[Gerar Relatório]
    
    GENERATE_REPORT --> SUCCESS_IMPORT[Importação Concluída]
    ERROR_FILE --> END_ERROR[Finalizar com Erro]
```

### 4.3 Fluxo de Processamento de Pagamentos

```mermaid
flowchart TD
    SELECT_PLAN[Usuário Seleciona Plano] --> CHOOSE_GATEWAY{Escolher Gateway}
    CHOOSE_GATEWAY -->|Stripe| STRIPE_FLOW[Fluxo Stripe]
    CHOOSE_GATEWAY -->|MercadoPago| MP_FLOW[Fluxo MercadoPago]
    
    STRIPE_FLOW --> CREATE_CUSTOMER[Criar/Atualizar Customer]
    CREATE_CUSTOMER --> CREATE_SUBSCRIPTION[Criar Subscription]
    CREATE_SUBSCRIPTION --> CONFIRM_PAYMENT[Confirmar Pagamento]
    
    MP_FLOW --> CREATE_PLAN[Criar Plano MP]
    CREATE_PLAN --> CREATE_PREAPPROVAL[Criar Pré-aprovação]
    CREATE_PREAPPROVAL --> CONFIRM_PAYMENT
    
    CONFIRM_PAYMENT -->|Sucesso| WEBHOOK_SUCCESS[Receber Webhook Sucesso]
    CONFIRM_PAYMENT -->|Falha| WEBHOOK_FAILURE[Receber Webhook Falha]
    
    WEBHOOK_SUCCESS --> UPDATE_USER_PLAN[Atualizar Plano do Usuário]
    UPDATE_USER_PLAN --> CREATE_PAYMENT_RECORD[Criar Registro de Pagamento]
    CREATE_PAYMENT_RECORD --> SEND_CONFIRMATION[Enviar Email Confirmação]
    SEND_CONFIRMATION --> ENABLE_FEATURES[Habilitar Recursos do Plano]
    ENABLE_FEATURES --> SUCCESS_PAYMENT[Pagamento Concluído]
    
    WEBHOOK_FAILURE --> LOG_FAILURE[Registrar Falha]
    LOG_FAILURE --> NOTIFY_USER[Notificar Usuário]
    NOTIFY_USER --> RETRY_PAYMENT[Permitir Nova Tentativa]
```

## 5. Mapa de Integrações Externas

```mermaid
graph TB
    subgraph "APLICAÇÃO LARAVEL"
        API[API Gateway<br/>Laravel Routes]
        SERVICES[Business Services<br/>Campaign/Contact/Payment]
        JOBS[Background Jobs<br/>Laravel Queue]
        WEBHOOKS[Webhook Handlers<br/>Payment/WhatsApp Events]
    end
    
    subgraph "WHATSAPP INTEGRATION"
        WAHA[WAHA API<br/>http://waha:8080]
        EVOLUTION[Evolution API<br/>Legacy Support]
    end
    
    subgraph "PAYMENT GATEWAYS"
        STRIPE[Stripe API<br/>stripe.com]
        MERCADOPAGO[MercadoPago API<br/>api.mercadopago.com]
    end
    
    subgraph "COMMUNICATION SERVICES"
        PUSHER[Pusher WebSockets<br/>Real-time Events]
        GMAIL[Gmail SMTP<br/>Email Notifications]
    end
    
    subgraph "STORAGE & INFRASTRUCTURE"
        REDIS[(Redis<br/>Cache & Queue)]
        MYSQL[(MySQL Database<br/>Persistent Data)]
        STORAGE[Local File Storage<br/>Campaign Media]
    end
    
    %% API Connections
    API --> SERVICES
    API --> WEBHOOKS
    SERVICES --> JOBS
    
    %% WhatsApp Integration
    SERVICES -->|REST API| WAHA
    WAHA -->|Webhooks| WEBHOOKS
    SERVICES -->|Legacy| EVOLUTION
    
    %% Payment Integration
    SERVICES -->|Create Customer<br/>Create Subscription| STRIPE
    STRIPE -->|payment_intent.succeeded<br/>customer.subscription.deleted| WEBHOOKS
    
    SERVICES -->|Create Plan<br/>Create Preapproval| MERCADOPAGO
    MERCADOPAGO -->|subscription_preapproval| WEBHOOKS
    
    %% Communication
    SERVICES -->|Trigger Events| PUSHER
    SERVICES -->|Send Emails| GMAIL
    
    %% Data Storage
    SERVICES --> REDIS
    SERVICES --> MYSQL
    JOBS --> STORAGE
    
    %% Configuration Details
    WAHA -.->|Config| WAHA_CONFIG[API Key: Optional<br/>Timeout: 600s<br/>Base URL: configurable]
    STRIPE -.->|Config| STRIPE_CONFIG[Secret Key: Required<br/>Webhook Secret: Required<br/>Test Mode Available]
    MERCADOPAGO -.->|Config| MP_CONFIG[Access Token: Required<br/>API URL: https://api.mercadopago.com<br/>Currency: BRL]
    PUSHER -.->|Config| PUSHER_CONFIG[App ID: 1880783<br/>Cluster: sa1<br/>Encrypted: true]
```

## 6. Fluxo de Middleware e Guards

```mermaid
flowchart TD
    REQUEST[HTTP Request] --> GLOBAL_MW[Global Middleware Stack]
    
    GLOBAL_MW --> CORS_CHECK[CORS Validation]
    CORS_CHECK -->|Invalid Origin| CORS_ERROR[403 CORS Error]
    CORS_CHECK -->|Valid| RATE_LIMIT[Rate Limiting Check]
    
    RATE_LIMIT -->|Exceeded| RATE_ERROR[429 Too Many Requests]
    RATE_LIMIT -->|OK| AUTH_REQUIRED{Route Requires Auth?}
    
    AUTH_REQUIRED -->|No| PUBLIC_ROUTE[Public Route Handler]
    AUTH_REQUIRED -->|Yes| AUTH_MIDDLEWARE[CheckAuthCookie Middleware]
    
    AUTH_MIDDLEWARE --> TOKEN_CHECK{Bearer Token<br/>Present?}
    TOKEN_CHECK -->|No| COOKIE_CHECK{Auth Cookie<br/>Present?}
    TOKEN_CHECK -->|Yes| VALIDATE_TOKEN[Validate JWT Token]
    
    COOKIE_CHECK -->|No| UNAUTHORIZED[401 Unauthorized]
    COOKIE_CHECK -->|Yes| VALIDATE_COOKIE[Validate Cookie Session]
    
    VALIDATE_TOKEN -->|Invalid| UNAUTHORIZED
    VALIDATE_TOKEN -->|Valid| GET_USER[Retrieve User Data]
    
    VALIDATE_COOKIE -->|Invalid| UNAUTHORIZED
    VALIDATE_COOKIE -->|Valid| GET_USER
    
    GET_USER --> USER_STATUS{User Status<br/>Active?}
    USER_STATUS -->|Canceled/Inactive| ACCOUNT_ERROR[403 Account Suspended]
    USER_STATUS -->|Active| ADMIN_REQUIRED{Admin Access<br/>Required?}
    
    ADMIN_REQUIRED -->|No| PLAN_CHECK[Check Plan Limits]
    ADMIN_REQUIRED -->|Yes| ADMIN_CHECK{User is<br/>Administrator?}
    
    ADMIN_CHECK -->|No| FORBIDDEN[403 Forbidden]
    ADMIN_CHECK -->|Yes| PLAN_CHECK
    
    PLAN_CHECK -->|Exceeded| LIMIT_ERROR[402 Plan Limit Exceeded]
    PLAN_CHECK -->|OK| CONTROLLER[Controller Action]
    
    PUBLIC_ROUTE --> CONTROLLER
    CONTROLLER --> BUSINESS_LOGIC[Execute Business Logic]
    BUSINESS_LOGIC --> RESPONSE[HTTP Response]
    
    %% Error Responses
    CORS_ERROR --> ERROR_RESPONSE[Error Response]
    RATE_ERROR --> ERROR_RESPONSE
    UNAUTHORIZED --> ERROR_RESPONSE
    ACCOUNT_ERROR --> ERROR_RESPONSE
    FORBIDDEN --> ERROR_RESPONSE
    LIMIT_ERROR --> ERROR_RESPONSE
    ERROR_RESPONSE --> END_ERROR[Return Error to Client]
    
    %% Success Response
    RESPONSE --> LOG_REQUEST[Log Request/Response]
    LOG_REQUEST --> SUCCESS_END[Return Success to Client]
```

## 7. Análise e Insights

### Padrões Arquiteturais Identificados

#### 1. **Arquitetura Monolítica Modular**
- **Separação clara** entre camadas de apresentação, negócio e dados
- **Módulos especializados** para cada domínio (autenticação, campanhas, pagamentos)
- **Comunicação via eventos** para desacoplamento entre módulos

#### 2. **Multi-tenancy por Isolamento de Dados**
- **Filtragem automática** por `user_id` em todas as consultas
- **Soft deletes** preservam integridade referencial
- **Configurações personalizáveis** por usuário

#### 3. **Integração Híbrida com APIs Externas**
- **WhatsApp**: HTTP REST + Webhooks bidirecionais
- **Pagamentos**: API calls + Event-driven webhooks
- **Notificações**: Push + Email com fallback

#### 4. **Sistema de Filas e Jobs Assíncronos**
- **Campaign processing** em background
- **Email notifications** via queue
- **Webhook processing** com retry logic

### Pontos Críticos para Migração NestJS

#### 1. **Autenticação e Sessões**
- **Laravel Sanctum** → **JWT Strategy com Guards**
- **Cookie + Bearer** → **JWT com refresh tokens**
- **Multi-device sessions** → **Token blacklisting**

#### 2. **ORM e Relacionamentos**
- **Eloquent** → **TypeORM com repositórios**
- **Soft deletes** → **Interceptors customizados**
- **Model events** → **Entity listeners**

#### 3. **Queue System**
- **Laravel Queue** → **Bull Queue com Redis**
- **Job classes** → **Processors com retry logic**
- **Failed jobs** → **Dead letter queues**

#### 4. **Validation e Form Requests**
- **Form Request classes** → **DTOs com class-validator**
- **Custom rules** → **Custom validators**
- **Error messages** → **Internationalization**

### Recomendações de Implementação

#### 1. **Estrutura Modular NestJS**
```
src/
├── auth/              # Autenticação e autorização
├── users/             # Gerenciamento de usuários
├── campaigns/         # Sistema de campanhas
├── contacts/          # Gerenciamento de contatos
├── payments/          # Processamento de pagamentos
├── whatsapp/          # Integração WhatsApp
├── notifications/     # Sistema de notificações
├── shared/            # Módulos compartilhados
└── config/            # Configurações da aplicação
```

#### 2. **Estratégia de Database**
- **Migrations TypeORM** baseadas no schema Laravel
- **Entities** espelhando os models Eloquent
- **Repositories** para abstração de acesso aos dados
- **Interceptors** para soft deletes e multi-tenancy

#### 3. **API Compatibility**
- **Manter estrutura** de endpoints idêntica
- **Response format** compatível com frontend
- **Error codes** e messages consistentes
- **Validation rules** equivalentes

Este mapeamento visual fornece uma base sólida para entender a arquitetura completa e facilitar a migração fidedigna do Laravel para NestJS, preservando toda a funcionalidade e comportamento do sistema original.