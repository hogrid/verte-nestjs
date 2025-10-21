# REGRAS DE NEGÓCIO POR ENDPOINT

## Resumo Executivo

Este documento detalha todas as regras de negócio, validações e fluxos de execução dos endpoints da API Laravel para garantir migração 100% fiel para NestJS.

### Características Principais do Sistema
- **Sistema de Marketing WhatsApp** com múltiplas integrações de API
- **Autenticação JWT** com Sanctum
- **Planos de Assinatura** com limites diferenciados
- **Processamento assíncrono** com filas Redis
- **Integração com gateways de pagamento** Stripe e MercadoPago
- **Múltiplas APIs WhatsApp** (Evolution API, WppConnect, WAHA)

---

## 1. AUTENTICAÇÃO E USUÁRIOS

### POST /api/v1/login (AuthController@login)

#### Regras de Validação
```php
$request->validate([
    'email' => 'required|email',
    'password' => 'required|string'
]);
```

#### Lógica de Negócio
1. **Validar credenciais** contra tabela users
2. **Verificar status da conta**:
   - `status` deve ser 'actived'
   - `active` deve ser 1
   - `canceled_at` deve ser null
3. **Gerar token Sanctum** com TTL de 3600 segundos
4. **Buscar dados do usuário** com relacionamentos:
   - Plan (plano ativo)
   - Numbers (números WhatsApp)
   - Configuration (configurações personalizadas)
5. **Verificar conexão WhatsApp**:
   - Busca número ativo do usuário
   - Consulta status na API WhatsApp correspondente
   - Atualiza status no banco de dados
6. **Preparar resposta** com dados completos do perfil

#### Response Success (200)
```json
{
    "expiresIn": 3600,
    "userData": {
        "id": 1,
        "name": "João Silva",
        "email": "joao@email.com",
        "numbersConnected": 1,
        "totalNumber": "1",
        "extraNumbers": 0,
        "numberActive": {
            "id": 1,
            "name": "Principal",
            "cel": "5511999999999",
            "instance": "default",
            "status": 1,
            "status_connection": 1,
            "photo": "data:image/jpeg;base64,..."
        },
        "serverType": "waha",
        "plan": {
            "id": 1,
            "name": "Plano Básico",
            "value": 97.00,
            "unlimited": false,
            "medias": true,
            "reports": true,
            "schedule": true
        },
        "config": {
            "timer_delay": 30,
            "ddds": ["11", "21", "31"]
        }
    },
    "token": "1|abc123def456ghi789"
}
```

#### Response Error (401)
```json
{
    "message": "Credenciais inválidas",
    "status": false
}
```

#### Response Error (422)
```json
{
    "message": "Os dados fornecidos são inválidos.",
    "errors": {
        "email": ["O campo email é obrigatório."],
        "password": ["O campo password é obrigatório."]
    }
}
```

#### Dependências Externas
- **Sanctum**: Geração e gerenciamento de tokens
- **WhatsApp APIs**: Verificação de status de conexão
- **LogService**: Registro de tentativas de login

---

### POST /api/v1/logout (AuthController@logout)

#### Lógica de Negócio
1. **Revogar token atual** do usuário autenticado
2. **Registrar logout** no sistema de logs
3. **Limpar sessões relacionadas** se existirem

#### Response Success (200)
```json
{
    "message": "Logout realizado com sucesso"
}
```

---

### POST /api/v1/register (AuthController@register)

#### Regras de Validação
```php
$request->validate([
    'name' => 'required|string|max:255',
    'email' => 'required|email|unique:users,email',
    'password' => 'required|min:8|confirmed',
    'cpfCnpj' => 'required|string',
    'cel' => 'required|string'
]);
```

#### Lógica de Negócio
1. **Validar CPF/CNPJ** usando helper brasileiro
2. **Formatar número de celular** para padrão brasileiro
3. **Criar usuário** com status 'actived' e profile 'user'
4. **Hash da senha** usando bcrypt
5. **Gerar código de verificação** de email
6. **Enviar email de boas-vindas** (se configurado)
7. **Criar configuração padrão** para o usuário
8. **Registrar ação** no sistema de logs

#### Response Success (201)
```json
{
    "data": {
        "id": 1,
        "name": "João Silva",
        "email": "joao@email.com",
        "status": "actived",
        "profile": "user",
        "confirmed_mail": 0,
        "created_at": "2024-01-01T10:00:00.000000Z"
    },
    "message": "Usuário criado com sucesso"
}
```

---

### POST /api/v1/reset (AuthController@send_forget_password)

#### Processo Multi-Step

##### Step 0: Solicitar Reset
```php
$request->validate([
    'email' => 'required|email|exists:users,email'
]);
```

**Lógica:**
1. **Gerar PIN de 6 dígitos** aleatório
2. **Salvar código** no campo `email_code_verification`
3. **Enviar email** com código de recuperação
4. **Definir expiração** de 15 minutos para o código

##### Step 1: Verificar Código
```php
$request->validate([
    'pin' => 'required|string|size:6'
]);
```

**Lógica:**
1. **Verificar se código existe** e não expirou
2. **Validar PIN** contra banco de dados
3. **Marcar código como verificado** (manter para step 2)

##### Step 2: Redefinir Senha
```php
$request->validate([
    'password' => 'required|min:8|confirmed',
    'pin' => 'required|string|size:6'
]);
```

**Lógica:**
1. **Revalidar PIN** uma última vez
2. **Atualizar senha** com hash bcrypt
3. **Limpar código de verificação**
4. **Enviar email de confirmação** da alteração
5. **Revogar todos os tokens** do usuário por segurança

#### Response Formats
```json
// Step 0 Success
{
    "message": "Código de recuperação enviado para seu email",
    "next_step": 1
}

// Step 1 Success  
{
    "message": "Código verificado com sucesso",
    "next_step": 2
}

// Step 2 Success
{
    "message": "Senha atualizada com sucesso"
}
```

---

### GET /api/v1/ping (AuthController@ping)

#### Lógica de Negócio
1. **Verificar autenticação** do usuário
2. **Buscar dados completos** do perfil com relacionamentos
3. **Verificar status da conexão WhatsApp** em tempo real
4. **Buscar configurações** e preferências
5. **Calcular estatísticas** de uso (campanhas, contatos, etc.)

#### Response Success (200)
```json
{
    "id": 1,
    "name": "João Silva", 
    "email": "joao@email.com",
    "cel": "5511999999999",
    "cpfCnpj": "123.456.789-00",
    "status": "actived",
    "profile": "user",
    "active": 1,
    "photo": "https://example.com/photo.jpg",
    "confirmed_mail": 1,
    "plan": {
        "id": 1,
        "name": "Plano Básico",
        "unlimited": false,
        "medias": true,
        "reports": true,
        "schedule": true
    },
    "numbersConnected": 1,
    "totalNumber": "1",
    "extraNumbers": 0,
    "numberActive": {
        "id": 1,
        "instance": "default",
        "status_connection": 1
    },
    "config": {
        "timer_delay": 30
    }
}
```

---

## 2. GERENCIAMENTO DE USUÁRIOS

### GET /api/v1/config/customers (UserController@index) [ADMIN ONLY]

#### Query Parameters
- `order`: 'desc'|'asc' (default: 'desc')
- `search`: string para busca em name, email, cpfCnpj, cel
- `filterFields`: array JSON de filtros personalizados

#### Lógica de Negócio
1. **Verificar permissão administrativa**
2. **Aplicar filtros de busca** em múltiplos campos
3. **Fazer join com tabela numbers** para contar números por usuário
4. **Incluir relacionamento com plans**
5. **Aplicar paginação** (15 por página)
6. **Ordenar por data de criação** ou campo especificado

#### Response Success (200)
```json
{
    "data": [
        {
            "id": 1,
            "name": "João Silva",
            "email": "joao@email.com", 
            "status": "actived",
            "totalNumbers": 2,
            "plan": {
                "name": "Plano Premium"
            },
            "created_at": "2024-01-01T10:00:00Z"
        }
    ],
    "meta": {
        "current_page": 1,
        "per_page": 15,
        "total": 50
    }
}
```

---

### POST /api/v1/config/customers (UserController@store) [ADMIN ONLY]

#### Regras de Validação
```php
$request->validate([
    'name' => 'required|string|max:255',
    'email' => 'required|email|unique:users,email',
    'password' => 'required|min:8|confirmed',
    'plan_id' => 'required|exists:plans,id',
    'cpfCnpj' => 'required|string',
    'cel' => 'required|string'
]);
```

#### Lógica de Negócio
1. **Validar dados de entrada** com regras específicas
2. **Verificar unicidade do email** 
3. **Criar usuário** com dados fornecidos
4. **Atribuir plano especificado**
5. **Gerar senha temporária** ou usar fornecida
6. **Enviar email de boas-vindas** com credenciais
7. **Criar configuração padrão**
8. **Registrar criação** no sistema de logs

#### Response Success (201)
```json
{
    "data": {
        "id": 2,
        "name": "Cliente Novo",
        "email": "cliente@email.com",
        "plan_id": 1,
        "status": "actived",
        "created_at": "2024-01-01T10:00:00Z"
    },
    "message": "Cliente criado com sucesso"
}
```

---

## 3. GERENCIAMENTO WHATSAPP

### GET /api/v1/connect-whatsapp (WhatsappController@connect)

#### Lógica de Negócio
1. **Buscar número ativo** do usuário autenticado
2. **Verificar se há instância configurada**
3. **Migrar nome da instância** se necessário (de Evolution para WAHA)
4. **Gerar QR Code** através da API correspondente
5. **Atualizar status de conexão** no banco
6. **Retornar QR Code** para escaneamento

#### Response Success (200)
```json
{
    "data": {
        "status": 0,
        "connected": false,
        "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
        "engine": "waha",
        "message": "Escaneie o QR Code com seu WhatsApp",
        "instance": "default"
    }
}
```

#### Response Error (404)
```json
{
    "message": "Nenhum número WhatsApp configurado",
    "status": false
}
```

#### Dependências Externas
- **WAHA API**: Geração de QR Code e gerenciamento de sessão
- **Evolution API**: API alternativa para WhatsApp (legacy)
- **LogService**: Registro de tentativas de conexão

---

### GET /api/v1/connect-whatsapp-check (WhatsappController@checkConnection)

#### Lógica de Negócio
1. **Buscar número ativo** do usuário
2. **Consultar status na API WhatsApp** (não usa cache)
3. **Sincronizar status** real com banco de dados
4. **Atualizar metadados** (foto, nome do perfil) se conectado
5. **Retornar status atualizado**

#### Response Success (200)
```json
{
    "data": {
        "connected": true,
        "status_connection": 1,
        "profile": {
            "name": "João Silva",
            "photo": "data:image/jpeg;base64,..."
        },
        "lastSync": "2024-01-01T10:00:00Z"
    }
}
```

#### Response Connection Lost (200)
```json
{
    "data": {
        "connected": false,
        "status_connection": 0,
        "message": "WhatsApp desconectado",
        "needsReconnection": true
    }
}
```

---

### POST /api/v1/force-check-whatsapp-connections

#### Lógica de Negócio
1. **Disparar job de verificação** para todas as conexões do usuário
2. **Executar CheckWhatsappConnectionsJob** de forma síncrona
3. **Atualizar status** de todas as instâncias
4. **Retornar resultado** da verificação

#### Response Success (200)
```json
{
    "message": "Verificação forçada executada",
    "checked_instances": 3,
    "connected": 2,
    "disconnected": 1
}
```

---

### POST /api/v1/waha/qr (WhatsappController@getWahaQr)

#### Regras de Validação
```php
$request->validate([
    'session' => 'required|string'
]);
```

#### Lógica de Negócio
1. **Validar sessão informada**
2. **Fazer requisição para WAHA API** endpoint `/sessions/{session}/start`
3. **Aguardar geração do QR Code** (polling até 30 segundos)
4. **Retornar QR Code base64** quando disponível

#### Response Success (200)
```json
{
    "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "session": "default",
    "status": "SCAN_QR_CODE"
}
```

---

### GET /api/v1/waha/sessions/{sessionName} (WhatsappController@getWahaSessionStatus)

#### Lógica de Negócio
1. **Consultar status da sessão** na WAHA API
2. **Retornar informações detalhadas** da sessão
3. **Incluir dados do perfil** se conectado

#### Response Success (200)
```json
{
    "session": "default",
    "status": "WORKING",
    "config": {
        "proxy": null,
        "webhooks": []
    },
    "me": {
        "id": "5511999999999@c.us",
        "pushName": "João Silva"
    }
}
```

---

## 4. GERENCIAMENTO DE CAMPANHAS

### GET /api/v1/campaigns (CampaignsController@index)

#### Query Parameters
- `page`: número da página
- `per_page`: itens por página (default: 10)
- `status`: filtro por status (0=ativa, 1=pausada, 2=cancelada, 3=agendada)
- `search`: busca por nome da campanha

#### Lógica de Negócio
1. **Filtrar campanhas do usuário** autenticado
2. **Aplicar filtros** de status e busca
3. **Incluir relacionamentos**:
   - Messages (mensagens da campanha)
   - Number (número WhatsApp usado)
   - Public (público-alvo)
4. **Calcular estatísticas** em tempo real
5. **Ordenar por data** de criação (mais recentes primeiro)

#### Response Success (200)
```json
{
    "data": [
        {
            "id": 1,
            "name": "Campanha Promocional Janeiro",
            "type": 1,
            "status": 0,
            "progress": 75,
            "total_contacts": 1000,
            "total_sent": 750,
            "total_delivered": 720,
            "total_read": 450,
            "total_interactions": 120,
            "schedule_date": null,
            "date_finished": null,
            "created_at": "2024-01-01T10:00:00Z",
            "messages": [
                {
                    "id": 1,
                    "type": 0,
                    "message": "Olá! Temos uma promoção especial para você!",
                    "media": null,
                    "order": 1
                }
            ],
            "number": {
                "id": 1,
                "name": "Principal",
                "cel": "5511999999999"
            },
            "public": {
                "id": 1,
                "name": "Clientes VIP"
            }
        }
    ],
    "meta": {
        "current_page": 1,
        "per_page": 10,
        "total": 25,
        "last_page": 3
    }
}
```

---

### POST /api/v1/campaigns (CampaignsController@store)

#### Regras de Validação
```php
$request->validate([
    'name' => 'required|string|max:150',
    'number_id' => 'required|exists:numbers,id',
    'public_id' => 'required', // pode ser 'new' para todos os contatos
    'messages' => 'required|array|min:1',
    'messages.*.message' => 'required_without:messages.*.media|string',
    'messages.*.media' => 'nullable|file|mimes:jpg,jpeg,png,gif,mp4,mp3|max:20480', // 20MB
    'messages.*.type' => 'required|integer|in:0,1,2,3', // 0=texto, 1=imagem, 2=audio, 3=video
    'schedule_date' => 'nullable|date|after:now',
    'timer' => 'required|integer|min:1|max:300' // segundos entre mensagens
]);
```

#### Lógica de Negócio

##### 1. Validações de Negócio
- **Verificar se número WhatsApp está conectado**
- **Verificar limite de campanhas** do plano do usuário
- **Validar se público existe** ou se é 'new' para todos os contatos
- **Verificar se há contatos disponíveis** para envio

##### 2. Processamento de Arquivos
```php
// Para cada mensagem com mídia
if ($message['media']) {
    $path = $request->file("messages.{$index}.media")->store('campaigns', 'public');
    $message['media'] = $path;
}
```

##### 3. Criação da Campanha
```php
$campaign = Campaign::create([
    'user_id' => auth()->id(),
    'number_id' => $request->number_id,
    'public_id' => $request->public_id === 'new' ? null : $request->public_id,
    'name' => $request->name,
    'type' => $request->public_id === 'new' ? 1 : 2, // 1=simplificada, 2=manual
    'status' => $request->schedule_date ? 3 : 0, // 3=agendada, 0=ativa
    'schedule_date' => $request->schedule_date,
    'total_contacts' => $totalContacts
]);
```

##### 4. Criação das Mensagens
```php
foreach ($request->messages as $index => $messageData) {
    Message::create([
        'user_id' => auth()->id(),
        'campaign_id' => $campaign->id,
        'type' => $messageData['type'],
        'message' => $messageData['message'] ?? null,
        'media' => $messageData['media'] ?? null,
        'media_type' => $this->getMediaType($messageData['media']),
        'order' => $index + 1
    ]);
}
```

##### 5. Enfileiramento para Execução
```php
if (!$campaign->schedule_date) {
    // Executa imediatamente
    CampaignsJob::dispatch($campaign, $timer);
} else {
    // Agenda para data/hora especificada
    CampaignsJob::dispatch($campaign, $timer)->delay($campaign->schedule_date);
}
```

#### Response Success (201)
```json
{
    "data": {
        "id": 1,
        "name": "Nova Campanha",
        "status": 0,
        "total_contacts": 500,
        "messages_count": 2,
        "schedule_date": null,
        "created_at": "2024-01-01T10:00:00Z"
    },
    "message": "Campanha criada e iniciada com sucesso"
}
```

#### Response Error (422)
```json
{
    "message": "Validação falhou",
    "errors": {
        "number_id": ["O número WhatsApp não está conectado"],
        "messages": ["É necessário pelo menos uma mensagem"],
        "public_id": ["O público selecionado não existe"]
    }
}
```

#### Response Error (400)
```json
{
    "message": "Limite de campanhas excedido para seu plano",
    "limit": 5,
    "current": 5
}
```

---

### POST /api/v1/campaigns/change-status (CampaignsController@change_status)

#### Regras de Validação
```php
$request->validate([
    'campaign_id' => 'required|exists:campaigns,id',
    'status' => 'required|in:0,1,2' // 0=ativa, 1=pausada, 2=cancelada
]);
```

#### Lógica de Negócio
1. **Verificar propriedade** da campanha pelo usuário
2. **Validar transição de status**:
   - Pausada → Ativa: Permitido
   - Ativa → Pausada: Permitido
   - Qualquer → Cancelada: Permitido (irreversível)
   - Cancelada → Qualquer: **Não permitido**
3. **Atualizar status** no banco de dados
4. **Registrar mudança** no sistema de logs
5. **Notificar jobs em execução** se necessário

#### Response Success (200)
```json
{
    "message": "Status da campanha atualizado com sucesso",
    "campaign": {
        "id": 1,
        "status": 1,
        "status_formatted": "Pausada"
    }
}
```

---

### POST /api/v1/campaigns/{id}/cancel (CampaignsController@cancelCampaign)

#### Lógica de Negócio
1. **Verificar propriedade** da campanha
2. **Verificar se campanha pode ser cancelada** (não está finalizada)
3. **Marcar como cancelada** (status = 2, canceled = true)
4. **Parar jobs em execução** relacionados à campanha
5. **Registrar cancelamento** com timestamp

#### Response Success (200)
```json
{
    "message": "Campanha cancelada com sucesso",
    "campaign_id": 1,
    "canceled_at": "2024-01-01T10:00:00Z"
}
```

---

### GET /api/v1/campaigns/{campaign} (CampaignsController@show)

#### Lógica de Negócio
1. **Verificar propriedade** da campanha
2. **Buscar dados completos** com relacionamentos:
   - Messages com ordem correta
   - Number usado na campanha
   - Public (se aplicável)
   - Estatísticas detalhadas
3. **Calcular métricas** em tempo real:
   - Taxa de entrega
   - Taxa de leitura
   - Taxa de interação

#### Response Success (200)
```json
{
    "data": {
        "id": 1,
        "name": "Campanha Detalhe",
        "type": 1,
        "status": 0,
        "progress": 85,
        "total_contacts": 1000,
        "processed_contacts": 850,
        "total_sent": 850,
        "total_delivered": 820,
        "total_read": 500,
        "total_interactions": 150,
        "success_rate": 96.47,
        "read_rate": 60.98,
        "interaction_rate": 30.0,
        "schedule_date": null,
        "date_finished": null,
        "created_at": "2024-01-01T10:00:00Z",
        "messages": [
            {
                "id": 1,
                "type": 0,
                "message": "Olá {name}! Como você está?",
                "media": null,
                "order": 1
            },
            {
                "id": 2,
                "type": 1,
                "message": "Confira nossa promoção:",
                "media": "/storage/campaigns/promocao.jpg",
                "media_type": 3,
                "order": 2
            }
        ],
        "number": {
            "id": 1,
            "name": "Principal",
            "cel": "5511999999999",
            "instance": "default"
        },
        "public": {
            "id": 1,
            "name": "Clientes Ativos",
            "total_contacts": 1000
        }
    }
}
```

---

## 5. GERENCIAMENTO DE CONTATOS

### GET /api/v1/contacts (ContactsController@index)

#### Query Parameters
- `page`: número da página
- `per_page`: itens por página (default: 15)
- `search`: busca em name e number
- `status`: 1=ativo, 2=bloqueado, 3=inativo
- `tag`: filtro por nome de label
- `public_id`: filtro por público específico

#### Lógica de Negócio
1. **Filtrar contatos do usuário** autenticado
2. **Aplicar filtros** de status, tags e busca
3. **Agrupar por número** para evitar duplicatas
4. **Incluir relacionamentos** com públicos e labels
5. **Ordenar por data** de criação (mais recentes primeiro)

#### Response Success (200)
```json
{
    "data": [
        {
            "id": 1,
            "name": "João Cliente",
            "number": "5511999999999",
            "description": "Cliente VIP desde 2020",
            "variable_1": "Empresa ABC",
            "variable_2": "Gerente",
            "variable_3": "São Paulo",
            "type": 1,
            "status": 1,
            "labels": ["vip", "ativo"],
            "labelsName": "VIP, Ativo",
            "created_at": "2024-01-01T10:00:00Z",
            "public": {
                "id": 1,
                "name": "Clientes VIP"
            }
        }
    ],
    "meta": {
        "current_page": 1,
        "per_page": 15,
        "total": 1500,
        "total_active": 1200,
        "total_blocked": 50,
        "total_inactive": 250
    }
}
```

---

### POST /api/v1/contacts (ContactsController@save)

#### Regras de Validação
```php
$request->validate([
    'name' => 'required|string|max:255',
    'number' => 'required|string|unique:contacts,number,NULL,id,user_id,' . auth()->id(),
    'description' => 'nullable|string|max:255',
    'variable_1' => 'nullable|string|max:250',
    'variable_2' => 'nullable|string|max:250', 
    'variable_3' => 'nullable|string|max:250',
    'labels' => 'nullable|array',
    'labels.*' => 'string|max:100'
]);
```

#### Lógica de Negócio
1. **Formatar número** para padrão brasileiro (55XXXXXXXXXXX)
2. **Verificar duplicatas** para o usuário atual
3. **Processar labels** (converter array para JSON)
4. **Criar contato** com dados fornecidos
5. **Associar ao público padrão** se não especificado
6. **Registrar criação** no sistema de logs

#### Response Success (201)
```json
{
    "data": {
        "id": 1,
        "name": "Novo Contato",
        "number": "5511999999999",
        "description": "Contato adicionado via API",
        "status": 1,
        "created_at": "2024-01-01T10:00:00Z"
    },
    "message": "Contato salvo com sucesso"
}
```

---

### POST /api/v1/contacts/import/csv (ContactsController@importCsv)

#### Regras de Validação
```php
$request->validate([
    'file' => 'required|file|mimes:csv,txt|max:10240', // 10MB
    'label_id' => 'nullable|exists:labels,id'
]);
```

#### Lógica de Negócio
1. **Validar arquivo CSV** (formato, tamanho, encoding)
2. **Processar arquivo** linha por linha:
   - Detectar separador (vírgula, ponto-vírgula)
   - Mapear colunas (telefone, nome, variáveis)
   - Validar formato de telefone brasileiro
3. **Importar contatos válidos**:
   - Ignorar duplicatas
   - Formatar números
   - Aplicar label se especificada
4. **Gerar relatório** de importação:
   - Total de linhas processadas
   - Contatos importados
   - Contatos ignorados (duplicatas/inválidos)
   - Erros encontrados

#### Response Success (200)
```json
{
    "message": "Importação concluída com sucesso",
    "summary": {
        "total_lines": 1000,
        "imported": 850,
        "duplicates": 100,
        "invalid": 50,
        "errors": [
            "Linha 5: Número inválido",
            "Linha 23: Formato incorreto"
        ]
    }
}
```

---

### POST /api/v1/contacts/block (ContactsController@block)

#### Regras de Validação
```php
$request->validate([
    'contact_ids' => 'required|array',
    'contact_ids.*' => 'required|exists:contacts,id'
]);
```

#### Lógica de Negócio
1. **Verificar propriedade** de todos os contatos
2. **Atualizar status** para bloqueado (status = 2)
3. **Registrar bloqueio** com timestamp
4. **Parar campanhas ativas** que incluam os contatos
5. **Notificar jobs** para pular contatos bloqueados

#### Response Success (200)
```json
{
    "message": "Contatos bloqueados com sucesso",
    "blocked_count": 5,
    "contact_ids": [1, 2, 3, 4, 5]
}
```

---

### GET /api/v1/contacts/indicators (ContactsController@indicators)

#### Lógica de Negócio
1. **Contar contatos por status** do usuário autenticado
2. **Calcular estatísticas** de crescimento (último mês vs anterior)
3. **Incluir métricas** de engajamento (taxa de resposta)

#### Response Success (200)
```json
{
    "total_contacts": 2500,
    "active_contacts": 2000,
    "blocked_contacts": 100,
    "inactive_contacts": 400,
    "growth_this_month": 150,
    "growth_percentage": 6.38,
    "engagement_rate": 15.5,
    "last_import": "2024-01-01T10:00:00Z"
}
```

---

## 6. PAGAMENTOS E PLANOS

### POST /api/v1/create-payment (PaymentController@create)

#### Regras de Validação
```php
$request->validate([
    'plan_id' => 'required|exists:plans,id',
    'user_id' => 'required|exists:users,id',
    'cardToken' => 'required|string', // Token Stripe
    'cpfCnpj' => 'required|string',
    'email' => 'required|email',
    'extra_numbers' => 'nullable|integer|min:0|max:10'
]);
```

#### Lógica de Negócio

##### 1. Preparação dos Dados
```php
$plan = Plan::findOrFail($request->plan_id);
$user = User::findOrFail($request->user_id);
$totalAmount = $plan->effective_price + ($request->extra_numbers * config('services.stripe.extra_number_price'));
```

##### 2. Processamento Stripe
```php
// Criar/atualizar customer no Stripe
$customer = $this->createOrUpdateStripeCustomer($user, $request);

// Criar subscription
$subscription = \Stripe\Subscription::create([
    'customer' => $customer->id,
    'items' => [
        ['price' => $plan->code_product],
        // Adicionar números extras se solicitado
    ],
    'payment_behavior' => 'default_incomplete',
    'expand' => ['latest_invoice.payment_intent'],
]);
```

##### 3. Confirmação do Pagamento
```php
$paymentIntent = $subscription->latest_invoice->payment_intent;
$confirmedPayment = $paymentIntent->confirm([
    'payment_method' => $request->cardToken
]);
```

##### 4. Atualização do Usuário
```php
if ($confirmedPayment->status === 'succeeded') {
    $user->update([
        'plan_id' => $plan->id,
        'stripe_id' => $customer->id,
        'due_access_at' => now()->addDays(30)
    ]);
    
    // Criar números extras se solicitados
    $this->createExtraNumbers($user, $request->extra_numbers);
}
```

##### 5. Registro da Transação
```php
Payment::create([
    'user_id' => $user->id,
    'plan_id' => $plan->id,
    'status' => 'approved',
    'payment_id' => $paymentIntent->id,
    'from' => 'stripe',
    'amount' => $totalAmount
]);
```

#### Response Success (200)
```json
{
    "message": "Pagamento processado com sucesso",
    "payment": {
        "id": 1,
        "amount": 197.00,
        "status": "approved",
        "plan": "Plano Premium",
        "extra_numbers": 2
    },
    "user": {
        "plan_id": 2,
        "due_access_at": "2024-02-01T10:00:00Z"
    }
}
```

#### Response Error (422)
```json
{
    "message": "Falha no processamento do pagamento",
    "error": "Cartão recusado",
    "stripe_error": {
        "code": "card_declined",
        "decline_code": "insufficient_funds"
    }
}
```

---

### POST /api/v1/webhook-stripe (PaymentController@webhookStripe)

#### Eventos Processados
- `customer.subscription.deleted`: Cancelamento de assinatura
- `invoice.payment_succeeded`: Pagamento bem-sucedido
- `invoice.payment_failed`: Falha no pagamento

#### Lógica de Negócio

##### Cancelamento de Assinatura
```php
if ($event->type === 'customer.subscription.deleted') {
    $subscription = $event->data->object;
    $user = User::where('stripe_id', $subscription->customer)->first();
    
    if ($user) {
        $user->update([
            'plan_id' => null,
            'canceled_at' => now(),
            'due_access_at' => now()->addDays(7) // 7 dias de gracia
        ]);
        
        // Enviar email de cancelamento
        Mail::to($user->email)->send(new SubscriptionCanceled($user));
    }
}
```

##### Pagamento Bem-sucedido
```php
if ($event->type === 'invoice.payment_succeeded') {
    $invoice = $event->data->object;
    $user = User::where('stripe_id', $invoice->customer)->first();
    
    if ($user) {
        // Estender acesso por mais 30 dias
        $user->update([
            'due_access_at' => now()->addDays(30),
            'canceled_at' => null
        ]);
        
        // Registrar pagamento
        Payment::create([
            'user_id' => $user->id,
            'status' => 'approved',
            'payment_id' => $invoice->payment_intent,
            'amount' => $invoice->amount_paid / 100
        ]);
    }
}
```

---

## 7. DASHBOARD E INDICADORES

### GET /api/v1/dashboard (DashboardController@index)

#### Lógica de Negócio
1. **Verificar modo do projeto** (Verte vs padrão)
2. **Buscar dados específicos** baseado no modo:

##### Modo Verte
```php
$data = [
    'totalCampaigns' => Campaign::where('user_id', auth()->id())->count(),
    'totalContacts' => Contact::where('user_id', auth()->id())->count(),
    'activeCampaign' => Campaign::where('user_id', auth()->id())
                                ->where('status', 0)
                                ->with('messages')
                                ->latest()
                                ->first()
];
```

##### Modo Padrão
```php
// Dados dos últimos 30 dias
$startDate = now()->subDays(30);
$data = [
    'campaigns' => $this->getCampaignStats($startDate),
    'contacts' => $this->getContactStats($startDate),
    'messages' => $this->getMessageStats($startDate),
    'performance' => $this->getPerformanceStats($startDate)
];
```

#### Response Success (200)
```json
{
    "totalCampaigns": 25,
    "totalContacts": 5000,
    "activeCampaign": {
        "id": 1,
        "name": "Campanha Atual",
        "progress": 75,
        "total_contacts": 1000,
        "total_sent": 750
    },
    "stats": {
        "delivery_rate": 95.5,
        "read_rate": 68.2,
        "interaction_rate": 15.3
    }
}
```

---

## 8. REGRAS TRANSVERSAIS

### Autenticação e Autorização

#### Middleware CheckAuthCookie
```php
public function handle($request, Closure $next)
{
    // 1. Verificar token Sanctum
    if (!auth()->check()) {
        return response()->json(['error' => 'Não autenticado'], 401);
    }
    
    // 2. Verificar status da conta
    $user = auth()->user();
    if ($user->status !== 'actived' || !$user->active) {
        return response()->json(['error' => 'Conta inativa'], 403);
    }
    
    // 3. Verificar se não está cancelada
    if ($user->canceled_at) {
        return response()->json(['error' => 'Conta cancelada'], 403);
    }
    
    return $next($request);
}
```

#### Middleware AdminAccess
```php
public function handle($request, Closure $next)
{
    if (auth()->user()->profile !== 'administrator') {
        return response()->json(['error' => 'Acesso negado'], 403);
    }
    
    return $next($request);
}
```

### Validações Globais

#### Formato de Telefone Brasileiro
```php
function validateBrazilianPhone($phone) {
    // Remove caracteres não numéricos
    $phone = preg_replace('/\D/', '', $phone);
    
    // Deve ter 13 dígitos (55 + DDD + número)
    if (strlen($phone) !== 13) {
        return false;
    }
    
    // Deve começar com 55
    if (!str_starts_with($phone, '55')) {
        return false;
    }
    
    // DDD válido (11-99)
    $ddd = substr($phone, 2, 2);
    if ($ddd < 11 || $ddd > 99) {
        return false;
    }
    
    return true;
}
```

#### Validação CPF/CNPJ
```php
function validateCpfCnpj($document) {
    $document = preg_replace('/\D/', '', $document);
    
    if (strlen($document) === 11) {
        return $this->validateCpf($document);
    } elseif (strlen($document) === 14) {
        return $this->validateCnpj($document);
    }
    
    return false;
}
```

### Processamento de Arquivos

#### Upload de Mídias
```php
function handleMediaUpload($file) {
    // Validar tipo e tamanho
    $allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3'];
    $maxSize = 20 * 1024 * 1024; // 20MB
    
    if (!in_array($file->getClientOriginalExtension(), $allowedTypes)) {
        throw new ValidationException('Tipo de arquivo não permitido');
    }
    
    if ($file->getSize() > $maxSize) {
        throw new ValidationException('Arquivo muito grande');
    }
    
    // Armazenar com nome único
    $path = $file->store('campaigns/' . date('Y/m'), 'public');
    
    return $path;
}
```

### Rate Limiting

#### Configuração por Endpoint
```php
'api' => [
    'general' => '60:1', // 60 requests por minuto
    'auth' => '5:1',     // 5 tentativas de login por minuto
    'webhook' => '1000:1', // 1000 webhooks por minuto
]
```

### Tratamento de Erros

#### Formato Padrão de Erro
```php
function errorResponse($message, $errors = null, $code = 422) {
    return response()->json([
        'message' => $message,
        'errors' => $errors,
        'status' => false
    ], $code);
}
```

#### Logs de Erro
```php
function logError($exception, $context = []) {
    Log::error($exception->getMessage(), [
        'exception' => $exception,
        'user_id' => auth()->id(),
        'request' => request()->all(),
        'context' => $context
    ]);
}
```

Esta documentação fornece a base completa para implementar todas as regras de negócio no NestJS, garantindo que o comportamento da API seja preservado integralmente durante a migração.