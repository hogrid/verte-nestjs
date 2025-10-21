# ESQUEMA COMPLETO DO BANCO DE DADOS

## Resumo do Banco
- **SGBD**: MySQL/MariaDB
- **Versão**: 8.0+ / MariaDB LTS
- **Charset**: utf8mb4
- **Collation**: utf8mb4_unicode_ci
- **Total de tabelas**: 22
- **Total de relacionamentos**: 16
- **Soft Deletes**: 18 tabelas
- **Timestamps**: Todas as tabelas

## Visão Geral das Entidades

### Entidades Principais
1. **Users** - Usuários do sistema
2. **Plans** - Planos de assinatura
3. **Numbers** - Números WhatsApp/instâncias
4. **Campaigns** - Campanhas de marketing
5. **Contacts** - Contatos dos usuários
6. **Messages** - Mensagens das campanhas
7. **Publics** - Públicos/grupos de contatos
8. **Servers** - Servidores de infraestrutura

### Entidades de Relacionamento
9. **PublicByContacts** - Relacionamento público-contato
10. **MessageByContacts** - Relacionamento mensagem-contato
11. **Payments** - Pagamentos e transações
12. **Labels** - Sistema de etiquetas
13. **BlockContacts** - Contatos bloqueados

### Entidades de Configuração
14. **Settings** - Configurações globais
15. **Configurations** - Configurações por usuário
16. **Permissions** - Permissões do sistema

### Entidades Auxiliares
17. **Logs** - Logs do sistema
18. **WebhooksLog** - Logs de webhooks
19. **ScheduledJobs** - Jobs agendados
20. **SimplifiedPublic** - Públicos simplificados
21. **CustomPublics** - Públicos personalizados

### Entidades do Laravel Framework
22. **PasswordResets**, **FailedJobs**, **Jobs**, **PersonalAccessTokens**

## Tabelas Detalhadas

### Tabela: users
```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    stripe_id VARCHAR(255) NULL COMMENT 'ID do cliente no Stripe',
    plan_id INT NULL COMMENT 'FK para plans.id',
    name VARCHAR(255) NOT NULL COMMENT 'Nome do usuário',
    last_name VARCHAR(255) NULL COMMENT 'Sobrenome',
    email VARCHAR(255) NOT NULL UNIQUE COMMENT 'Email único',
    cel VARCHAR(255) NULL COMMENT 'Celular',
    cpfCnpj VARCHAR(100) NULL COMMENT 'CPF ou CNPJ',
    password VARCHAR(255) NOT NULL COMMENT 'Senha hasheada',
    status ENUM('actived','inactived') NOT NULL DEFAULT 'actived' COMMENT 'Status da conta',
    profile ENUM('administrator','user') NOT NULL DEFAULT 'user' COMMENT 'Perfil de acesso',
    active TINYINT NULL DEFAULT 1 COMMENT 'Conta ativa (0=não, 1=sim)',
    photo VARCHAR(255) NULL COMMENT 'URL da foto de perfil',
    confirmed_mail INT NULL DEFAULT 0 COMMENT 'Email confirmado (0=não, 1=sim)',
    email_code_verication VARCHAR(255) NULL COMMENT 'Código de verificação',
    email_verified_at TIMESTAMP NULL COMMENT 'Data de verificação do email',
    remember_token VARCHAR(100) NULL COMMENT 'Token remember me',
    canceled_at TIMESTAMP NULL COMMENT 'Data de cancelamento',
    due_access_at TIMESTAMP NULL COMMENT 'Data de vencimento do acesso',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete'
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- stripe_id: VARCHAR(255), NULLABLE - ID do cliente no Stripe para pagamentos
- plan_id: INT, NULLABLE - Chave estrangeira para o plano ativo
- name: VARCHAR(255), NOT NULL - Nome obrigatório do usuário
- last_name: VARCHAR(255), NULLABLE - Sobrenome opcional
- email: VARCHAR(255), UNIQUE, NOT NULL - Email único obrigatório
- cel: VARCHAR(255), NULLABLE - Número de celular
- cpfCnpj: VARCHAR(100), NULLABLE - Documento (CPF ou CNPJ)
- password: VARCHAR(255), NOT NULL - Senha hasheada com bcrypt
- status: ENUM('actived','inactived'), NOT NULL - Status da conta
- profile: ENUM('administrator','user'), NOT NULL - Nível de acesso
- active: TINYINT, DEFAULT 1 - Flag de conta ativa
- photo: VARCHAR(255), NULLABLE - URL da foto de perfil
- confirmed_mail: INT, DEFAULT 0 - Flag de email confirmado
- email_code_verication: VARCHAR(255), NULLABLE - Código de verificação
- email_verified_at: TIMESTAMP, NULLABLE - Data de verificação
- remember_token: VARCHAR(100), NULLABLE - Token de remember me
- canceled_at: TIMESTAMP, NULLABLE - Data de cancelamento da conta
- due_access_at: TIMESTAMP, NULLABLE - Data de vencimento do acesso

**Índices:**
- PRIMARY KEY (id)
- UNIQUE KEY users_email_unique (email)
- INDEX users_plan_id_index (plan_id)

**Relacionamentos:**
- BelongsTo: Plan (plan_id → plans.id)
- HasMany: Numbers (id → numbers.user_id)
- HasMany: Campaigns (id → campaigns.user_id)
- HasMany: Contacts (id → contacts.user_id)
- HasMany: Payments (id → payments.user_id)

---

### Tabela: plans
```sql
CREATE TABLE plans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code_mp VARCHAR(255) NULL COMMENT 'Código MercadoPago',
    name VARCHAR(255) NOT NULL COMMENT 'Nome do plano',
    value FLOAT(8,2) DEFAULT 0 COMMENT 'Valor original',
    value_promotion FLOAT(8,2) DEFAULT 0 COMMENT 'Valor promocional',
    unlimited BOOLEAN DEFAULT FALSE COMMENT 'Plano ilimitado',
    medias BOOLEAN DEFAULT FALSE COMMENT 'Suporte a mídias',
    reports BOOLEAN DEFAULT FALSE COMMENT 'Relatórios disponíveis',
    schedule BOOLEAN DEFAULT FALSE COMMENT 'Agendamento disponível',
    popular BOOLEAN DEFAULT FALSE COMMENT 'Plano popular',
    code_product VARCHAR(255) NULL COMMENT 'Código do produto Stripe',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete'
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- code_mp: VARCHAR(255), NULLABLE - Código para integração MercadoPago
- name: VARCHAR(255), NOT NULL - Nome descritivo do plano
- value: FLOAT(8,2), DEFAULT 0 - Preço regular do plano
- value_promotion: FLOAT(8,2), DEFAULT 0 - Preço promocional
- unlimited: BOOLEAN, DEFAULT FALSE - Se o plano é ilimitado
- medias: BOOLEAN, DEFAULT FALSE - Se permite envio de mídias
- reports: BOOLEAN, DEFAULT FALSE - Se inclui relatórios
- schedule: BOOLEAN, DEFAULT FALSE - Se permite agendamento
- popular: BOOLEAN, DEFAULT FALSE - Se é marcado como popular
- code_product: VARCHAR(255), NULLABLE - Código do produto no Stripe

**Índices:**
- PRIMARY KEY (id)
- INDEX plans_code_mp_index (code_mp)
- INDEX plans_code_product_index (code_product)

**Relacionamentos:**
- HasMany: Users (id → users.plan_id)
- HasMany: Payments (id → payments.plan_id)

---

### Tabela: numbers
```sql
CREATE TABLE numbers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para users.id',
    server_id BIGINT UNSIGNED NULL COMMENT 'FK para servers.id',
    name VARCHAR(255) NOT NULL COMMENT 'Nome da instância',
    cel VARCHAR(255) NULL COMMENT 'Número do celular',
    photo TEXT NULL COMMENT 'Foto de perfil base64 ou URL',
    instance VARCHAR(255) NOT NULL COMMENT 'Nome da instância WhatsApp',
    status TINYINT NULL DEFAULT 0 COMMENT 'Status: 1=Ativo, 0=Inativo',
    extra TINYINT NULL DEFAULT 0 COMMENT 'Número extra: 1=Sim, 0=Não',
    chat_sync INT NULL DEFAULT 0 COMMENT 'Sincronização de chat',
    status_connection TINYINT NULL DEFAULT 0 COMMENT 'Conexão: 1=Conectado, 0=Desconectado',
    qrcode TEXT NULL COMMENT 'QR Code para conexão',
    qrcode_lastdate TIMESTAMP NULL COMMENT 'Última data do QR Code',
    stripe_code VARCHAR(255) NULL COMMENT 'Código do produto Stripe',
    canceled_at TIMESTAMP NULL COMMENT 'Data de cancelamento',
    labels_active TINYINT NULL DEFAULT 0 COMMENT 'Labels ativas: 1=Sim, 0=Não',
    last_sync_date TIMESTAMP NULL COMMENT 'Última sincronização',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE SET NULL
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- user_id: BIGINT UNSIGNED, NOT NULL - Proprietário do número
- server_id: BIGINT UNSIGNED, NULLABLE - Servidor onde está hospedado
- name: VARCHAR(255), NOT NULL - Nome descritivo da instância
- cel: VARCHAR(255), NULLABLE - Número do WhatsApp
- photo: TEXT, NULLABLE - Foto de perfil (base64 ou URL)
- instance: VARCHAR(255), NOT NULL - Nome único da instância
- status: TINYINT, DEFAULT 0 - Status da instância (ativo/inativo)
- extra: TINYINT, DEFAULT 0 - Se é um número extra pago
- chat_sync: INT, DEFAULT 0 - Configuração de sincronização
- status_connection: TINYINT, DEFAULT 0 - Status de conexão WhatsApp
- qrcode: TEXT, NULLABLE - QR Code para escaneamento
- qrcode_lastdate: TIMESTAMP, NULLABLE - Data do último QR Code
- stripe_code: VARCHAR(255), NULLABLE - Código Stripe para cobrança
- canceled_at: TIMESTAMP, NULLABLE - Data de cancelamento
- labels_active: TINYINT, DEFAULT 0 - Se sistema de labels está ativo
- last_sync_date: TIMESTAMP, NULLABLE - Última sincronização de contatos

**Índices:**
- PRIMARY KEY (id)
- INDEX numbers_user_id_index (user_id)
- INDEX numbers_server_id_index (server_id)
- INDEX numbers_instance_index (instance)
- INDEX numbers_status_connection_index (status_connection)

**Relacionamentos:**
- BelongsTo: User (user_id → users.id)
- BelongsTo: Server (server_id → servers.id)
- HasMany: Campaigns (id → campaigns.number_id)
- HasMany: Labels (id → labels.number_id)

---

### Tabela: campaigns
```sql
CREATE TABLE campaigns (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    public_id BIGINT UNSIGNED NULL COMMENT 'FK para publics.id',
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para users.id',
    number_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para numbers.id',
    name VARCHAR(150) NULL COMMENT 'Nome da campanha',
    type TINYINT DEFAULT 1 COMMENT 'Tipo: 1=Simplificada, 2=Manual',
    schedule_date TIMESTAMP NULL COMMENT 'Data de agendamento',
    total_interactions INT NULL DEFAULT 0 COMMENT 'Total de interações',
    total_read INT NULL DEFAULT 0 COMMENT 'Total de lidas',
    total_delivered INT NULL DEFAULT 0 COMMENT 'Total de entregues',
    total_sent INT NULL DEFAULT 0 COMMENT 'Total de enviadas',
    status TINYINT DEFAULT 0 NULL COMMENT 'Status: 0=Pendente, 1=Executando, 2=Finalizada',
    progress INT DEFAULT 0 NULL COMMENT 'Progresso em porcentagem',
    date_finished TIMESTAMP NULL COMMENT 'Data de finalização',
    date_end TIMESTAMP NULL COMMENT 'Data de término',
    paused TINYINT NULL DEFAULT 0 COMMENT 'Pausada: 1=Sim, 0=Não',
    canceled BOOLEAN DEFAULT 0 COMMENT 'Cancelada: 1=Sim, 0=Não',
    processed_contacts INT NULL DEFAULT 0 COMMENT 'Contatos processados',
    labels TEXT NULL COMMENT 'Labels aplicadas (JSON)',
    total_contacts INT DEFAULT 0 NULL COMMENT 'Total de contatos',
    call TINYINT NULL DEFAULT 0 COMMENT 'Ligações habilitadas: 1=Sim, 0=Não',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete',
    
    FOREIGN KEY (public_id) REFERENCES publics(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (number_id) REFERENCES numbers(id) ON DELETE CASCADE
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- public_id: BIGINT UNSIGNED, NULLABLE - Público alvo (se aplicável)
- user_id: BIGINT UNSIGNED, NOT NULL - Proprietário da campanha
- number_id: BIGINT UNSIGNED, NOT NULL - Número WhatsApp usado
- name: VARCHAR(150), NULLABLE - Nome descritivo da campanha
- type: TINYINT, DEFAULT 1 - Tipo da campanha (1=Simplificada, 2=Manual)
- schedule_date: TIMESTAMP, NULLABLE - Data/hora agendada para execução
- total_interactions: INT, DEFAULT 0 - Contador de interações recebidas
- total_read: INT, DEFAULT 0 - Contador de mensagens lidas
- total_delivered: INT, DEFAULT 0 - Contador de mensagens entregues
- total_sent: INT, DEFAULT 0 - Contador de mensagens enviadas
- status: TINYINT, DEFAULT 0 - Status atual (0=Pendente, 1=Executando, 2=Finalizada)
- progress: INT, DEFAULT 0 - Progresso em porcentagem (0-100)
- date_finished: TIMESTAMP, NULLABLE - Data de finalização real
- date_end: TIMESTAMP, NULLABLE - Data de término prevista
- paused: TINYINT, DEFAULT 0 - Se está pausada
- canceled: BOOLEAN, DEFAULT 0 - Se foi cancelada
- processed_contacts: INT, DEFAULT 0 - Número de contatos já processados
- labels: TEXT, NULLABLE - Labels aplicadas em formato JSON
- total_contacts: INT, DEFAULT 0 - Total de contatos na campanha
- call: TINYINT, DEFAULT 0 - Se permite fazer ligações

**Índices:**
- PRIMARY KEY (id)
- INDEX campaigns_public_id_index (public_id)
- INDEX campaigns_user_id_index (user_id)
- INDEX campaigns_number_id_index (number_id)
- INDEX campaigns_status_index (status)
- INDEX campaigns_schedule_date_index (schedule_date)

**Relacionamentos:**
- BelongsTo: Publics (public_id → publics.id)
- BelongsTo: User (user_id → users.id)
- BelongsTo: Number (number_id → numbers.id)
- HasMany: Messages (id → messages.campaign_id)

---

### Tabela: contacts
```sql
CREATE TABLE contacts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para users.id',
    public_id INT NULL COMMENT 'FK para publics.id',
    number_id INT NULL COMMENT 'FK para numbers.id',
    name VARCHAR(255) NULL COMMENT 'Nome do contato',
    number VARCHAR(255) NOT NULL COMMENT 'Número do contato',
    cel_owner VARCHAR(60) NULL COMMENT 'Número formatado do proprietário',
    description VARCHAR(255) NULL COMMENT 'Descrição/observações',
    variable_1 VARCHAR(250) NULL COMMENT 'Variável personalizada 1',
    variable_2 VARCHAR(250) NULL COMMENT 'Variável personalizada 2',
    variable_3 VARCHAR(250) NULL COMMENT 'Variável personalizada 3',
    type TINYINT DEFAULT 1 NULL COMMENT 'Tipo: 1=Conversas, 2=Upload',
    status TINYINT NULL DEFAULT 1 COMMENT 'Status do contato',
    labels LONGTEXT NULL COMMENT 'Labels aplicadas (JSON)',
    labelsName TEXT NULL COMMENT 'Nomes das labels',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (public_id) REFERENCES publics(id) ON DELETE SET NULL,
    FOREIGN KEY (number_id) REFERENCES numbers(id) ON DELETE SET NULL
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- user_id: BIGINT UNSIGNED, NOT NULL - Proprietário do contato
- public_id: INT, NULLABLE - Público ao qual pertence
- number_id: INT, NULLABLE - Número WhatsApp associado
- name: VARCHAR(255), NULLABLE - Nome do contato
- number: VARCHAR(255), NOT NULL - Número do contato (obrigatório)
- cel_owner: VARCHAR(60), NULLABLE - Número formatado do proprietário
- description: VARCHAR(255), NULLABLE - Descrição ou observações
- variable_1: VARCHAR(250), NULLABLE - Campo customizável 1
- variable_2: VARCHAR(250), NULLABLE - Campo customizável 2
- variable_3: VARCHAR(250), NULLABLE - Campo customizável 3
- type: TINYINT, DEFAULT 1 - Origem (1=Conversas, 2=Upload CSV)
- status: TINYINT, DEFAULT 1 - Status ativo/inativo
- labels: LONGTEXT, NULLABLE - Labels em formato JSON
- labelsName: TEXT, NULLABLE - Nomes das labels para busca

**Índices:**
- PRIMARY KEY (id)
- INDEX contacts_user_id_index (user_id)
- INDEX contacts_public_id_index (public_id)
- INDEX contacts_number_id_index (number_id)
- INDEX contacts_number_index (number)
- INDEX contacts_type_index (type)

**Relacionamentos:**
- BelongsTo: User (user_id → users.id)
- BelongsTo: Publics (public_id → publics.id)
- BelongsTo: Number (number_id → numbers.id)
- HasMany: PublicByContacts (id → public_by_contacts.contact_id)

---

### Tabela: messages
```sql
CREATE TABLE messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para users.id',
    campaign_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para campaigns.id',
    type TINYINT DEFAULT 0 NULL COMMENT 'Tipo de mensagem',
    message TEXT NULL COMMENT 'Conteúdo da mensagem',
    order INT NULL COMMENT 'Ordem na sequência',
    media TEXT NULL COMMENT 'URL ou caminho da mídia',
    media_type TINYINT NULL COMMENT 'Tipo mídia: 1=Áudio, 2=Vídeo, 3=Imagem',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- user_id: BIGINT UNSIGNED, NOT NULL - Proprietário da mensagem
- campaign_id: BIGINT UNSIGNED, NOT NULL - Campanha à qual pertence
- type: TINYINT, DEFAULT 0 - Tipo da mensagem
- message: TEXT, NULLABLE - Conteúdo textual da mensagem
- order: INT, NULLABLE - Ordem na sequência de mensagens
- media: TEXT, NULLABLE - URL ou caminho do arquivo de mídia
- media_type: TINYINT, NULLABLE - Tipo da mídia (1=Áudio, 2=Vídeo, 3=Imagem)

**Índices:**
- PRIMARY KEY (id)
- INDEX messages_user_id_index (user_id)
- INDEX messages_campaign_id_index (campaign_id)
- INDEX messages_order_index (order)

**Relacionamentos:**
- BelongsTo: User (user_id → users.id)
- BelongsTo: Campaign (campaign_id → campaigns.id)
- HasMany: MessageByContacts (id → message_by_contacts.message_id)

---

### Tabela: publics
```sql
CREATE TABLE publics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para users.id',
    number_id INT NULL COMMENT 'FK para numbers.id',
    name VARCHAR(200) NOT NULL COMMENT 'Nome do público',
    photo VARCHAR(255) NULL COMMENT 'Foto do público',
    status TINYINT DEFAULT 0 COMMENT 'Status do público',
    from_chat TINYINT DEFAULT 0 NULL COMMENT 'Criado do chat: 1=Sim, 0=Não',
    from_tag TINYINT NULL DEFAULT 0 COMMENT 'Criado de tag: 1=Sim, 0=Não',
    number VARCHAR(255) NULL COMMENT 'Número associado',
    labels TEXT NULL COMMENT 'Labels aplicadas (JSON)',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (number_id) REFERENCES numbers(id) ON DELETE SET NULL
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- user_id: BIGINT UNSIGNED, NOT NULL - Proprietário do público
- number_id: INT, NULLABLE - Número WhatsApp associado
- name: VARCHAR(200), NOT NULL - Nome descritivo do público
- photo: VARCHAR(255), NULLABLE - Foto/avatar do público
- status: TINYINT, DEFAULT 0 - Status ativo/inativo
- from_chat: TINYINT, DEFAULT 0 - Se foi criado a partir de conversas
- from_tag: TINYINT, DEFAULT 0 - Se foi criado a partir de tags
- number: VARCHAR(255), NULLABLE - Número associado
- labels: TEXT, NULLABLE - Labels aplicadas em formato JSON

**Índices:**
- PRIMARY KEY (id)
- INDEX publics_user_id_index (user_id)
- INDEX publics_number_id_index (number_id)
- INDEX publics_status_index (status)

**Relacionamentos:**
- BelongsTo: User (user_id → users.id)
- BelongsTo: Number (number_id → numbers.id)
- HasMany: Campaigns (id → campaigns.public_id)
- HasMany: Contacts (id → contacts.public_id)
- HasMany: PublicByContacts (id → public_by_contacts.public_id)

---

### Tabela: public_by_contacts
```sql
CREATE TABLE public_by_contacts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NULL COMMENT 'FK para campaigns.id',
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para users.id',
    public_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para publics.id',
    contact_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para contacts.id',
    is_blocked TINYINT DEFAULT 0 NULL COMMENT 'Bloqueado: 1=Sim, 0=Não',
    read TINYINT DEFAULT 0 NULL COMMENT 'Lido: 1=Sim, 0=Não',
    send TINYINT DEFAULT 0 NULL COMMENT 'Enviado: 1=Sim, 0=Não',
    not_receive TINYINT DEFAULT 0 NULL COMMENT 'Não recebido: 1=Sim, 0=Não',
    interactions TINYINT DEFAULT 0 NULL COMMENT 'Interações: 1=Sim, 0=Não',
    has_error TINYINT NULL DEFAULT 0 COMMENT 'Erro: 1=Sim, 0=Não',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete',
    
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (public_id) REFERENCES publics(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- campaign_id: INT, NULLABLE - Campanha associada
- user_id: BIGINT UNSIGNED, NOT NULL - Proprietário
- public_id: BIGINT UNSIGNED, NOT NULL - Público
- contact_id: BIGINT UNSIGNED, NOT NULL - Contato
- is_blocked: TINYINT, DEFAULT 0 - Se contato está bloqueado
- read: TINYINT, DEFAULT 0 - Se mensagem foi lida
- send: TINYINT, DEFAULT 0 - Se mensagem foi enviada
- not_receive: TINYINT, DEFAULT 0 - Se não foi recebida
- interactions: TINYINT, DEFAULT 0 - Se houve interações
- has_error: TINYINT, DEFAULT 0 - Se houve erro no envio

**Índices:**
- PRIMARY KEY (id)
- INDEX public_by_contacts_campaign_id_index (campaign_id)
- INDEX public_by_contacts_user_id_index (user_id)
- INDEX public_by_contacts_public_id_index (public_id)
- INDEX public_by_contacts_contact_id_index (contact_id)
- UNIQUE INDEX public_contact_unique (public_id, contact_id)

**Relacionamentos:**
- BelongsTo: Campaign (campaign_id → campaigns.id)
- BelongsTo: User (user_id → users.id)
- BelongsTo: Publics (public_id → publics.id)
- BelongsTo: Contact (contact_id → contacts.id)

---

### Tabela: payments
```sql
CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para users.id',
    plan_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para plans.id',
    number_id BIGINT UNSIGNED NULL COMMENT 'FK para numbers.id',
    status VARCHAR(150) DEFAULT '0' NULL COMMENT 'Status do pagamento',
    payment_id VARCHAR(150) NULL COMMENT 'ID do pagamento no gateway',
    from VARCHAR(80) NULL COMMENT 'Gateway: stripe, mercadopago',
    amount FLOAT(8,2) DEFAULT 0 COMMENT 'Valor pago',
    extra_number VARCHAR(255) NULL COMMENT 'Código produto número extra',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY (number_id) REFERENCES numbers(id) ON DELETE SET NULL
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- user_id: BIGINT UNSIGNED, NOT NULL - Cliente que pagou
- plan_id: BIGINT UNSIGNED, NOT NULL - Plano adquirido
- number_id: BIGINT UNSIGNED, NULLABLE - Número extra adquirido
- status: VARCHAR(150), DEFAULT '0' - Status do pagamento
- payment_id: VARCHAR(150), NULLABLE - ID do pagamento no gateway
- from: VARCHAR(80), NULLABLE - Gateway usado (stripe, mercadopago)
- amount: FLOAT(8,2), DEFAULT 0 - Valor pago
- extra_number: VARCHAR(255), NULLABLE - Código produto para número extra

**Índices:**
- PRIMARY KEY (id)
- INDEX payments_user_id_index (user_id)
- INDEX payments_plan_id_index (plan_id)
- INDEX payments_payment_id_index (payment_id)
- INDEX payments_status_index (status)

**Relacionamentos:**
- BelongsTo: User (user_id → users.id)
- BelongsTo: Plan (plan_id → plans.id)
- BelongsTo: Number (number_id → numbers.id)

---

### Tabela: servers
```sql
CREATE TABLE servers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(250) NOT NULL COMMENT 'IP do servidor',
    limit INT NULL DEFAULT 15 COMMENT 'Limite de instâncias',
    total INT NULL DEFAULT 0 COMMENT 'Total de instâncias ativas',
    type VARCHAR(255) NULL COMMENT 'Tipo do servidor',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete'
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- ip: VARCHAR(250), NOT NULL - Endereço IP do servidor
- limit: INT, DEFAULT 15 - Limite máximo de instâncias
- total: INT, DEFAULT 0 - Total atual de instâncias ativas
- type: VARCHAR(255), NULLABLE - Tipo/classificação do servidor

**Índices:**
- PRIMARY KEY (id)
- INDEX servers_ip_index (ip)
- INDEX servers_type_index (type)

**Relacionamentos:**
- HasMany: Numbers (id → numbers.server_id)

---

### Tabela: labels
```sql
CREATE TABLE labels (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para users.id',
    number_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para numbers.id',
    name VARCHAR(150) NULL COMMENT 'Nome da label',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (number_id) REFERENCES numbers(id) ON DELETE CASCADE
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- user_id: BIGINT UNSIGNED, NOT NULL - Proprietário da label
- number_id: BIGINT UNSIGNED, NOT NULL - Número WhatsApp associado
- name: VARCHAR(150), NULLABLE - Nome descritivo da label

**Índices:**
- PRIMARY KEY (id)
- INDEX labels_user_id_index (user_id)
- INDEX labels_number_id_index (number_id)
- UNIQUE INDEX labels_user_number_name_unique (user_id, number_id, name)

**Relacionamentos:**
- BelongsTo: User (user_id → users.id)
- BelongsTo: Number (number_id → numbers.id)

---

### Tabela: settings
```sql
CREATE TABLE settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    timer_normal INT NULL COMMENT 'Timer normal em segundos',
    timer_fast INT NULL COMMENT 'Timer rápido em segundos',
    number_value FLOAT(8,2) DEFAULT 0 NULL COMMENT 'Valor do número extra',
    limit_campaign INT NULL COMMENT 'Limite de campanhas',
    hour_open VARCHAR(255) NULL COMMENT 'Hora de abertura',
    hour_close VARCHAR(255) NULL COMMENT 'Hora de fechamento',
    token_wpp VARCHAR(255) NULL COMMENT 'Token WhatsApp',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete'
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- timer_normal: INT, NULLABLE - Intervalo normal entre mensagens (segundos)
- timer_fast: INT, NULLABLE - Intervalo rápido entre mensagens (segundos)
- number_value: FLOAT(8,2), DEFAULT 0 - Preço de número extra
- limit_campaign: INT, NULLABLE - Limite global de campanhas
- hour_open: VARCHAR(255), NULLABLE - Horário de funcionamento (abertura)
- hour_close: VARCHAR(255), NULLABLE - Horário de funcionamento (fechamento)
- token_wpp: VARCHAR(255), NULLABLE - Token global WhatsApp

**Índices:**
- PRIMARY KEY (id)

**Relacionamentos:**
- Nenhum (tabela de configuração global)

---

### Tabela: configurations
```sql
CREATE TABLE configurations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'FK para users.id',
    timer_delay INT DEFAULT 30 COMMENT 'Delay em segundos',
    ddds TEXT NULL COMMENT 'DDDs permitidos (JSON)',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Colunas:**
- id: BIGINT UNSIGNED, PK, AUTO_INCREMENT - Identificador único
- user_id: BIGINT UNSIGNED, NOT NULL - Usuário proprietário
- timer_delay: INT, DEFAULT 30 - Delay personalizado entre mensagens
- ddds: TEXT, NULLABLE - DDDs permitidos em formato JSON

**Índices:**
- PRIMARY KEY (id)
- INDEX configurations_user_id_index (user_id)
- UNIQUE INDEX configurations_user_unique (user_id)

**Relacionamentos:**
- BelongsTo: User (user_id → users.id)

---

### Demais Tabelas

#### simplified_public
Tabela para campanhas simplificadas com estrutura similar a publics.

#### custom_publics
Tabela para públicos personalizados com upload de arquivos.

#### block_contacts
Tabela para controle de contatos bloqueados.

#### message_by_contacts
Tabela de relacionamento entre mensagens e contatos.

#### logs
Tabela de auditoria e logs do sistema.

#### webhooks_log
Tabela para logs de webhooks recebidos.

#### scheduled_jobs
Tabela para controle de jobs agendados.

#### permissions
Tabela de permissões do sistema.

#### password_resets, failed_jobs, jobs, personal_access_tokens
Tabelas padrão do Laravel Framework.

## Relacionamentos Principais

### Relacionamentos 1:N (One-to-Many)
- User → Numbers (1 usuário tem N números)
- User → Campaigns (1 usuário tem N campanhas)
- User → Contacts (1 usuário tem N contatos)
- User → Payments (1 usuário tem N pagamentos)
- Plan → Users (1 plano tem N usuários)
- Plan → Payments (1 plano tem N pagamentos)
- Campaign → Messages (1 campanha tem N mensagens)
- Server → Numbers (1 servidor tem N números)
- Number → Labels (1 número tem N labels)

### Relacionamentos N:M (Many-to-Many)
- Publics ↔ Contacts (via public_by_contacts)
- Messages ↔ Contacts (via message_by_contacts)

### Relacionamentos 1:1 (One-to-One)
- User → Configuration (1 usuário tem 1 configuração)

## Constraints e Validações

### Constraints de Integridade Referencial
- Todas as FKs têm ON DELETE CASCADE ou SET NULL conforme necessário
- Unique constraints em campos críticos (email, tokens)

### Validações de Negócio
- Status enum restrito a valores específicos
- Valores padrão adequados para flags booleanas
- Campos obrigatórios marcados como NOT NULL

### Índices de Performance
- Índices em todas as FKs
- Índices compostos para consultas frequentes
- Índices únicos para evitar duplicatas

Esta documentação fornece a base completa para recriar o banco de dados no NestJS usando TypeORM com todas as relações, constraints e validações preservadas.