# INVENTÁRIO COMPLETO DE ROTAS

## Resumo Estatístico
- **Total de rotas**: 121
- **Métodos HTTP utilizados**: GET, POST, PUT, DELETE, OPTIONS, HEAD
- **Rotas autenticadas**: 85
- **Rotas públicas**: 36
- **Middleware únicos**: [api, web, CheckAuthCookie, CheckAuthCookieLogin, AdminAccess, Authenticate, CORS]

## Categorias de Rotas

### 1. AUTENTICAÇÃO E USUÁRIOS (13 rotas)
- Registro, login, logout, recuperação de senha
- Gerenciamento de perfil e configurações
- Ping de status de autenticação

### 2. CAMPANHAS (21 rotas)
- CRUD completo de campanhas
- Campanhas personalizadas, simplificadas e por labels
- Controle de status (pause, cancel, recovery)
- Verificação de progresso

### 3. CONTATOS (11 rotas)
- Listagem, importação, exportação
- Bloqueio/desbloqueio
- Busca e indicadores
- Sincronização manual

### 4. WHATSAPP INTEGRATION (15 rotas)
- Conexão e desconexão
- QR Code generation
- Webhook handlers
- WAHA session management
- Instance settings and polls

### 5. ADMINISTRAÇÃO (16 rotas)
- Gerenciamento de clientes
- Dashboard e indicadores
- Logs do sistema
- Configurações globais

### 6. PAGAMENTOS (5 rotas)
- Criação de pagamentos
- Webhooks Stripe e MercadoPago
- Histórico de transações

### 7. PÚBLICOS E LABELS (8 rotas)
- Gerenciamento de públicos-alvo
- Sistema de labels/etiquetas
- Duplicação e downloads

### 8. PLANOS E NÚMEROS (8 rotas)
- Gerenciamento de planos de assinatura
- Números WhatsApp extras
- Configurações por plano

### 9. UTILIDADES E TESTES (24 rotas)
- Health checks
- Endpoints de teste
- Debug tools
- Recovery tools

## Rotas Detalhadas

### AUTENTICAÇÃO

#### POST /api/v1/login
- **URI**: /api/v1/login
- **Nome**: generated::bQp37hFTGlFuKxMI
- **Controller**: App\Http\Controllers\AuthController@login
- **Middleware**: ['api']
- **Parâmetros de Body**: 
  - email: required|email
  - password: required|string
- **Autenticação**: Não obrigatória
- **Rate Limiting**: Padrão API (60/min)
- **Descrição**: Autentica usuário e retorna token/cookie

#### OPTIONS /api/v1/login
- **URI**: /api/v1/login
- **Nome**: generated::l52EzOm9c1pcBCVf
- **Controller**: Closure
- **Middleware**: ['api']
- **Descrição**: CORS preflight para login

#### POST /api/v1/logout
- **URI**: /api/v1/logout
- **Nome**: generated::kKq3lUr8962ZmSCg
- **Controller**: App\Http\Controllers\AuthController@logout
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Invalida sessão do usuário

#### POST /api/v1/register
- **URI**: /api/v1/register
- **Nome**: generated::usdWHR1CJ8UJO5xj
- **Controller**: App\Http\Controllers\AuthController@register
- **Middleware**: ['api']
- **Parâmetros de Body**:
  - name: required|string|max:255
  - email: required|email|unique:users
  - password: required|min:8|confirmed
- **Descrição**: Cria nova conta de usuário

#### POST /api/v1/reset
- **URI**: /api/v1/reset
- **Nome**: generated::cEpPuYFRa3XVzCKo
- **Controller**: App\Http\Controllers\AuthController@send_forget_password
- **Middleware**: ['api']
- **Parâmetros de Body**:
  - email: required|email|exists:users
- **Descrição**: Envia email de recuperação de senha

#### GET /api/v1/ping
- **URI**: /api/v1/ping
- **Nome**: generated::RysXlf1mwwbXZkaP
- **Controller**: App\Http\Controllers\AuthController@ping
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Verifica status de autenticação do usuário

### CAMPANHAS

#### GET /api/v1/campaigns
- **URI**: /api/v1/campaigns
- **Nome**: generated::b2M1FzwThBNrWwfv
- **Controller**: App\Http\Controllers\CampaignsController@index
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Query Parameters**: ['page', 'per_page', 'status', 'search']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Lista campanhas do usuário com paginação

#### POST /api/v1/campaigns
- **URI**: /api/v1/campaigns
- **Nome**: generated::Z4LUFzmO4bOiknzP
- **Controller**: App\Http\Controllers\CampaignsController@store
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - name: required|string|max:255
  - message: required|string
  - public_id: required|exists:publics,id
  - scheduled_at: nullable|date|after:now
  - timer: required|integer|min:1
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Cria nova campanha de mensagens

#### GET /api/v1/campaigns/{campaign}
- **URI**: /api/v1/campaigns/{campaign}
- **Nome**: generated::aompYxW5HrijXHTo
- **Controller**: App\Http\Controllers\CampaignsController@show
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['campaign' => 'required|integer|exists:campaigns,id']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Retorna dados detalhados de uma campanha

#### POST /api/v1/campaigns/{id}/cancel
- **URI**: /api/v1/campaigns/{id}/cancel
- **Nome**: generated::ZtGZ96FPHF0higZ1
- **Controller**: App\Http\Controllers\CampaignsController@cancelCampaign
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['id' => 'required|integer|exists:campaigns,id']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Cancela campanha em execução

#### GET /api/v1/campaigns-check
- **URI**: /api/v1/campaigns-check
- **Nome**: generated::sJ1P44tK9l5ng7SS
- **Controller**: App\Http\Controllers\CampaignsController@check
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Verifica status de campanhas ativas

#### POST /api/v1/campaigns-check
- **URI**: /api/v1/campaigns-check
- **Nome**: generated::GKhqJTAgTV0yaaoM
- **Controller**: App\Http\Controllers\CampaignsController@cancel
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Cancela múltiplas campanhas

#### POST /api/v1/campaigns/change-status
- **URI**: /api/v1/campaigns/change-status
- **Nome**: generated::CugFXV6esgkPeXKK
- **Controller**: App\Http\Controllers\CampaignsController@change_status
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - campaign_id: required|integer|exists:campaigns,id
  - status: required|in:active,paused,canceled
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Altera status de uma campanha

### CAMPANHAS PERSONALIZADAS

#### POST /api/v1/campaigns/custom/public
- **URI**: /api/v1/campaigns/custom/public
- **Nome**: generated::y74NKPe6zrKGWp9t
- **Controller**: App\Http\Controllers\CampaignsController@store_custom_public
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - name: required|string|max:255
  - file: required|file|mimes:csv,txt
  - message: required|string
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Cria campanha com público personalizado via upload

#### GET /api/v1/campaigns/custom/public
- **URI**: /api/v1/campaigns/custom/public
- **Nome**: generated::u5tA8G7OnLYSKdIX
- **Controller**: App\Http\Controllers\CampaignsController@index_simplified_public
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Lista campanhas personalizadas

#### GET /api/v1/campaigns/custom/public/{id}
- **URI**: /api/v1/campaigns/custom/public/{id}
- **Nome**: generated::drYKQbrPYdydty3R
- **Controller**: App\Http\Controllers\CampaignsController@show_simplified_public
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['id' => 'required|integer']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Detalhes de campanha personalizada

#### PUT /api/v1/campaigns/custom/public/{id}
- **URI**: /api/v1/campaigns/custom/public/{id}
- **Nome**: generated::XMQqVWN0MOp35jNn
- **Controller**: App\Http\Controllers\CampaignsController@put_custom_public
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['id' => 'required|integer']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Atualiza campanha personalizada

### CAMPANHAS POR LABELS

#### POST /api/v1/campaigns/label/public
- **URI**: /api/v1/campaigns/label/public
- **Nome**: generated::w6h2uBnVM70jDeJb
- **Controller**: App\Http\Controllers\CampaignsController@store_label_public
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - name: required|string|max:255
  - labels: required|array
  - labels.*: required|exists:labels,id
  - message: required|string
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Cria campanha direcionada por labels

### CAMPANHAS SIMPLIFICADAS

#### POST /api/v1/campaigns/simplified/public
- **URI**: /api/v1/campaigns/simplified/public
- **Nome**: generated::OeLlehiD9bwVM4Sg
- **Controller**: App\Http\Controllers\CampaignsController@store_simplified_public
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - name: required|string|max:255
  - numbers: required|array
  - numbers.*: required|string|regex:/^\+?[1-9]\d{1,14}$/
  - message: required|string
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Cria campanha simplificada com lista de números

#### GET /api/v1/campaigns/simplified/public
- **URI**: /api/v1/campaigns/simplified/public
- **Nome**: generated::4Q4mJMhGCHDn0njv
- **Controller**: App\Http\Controllers\CampaignsController@index_simplified_public
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Lista campanhas simplificadas

#### GET /api/v1/campaigns/simplified/public/{id}
- **URI**: /api/v1/campaigns/simplified/public/{id}
- **Nome**: generated::cQhnJR7vru6GF8nT
- **Controller**: App\Http\Controllers\CampaignsController@show_simplified_public
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['id' => 'required|integer']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Detalhes de campanha simplificada

#### PUT /api/v1/campaigns/simplified/public/{id}
- **URI**: /api/v1/campaigns/simplified/public/{id}
- **Nome**: generated::Hdp1St4VetfxnUte
- **Controller**: App\Http\Controllers\CampaignsController@put_simplified_public
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['id' => 'required|integer']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Atualiza campanha simplificada

### CONTATOS

#### GET /api/v1/contacts
- **URI**: /api/v1/contacts
- **Nome**: generated::w7LkevQBbsP6qt3j
- **Controller**: App\Http\Controllers\ContactsController@index
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Query Parameters**: ['page', 'per_page', 'search', 'label_id', 'status']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Lista contatos com filtros e paginação

#### POST /api/v1/contacts
- **URI**: /api/v1/contacts
- **Nome**: generated::5pUEvEDfO1ICIMGG
- **Controller**: App\Http\Controllers\ContactsController@save
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - name: required|string|max:255
  - phone: required|string|unique:contacts
  - labels: nullable|array
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Salva novo contato

#### POST /api/v1/contacts/search
- **URI**: /api/v1/contacts/search
- **Nome**: generated::FfxrIleFonW4WXmG
- **Controller**: App\Http\Controllers\ContactsController@search
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - query: required|string|min:3
  - type: nullable|in:name,phone,label
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Busca contatos por termo

#### POST /api/v1/contacts/import/csv
- **URI**: /api/v1/contacts/import/csv
- **Nome**: generated::UFwthgaAhT9ORA5f
- **Controller**: App\Http\Controllers\ContactsController@importCsv
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - file: required|file|mimes:csv|max:10240
  - label_id: nullable|exists:labels,id
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Importa contatos via CSV

#### POST /api/v1/contacts/import/test
- **URI**: /api/v1/contacts/import/test
- **Nome**: generated::FA7Nw8R3teRojYC9
- **Controller**: App\Http\Controllers\ContactsController@testImport
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - file: required|file|mimes:csv
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Testa importação de CSV (preview)

#### GET /api/v1/contacts/active/export
- **URI**: /api/v1/contacts/active/export
- **Nome**: generated::verIoLDyigej3m1A
- **Controller**: App\Http\Controllers\ContactsController@export
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Query Parameters**: ['format' => 'csv|xlsx', 'label_id']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Exporta contatos ativos

#### POST /api/v1/contacts/block
- **URI**: /api/v1/contacts/block
- **Nome**: generated::ShzGERufMzuucSJK
- **Controller**: App\Http\Controllers\ContactsController@block
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - contact_ids: required|array
  - contact_ids.*: required|exists:contacts,id
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Bloqueia contatos selecionados

#### POST /api/v1/contacts/unblock
- **URI**: /api/v1/contacts/unblock
- **Nome**: generated::fQWihTjUZPA9OmHj
- **Controller**: App\Http\Controllers\ContactsController@unblock
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - contact_ids: required|array
  - contact_ids.*: required|exists:contacts,id
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Desbloqueia contatos selecionados

#### GET /api/v1/contacts/indicators
- **URI**: /api/v1/contacts/indicators
- **Nome**: generated::1xmhe4R3fLRvMTvB
- **Controller**: App\Http\Controllers\ContactsController@indicators
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Retorna indicadores de contatos (totais, ativos, bloqueados)

### WHATSAPP INTEGRATION

#### GET /api/v1/connect-whatsapp
- **URI**: /api/v1/connect-whatsapp
- **Nome**: generated::VMziOLKMwXqHpD4d
- **Controller**: App\Http\Controllers\WhatsappController@connect
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Inicia processo de conexão WhatsApp (QR Code)

#### GET /api/v1/connect-whatsapp-check
- **URI**: /api/v1/connect-whatsapp-check
- **Nome**: generated::mS2Zz1IEUSnnNSNO
- **Controller**: App\Http\Controllers\WhatsappController@checkConnection
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Verifica status de conexão WhatsApp em tempo real

#### POST /api/v1/force-check-whatsapp-connections
- **URI**: /api/v1/force-check-whatsapp-connections
- **Nome**: generated::ceYPNYlTXqs16NK2
- **Controller**: Closure
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Força verificação de todas as conexões WhatsApp

#### POST /api/v1/waha/qr
- **URI**: /api/v1/waha/qr
- **Nome**: generated::NRd2FrsrRmGS3L1H
- **Controller**: App\Http\Controllers\WhatsappController@getWahaQr
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - session: required|string
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Gera QR Code para sessão WAHA

#### GET /api/v1/waha/sessions/{sessionName}
- **URI**: /api/v1/waha/sessions/{sessionName}
- **Nome**: generated::4TfkVYRd008TIwPH
- **Controller**: App\Http\Controllers\WhatsappController@getWahaSessionStatus
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['sessionName' => 'required|string']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Status de sessão WAHA específica

#### POST /api/v1/waha/disconnect
- **URI**: /api/v1/waha/disconnect
- **Nome**: generated::JNwl1vzRT15Sva1G
- **Controller**: App\Http\Controllers\WhatsappController@disconnectWahaSession
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - session: required|string
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Desconecta sessão WAHA

#### POST /api/v1/disconnect-waha-session
- **URI**: /api/v1/disconnect-waha-session
- **Nome**: generated::rICDKPS1H2pWvo4c
- **Controller**: App\Http\Controllers\WhatsappController@disconnectWahaSession
- **Middleware**: ['api']
- **Descrição**: Endpoint público para desconectar WAHA

#### POST /api/v1/webhook-whatsapp
- **URI**: /api/v1/webhook-whatsapp
- **Nome**: generated::GJ42FdyGvsrSoada
- **Controller**: App\Http\Controllers\WhatsappController@webhook
- **Middleware**: ['api']
- **Descrição**: Webhook para eventos WhatsApp

#### POST /api/v1/webhook-whatsapp-extractor
- **URI**: /api/v1/webhook-whatsapp-extractor
- **Nome**: generated::a0fq6ToteMCRydjI
- **Controller**: App\Http\Controllers\WhatsappController@webhookExtractor
- **Middleware**: ['api']
- **Descrição**: Webhook para extração de dados WhatsApp

#### POST /api/v1/whatsapp/{instance}/poll
- **URI**: /api/v1/whatsapp/{instance}/poll
- **Nome**: generated::wtiv23TqjAJwY56A
- **Controller**: App\Http\Controllers\API\v1\WhatsappController@sendPoll
- **Middleware**: ['api']
- **Parâmetros de Rota**: ['instance' => 'required|string']
- **Parâmetros de Body**:
  - name: required|string
  - options: required|array|min:2
  - selectableCount: required|integer|min:1
  - number: required|string
- **Descrição**: Envia enquete via WhatsApp

#### GET /api/v1/whatsapp/{instance}/settings
- **URI**: /api/v1/whatsapp/{instance}/settings
- **Nome**: generated::wxoKD7m0XqsL302P
- **Controller**: App\Http\Controllers\API\v1\WhatsappController@getSettings
- **Middleware**: ['api']
- **Parâmetros de Rota**: ['instance' => 'required|string']
- **Descrição**: Obtém configurações da instância WhatsApp

#### POST /api/v1/whatsapp/{instance}/settings
- **URI**: /api/v1/whatsapp/{instance}/settings
- **Nome**: generated::sYsXxgV36RP23kyu
- **Controller**: App\Http\Controllers\API\v1\WhatsappController@setSettings
- **Middleware**: ['api']
- **Parâmetros de Rota**: ['instance' => 'required|string']
- **Parâmetros de Body**:
  - reject_call: boolean
  - groups_ignore: boolean
  - always_online: boolean
  - read_messages: boolean
  - read_status: boolean
  - sync_full_history: boolean
- **Descrição**: Atualiza configurações da instância WhatsApp

### ADMINISTRAÇÃO

#### GET /api/v1/config/customers
- **URI**: /api/v1/config/customers
- **Nome**: generated::DzLmkzh0fduiStAB
- **Controller**: App\Http\Controllers\UserController@index
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Lista todos os clientes (admin only)

#### POST /api/v1/config/customers
- **URI**: /api/v1/config/customers
- **Nome**: generated::IQGjJKfP5PvVwoH5
- **Controller**: App\Http\Controllers\UserController@store
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Parâmetros de Body**:
  - name: required|string|max:255
  - email: required|email|unique:users
  - password: required|min:8
  - plan_id: required|exists:plans,id
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Cria novo cliente (admin only)

#### GET /api/v1/config/customers/{user}
- **URI**: /api/v1/config/customers/{user}
- **Nome**: generated::wbDEjiS6VGnJXFc8
- **Controller**: App\Http\Controllers\UserController@show
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Parâmetros de Rota**: ['user' => 'required|integer|exists:users,id']
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Detalhes de cliente específico (admin only)

#### PUT /api/v1/config/customers/{user}
- **URI**: /api/v1/config/customers/{user}
- **Nome**: generated::YcLpMaUPGkMEINRn
- **Controller**: App\Http\Controllers\UserController@update
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Parâmetros de Rota**: ['user' => 'required|integer|exists:users,id']
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Atualiza dados de cliente (admin only)

#### DELETE /api/v1/config/customers/{user}
- **URI**: /api/v1/config/customers/{user}
- **Nome**: generated::CnISWyepAtdcFbHE
- **Controller**: App\Http\Controllers\UserController@destroy
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Parâmetros de Rota**: ['user' => 'required|integer|exists:users,id']
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Remove cliente (admin only)

#### GET /api/v1/config/dashboard
- **URI**: /api/v1/config/dashboard
- **Nome**: generated::gTdAOrvBIhj8mgn7
- **Controller**: App\Http\Controllers\DashboardController@indicators
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Indicadores administrativos do dashboard

#### GET /api/v1/config/campaigns-all
- **URI**: /api/v1/config/campaigns-all
- **Nome**: generated::sG7JCw9Or3uUxQlw
- **Controller**: App\Http\Controllers\CampaignsController@index2
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Lista todas as campanhas do sistema (admin only)

#### GET /api/v1/config/customer-x-lastshot
- **URI**: /api/v1/config/customer-x-lastshot
- **Nome**: generated::Qi6OttAuRAuE9LIi
- **Controller**: App\Http\Controllers\DashboardController@customerLastShot
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Última atividade dos clientes (admin only)

### PAGAMENTOS

#### POST /api/v1/create-payment
- **URI**: /api/v1/create-payment
- **Nome**: generated::zyPSuqjsE2zvJ5Ao
- **Controller**: App\Http\Controllers\PaymentController@create
- **Middleware**: ['api']
- **Parâmetros de Body**:
  - plan_id: required|exists:plans,id
  - user_id: required|exists:users,id
  - payment_method: required|in:stripe,mercadopago
- **Descrição**: Cria nova transação de pagamento

#### POST /api/v1/webhook-stripe
- **URI**: /api/v1/webhook-stripe
- **Nome**: generated::LbGSFtWNkjSXfgWh
- **Controller**: App\Http\Controllers\PaymentController@webhookStripe
- **Middleware**: ['api']
- **Descrição**: Webhook para eventos Stripe

#### POST /api/v1/webhook-mp
- **URI**: /api/v1/webhook-mp
- **Nome**: generated::eezTDVHqPgTTd7hU
- **Controller**: App\Http\Controllers\PaymentController@webhook
- **Middleware**: ['api']
- **Descrição**: Webhook para eventos MercadoPago

#### GET /api/v1/config/payments
- **URI**: /api/v1/config/payments
- **Nome**: generated::9VETVZUYEqo7PhKr
- **Controller**: App\Http\Controllers\PaymentController@index
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Lista histórico de pagamentos (admin only)

### PLANOS

#### GET /api/v1/config/plans
- **URI**: /api/v1/config/plans
- **Nome**: generated::BmFE9Kjv8YD38qEQ
- **Controller**: App\Http\Controllers\PlansController@index
- **Middleware**: ['api']
- **Descrição**: Lista planos disponíveis (público)

#### POST /api/v1/config/plans
- **URI**: /api/v1/config/plans
- **Nome**: generated::qqLMoOO6FYrczxcm
- **Controller**: App\Http\Controllers\PlansController@store
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Parâmetros de Body**:
  - name: required|string|max:255
  - price: required|numeric|min:0
  - features: required|array
  - limit_campaigns: required|integer|min:1
  - limit_contacts: required|integer|min:1
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Cria novo plano (admin only)

#### GET /api/v1/config/plans/{plan}
- **URI**: /api/v1/config/plans/{plan}
- **Nome**: generated::0zBxsvpv9y7ELBlb
- **Controller**: App\Http\Controllers\PlansController@show
- **Middleware**: ['api']
- **Parâmetros de Rota**: ['plan' => 'required|integer|exists:plans,id']
- **Descrição**: Detalhes de plano específico (público)

#### PUT /api/v1/config/plans/{plan}
- **URI**: /api/v1/config/plans/{plan}
- **Nome**: generated::vDQKqS2wRmybLBZZ
- **Controller**: App\Http\Controllers\PlansController@update
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Parâmetros de Rota**: ['plan' => 'required|integer|exists:plans,id']
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Atualiza plano existente (admin only)

#### DELETE /api/v1/config/plans/{plan}
- **URI**: /api/v1/config/plans/{plan}
- **Nome**: generated::C8EfTYMzdeD0WWXN
- **Controller**: App\Http\Controllers\PlansController@destroy
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Parâmetros de Rota**: ['plan' => 'required|integer|exists:plans,id']
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Remove plano (admin only)

#### POST /api/v1/config/plans/cancel
- **URI**: /api/v1/config/plans/cancel
- **Nome**: generated::5dvWSWRCZcF5txbq
- **Controller**: App\Http\Controllers\PlansController@cancel
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Cancela assinatura atual do usuário

### PÚBLICOS E LABELS

#### GET /api/v1/publics
- **URI**: /api/v1/publics
- **Nome**: generated::lO8hqQyy8mdmLfrg
- **Controller**: App\Http\Controllers\PublicsController@index
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Lista públicos-alvo do usuário

#### POST /api/v1/publics-duplicate
- **URI**: /api/v1/publics-duplicate
- **Nome**: generated::TLXOSyhPk1WPbAcG
- **Controller**: App\Http\Controllers\PublicsController@duplicate
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - public_id: required|exists:publics,id
  - name: required|string|max:255
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Duplica público-alvo existente

#### GET /api/v1/publics/contact
- **URI**: /api/v1/publics/contact
- **Nome**: generated::WfVZn7CiFYkHYC53
- **Controller**: App\Http\Controllers\PublicsController@contact
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Query Parameters**: ['public_id' => 'required|exists:publics,id']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Lista contatos de um público específico

#### GET /api/v1/publics/download-contacts/{public}
- **URI**: /api/v1/publics/download-contacts/{public}
- **Nome**: generated::43y3tIj51JiIUflc
- **Controller**: App\Http\Controllers\PublicsController@download
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['public' => 'required|integer|exists:publics,id']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Download de contatos de público específico

#### POST /api/v1/publics/{public}
- **URI**: /api/v1/publics/{public}
- **Nome**: generated::1EJTaIvVQQ1mjVss
- **Controller**: App\Http\Controllers\PublicsController@update
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['public' => 'required|integer|exists:publics,id']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Atualiza público-alvo

#### DELETE /api/v1/publics/{creative}
- **URI**: /api/v1/publics/{creative}
- **Nome**: generated::Ta6hiAACbX8njXvr
- **Controller**: App\Http\Controllers\PublicsController@destroy
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['creative' => 'required|integer|exists:publics,id']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Remove público-alvo

#### GET /api/v1/labels
- **URI**: /api/v1/labels
- **Nome**: generated::OlGEYf4M2tTZgljw
- **Controller**: App\Http\Controllers\LabelController@index
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Lista labels do usuário

#### POST /api/v1/labels
- **URI**: /api/v1/labels
- **Nome**: generated::pbGu7jAGeUKcJYgu
- **Controller**: App\Http\Controllers\LabelController@store
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - name: required|string|max:255|unique:labels,name,NULL,id,user_id,{user_id}
  - color: required|string|regex:/^#[0-9A-Fa-f]{6}$/
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Cria nova label

#### DELETE /api/v1/labels/{label}
- **URI**: /api/v1/labels/{label}
- **Nome**: generated::pccIAE38HHV1BCAG
- **Controller**: App\Http\Controllers\LabelController@destroy
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['label' => 'required|integer|exists:labels,id']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Remove label

### NÚMEROS WHATSAPP

#### GET /api/v1/numbers
- **URI**: /api/v1/numbers
- **Nome**: generated::iHCeq8EOICPHUuUM
- **Controller**: App\Http\Controllers\WhatsappController@index
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Lista números WhatsApp do usuário

#### GET /api/v1/numbers/{number}
- **URI**: /api/v1/numbers/{number}
- **Nome**: generated::j3qKWgbNHDL0yMYg
- **Controller**: App\Http\Controllers\WhatsappController@show
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['number' => 'required|integer|exists:numbers,id']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Detalhes de número específico

#### POST /api/v1/numbers/{number}
- **URI**: /api/v1/numbers/{number}
- **Nome**: generated::vtXRBwhhK4gXl5VW
- **Controller**: App\Http\Controllers\WhatsappController@update
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['number' => 'required|integer|exists:numbers,id']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Atualiza configurações do número

#### DELETE /api/v1/numbers/{number}
- **URI**: /api/v1/numbers/{number}
- **Nome**: generated::2IhsT0aQcfn6orzv
- **Controller**: App\Http\Controllers\WhatsappController@destroy
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['number' => 'required|integer|exists:numbers,id']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Remove número WhatsApp

#### GET /api/v1/extra-number
- **URI**: /api/v1/extra-number
- **Nome**: generated::zXdcrJGPBPRWbcNN
- **Controller**: App\Http\Controllers\WhatsappController@extra
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Lista números extras disponíveis

#### POST /api/v1/extra-number
- **URI**: /api/v1/extra-number
- **Nome**: generated::zgre47mn6RVqWjVZ
- **Controller**: App\Http\Controllers\WhatsappController@extraAdd
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - phone: required|string|unique:numbers
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Adiciona número extra

### DASHBOARD E UTILIDADES

#### GET /api/v1/dashboard
- **URI**: /api/v1/dashboard
- **Nome**: generated::h2ahoODsrNBtPyFA
- **Controller**: App\Http\Controllers\DashboardController@index
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Dados principais do dashboard

#### GET /api/v1/dashboard-data
- **URI**: /api/v1/dashboard-data
- **Nome**: generated::Xi3rigfHQuy6DOAb
- **Controller**: App\Http\Controllers\DashboardController@dashboard
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Dados completos do dashboard

#### GET /api/health
- **URI**: /api/health
- **Nome**: generated::Hnf4dtlvMCSEGRT9
- **Controller**: Closure
- **Middleware**: ['api']
- **Descrição**: Health check da aplicação

#### GET /api/v1/cors-test
- **URI**: /api/v1/cors-test
- **Nome**: generated::exgH5WI56RpvMgsq
- **Controller**: Closure
- **Middleware**: ['api']
- **Descrição**: Teste de configuração CORS

### CONFIGURAÇÕES

#### GET /api/v1/config/settings
- **URI**: /api/v1/config/settings
- **Nome**: generated::eWgbcE7yQnIC6v5Q
- **Controller**: App\Http\Controllers\SettingsController@index
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Lista configurações globais (admin only)

#### POST /api/v1/config/settings
- **URI**: /api/v1/config/settings
- **Nome**: generated::W1s5gj7G3IJvrXMo
- **Controller**: App\Http\Controllers\SettingsController@store
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie', 'App\Http\Middleware\AdminAccess']
- **Parâmetros de Body**:
  - key: required|string|max:255
  - value: required|string
  - type: required|in:string,integer,boolean,json
- **Autenticação**: Bearer Token + Admin obrigatório
- **Descrição**: Salva configuração global (admin only)

#### POST /api/v1/configuration/save
- **URI**: /api/v1/configuration/save
- **Nome**: generated::Ai4S9REUYcG4L1G3
- **Controller**: App\Http\Controllers\UserController@saveConfiguration
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Body**:
  - configurations: required|array
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Salva configurações do usuário

### PERFIL DE USUÁRIO

#### GET /api/v1/user/{user}
- **URI**: /api/v1/user/{user}
- **Nome**: generated::rTooCTRt1BYJKCSr
- **Controller**: App\Http\Controllers\UserController@show
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['user' => 'required|integer|exists:users,id']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Dados do perfil do usuário

#### POST /api/v1/user/{user}
- **URI**: /api/v1/user/{user}
- **Nome**: generated::0HlwV9E0egyBVbtH
- **Controller**: App\Http\Controllers\UserController@update_user
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Parâmetros de Rota**: ['user' => 'required|integer|exists:users,id']
- **Parâmetros de Body**:
  - name: nullable|string|max:255
  - email: nullable|email|unique:users,email,{user_id}
  - password: nullable|min:8|confirmed
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Atualiza dados do perfil

### ENDPOINTS DE RECUPERAÇÃO

#### GET /api/v1/recovery-campaigns
- **URI**: /api/v1/recovery-campaigns
- **Nome**: generated::Ehr9c8y6mbrnvpej
- **Controller**: App\Http\Controllers\CampaignsController@recoverys
- **Middleware**: ['api']
- **Descrição**: Lista campanhas para recuperação

#### GET /api/v1/recovery-campaign/{campaign}
- **URI**: /api/v1/recovery-campaign/{campaign}
- **Nome**: generated::ouvxCviX96K1J3LP
- **Controller**: App\Http\Controllers\CampaignsController@recovery
- **Middleware**: ['api']
- **Parâmetros de Rota**: ['campaign' => 'required|integer|exists:campaigns,id']
- **Descrição**: Recupera campanha específica

#### GET /api/v1/recovery-campaigns-check
- **URI**: /api/v1/recovery-campaigns-check
- **Nome**: generated::9jyYlqM20JmMu1BW
- **Controller**: App\Http\Controllers\CampaignsController@recoverys_check
- **Middleware**: ['api']
- **Descrição**: Verifica status de recuperação

#### GET /api/v1/recovery-campaigns-olders
- **URI**: /api/v1/recovery-campaigns-olders
- **Nome**: generated::jYMTuzHKxjmCbIJs
- **Controller**: App\Http\Controllers\CampaignsController@recovery_campaigns_older
- **Middleware**: ['api']
- **Descrição**: Campanhas antigas para recuperação

#### GET /api/v1/recovery-campaigns-schedules
- **URI**: /api/v1/recovery-campaigns-schedules
- **Nome**: generated::Ijzi4diTLVt2zkA1
- **Controller**: App\Http\Controllers\CampaignsController@recoverys_schedules
- **Middleware**: ['api']
- **Descrição**: Agendamentos de recuperação

### ENDPOINTS DE TESTE E DEBUG

#### GET /api/v1/test-check-whatsapp-realtime
- **URI**: /api/v1/test-check-whatsapp-realtime
- **Nome**: generated::GHaDsMFeLCqlapLp
- **Controller**: Closure
- **Middleware**: ['api']
- **Descrição**: Teste público de conexão WhatsApp

#### GET /api/v1/debug-connect-whatsapp
- **URI**: /api/v1/debug-connect-whatsapp
- **Nome**: generated::dCPv9ll179a47Wcz
- **Controller**: Closure
- **Middleware**: ['api']
- **Descrição**: Debug de conexão WhatsApp

#### GET /api/v1/debug-evolution-api
- **URI**: /api/v1/debug-evolution-api
- **Nome**: generated::VMG8Ql6ApnXZ7Vy2
- **Controller**: Closure
- **Middleware**: ['api']
- **Descrição**: Debug da Evolution API

#### GET /api/v1/debug-servers
- **URI**: /api/v1/debug-servers
- **Nome**: generated::mx260miQSK87b8ML
- **Controller**: Closure
- **Middleware**: ['api']
- **Descrição**: Debug de servidores

#### GET /api/v1/test-qrcode
- **URI**: /api/v1/test-qrcode
- **Nome**: generated::curuMh3d4AOjlQJy
- **Controller**: Closure
- **Middleware**: ['api']
- **Descrição**: Teste de geração QR Code

#### GET /api/v1/test-qrcode-fixed
- **URI**: /api/v1/test-qrcode-fixed
- **Nome**: generated::a4Qa8iEsiTGMNc1N
- **Controller**: Closure
- **Middleware**: ['api']
- **Descrição**: Teste de QR Code corrigido

#### GET /api/v1/test-evolution-connection
- **URI**: /api/v1/test-evolution-connection
- **Nome**: generated::hLUQNorxhHIzjUrx
- **Controller**: Closure
- **Middleware**: ['api']
- **Descrição**: Teste de conexão Evolution API

#### POST /api/v1/test-cloud-api-public
- **URI**: /api/v1/test-cloud-api-public
- **Nome**: generated::dPaltqeu5uAKYGWq
- **Controller**: Closure
- **Middleware**: ['api']
- **Descrição**: Teste público da Cloud API

### SINCRONIZAÇÃO E PROCESSAMENTO

#### POST /api/v1/sync-contacts-manual
- **URI**: /api/v1/sync-contacts-manual
- **Nome**: generated::my5FAHiqqKmaAflK
- **Controller**: App\Http\Controllers\CampaignsController@manual_contacts_sync
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Sincronização manual de contatos

#### GET /api/v1/contacts-sync-status
- **URI**: /api/v1/contacts-sync-status
- **Nome**: generated::ow2KOsNlOpnSgjug
- **Controller**: App\Http\Controllers\CampaignsController@contacts_sync_status
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Status de sincronização de contatos

#### GET /api/v1/sync-simplicados
- **URI**: /api/v1/sync-simplicados
- **Nome**: generated::TEtzWRyVeZRW6wBv
- **Controller**: App\Http\Controllers\CampaignsController@simplified_sync
- **Middleware**: ['api']
- **Descrição**: Sincronização de campanhas simplificadas

### OUTROS ENDPOINTS

#### GET /api/v1/config/extractor
- **URI**: /api/v1/config/extractor
- **Nome**: generated::8QTidJKzbOlE5ora
- **Controller**: App\Http\Controllers\ExtractorController@index
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Configurações do extrator

#### POST /api/v1/config/extractor
- **URI**: /api/v1/config/extractor
- **Nome**: generated::H9bRCrnTzV4CT6GC
- **Controller**: App\Http\Controllers\ExtractorController@store
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Salva configurações do extrator

#### GET /api/v1/config/logs
- **URI**: /api/v1/config/logs
- **Nome**: generated::e0K6wXguTT9pePoy
- **Controller**: App\Http\Controllers\LogsController@index
- **Middleware**: ['api', 'App\Http\Middleware\CheckAuthCookie']
- **Autenticação**: Bearer Token obrigatório
- **Descrição**: Lista logs do sistema

## Status Codes Utilizados

### Success (2xx)
- **200 OK**: Operação bem-sucedida
- **201 Created**: Recurso criado com sucesso
- **204 No Content**: Operação bem-sucedida sem conteúdo

### Client Error (4xx)
- **400 Bad Request**: Dados inválidos
- **401 Unauthorized**: Não autenticado
- **403 Forbidden**: Não autorizado (sem permissão)
- **404 Not Found**: Recurso não encontrado
- **422 Unprocessable Entity**: Validação falhou
- **429 Too Many Requests**: Rate limit excedido

### Server Error (5xx)
- **500 Internal Server Error**: Erro interno do servidor
- **503 Service Unavailable**: Serviço indisponível

## Rate Limiting

- **Padrão API**: 60 requests por minuto
- **Endpoints de autenticação**: Limitação especial
- **Webhooks**: Sem limitação
- **Endpoints de teste**: 100 requests por minuto

## Autenticação

### Bearer Token
- Header: `Authorization: Bearer {token}`
- Obtido via `/api/v1/login`
- Válido por tempo configurado em sessão

### Cookie Authentication
- Middleware: `CheckAuthCookie`
- Cookie: `auth_token`
- Usado em conjunto com Bearer Token

### Admin Access
- Middleware adicional: `AdminAccess`
- Verifica se usuário tem permissões administrativas
- Aplicado em endpoints de configuração global