# 🚀 PRÓXIMOS PASSOS - Verte NestJS Migration

**Status Atual**: 43.8% (53/121 endpoints)
**Gerado em**: 08/11/2024

---

## 🎯 PRIORIDADE 1: Redis + Bull Queue (3-5 dias)

### Objetivo
Configurar infraestrutura de jobs assíncronos necessária para campanhas e WhatsApp.

### Checklist de Implementação

#### 1. Instalação de Dependências
```bash
npm install --save @nestjs/bull bull
npm install --save redis
npm install --save-dev @types/bull
```

#### 2. Configuração do Redis
```typescript
// src/config/redis.config.ts
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};
```

#### 3. Criar Queue Module
```typescript
// src/queue/queue.module.ts
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: redisConfig,
    }),
    BullModule.registerQueue(
      { name: 'campaigns' },
      { name: 'whatsapp-messages' },
      { name: 'simplified-publics' },
      { name: 'custom-publics' },
    ),
  ],
})
export class QueueModule {}
```

#### 4. Implementar Jobs

**CampaignsJob** (`src/campaigns/jobs/campaigns.processor.ts`):
- [ ] Processar disparo de campanhas agendadas
- [ ] Verificar status do número WhatsApp
- [ ] Enviar mensagens para queue de WhatsApp
- [ ] Atualizar progresso da campanha

**SimplifiedPublicJob** (`src/campaigns/jobs/simplified-public.processor.ts`):
- [ ] Processar criação de público simplificado
- [ ] Filtrar contatos por critérios
- [ ] Criar registros em public_by_contact
- [ ] Atualizar status do público

**CustomPublicJob** (`src/campaigns/jobs/custom-public.processor.ts`):
- [ ] Processar arquivo XLSX
- [ ] Validar e formatar números
- [ ] Criar contatos + relacionamentos
- [ ] Atualizar progresso

**WhatsappMessageJob** (`src/whatsapp/jobs/whatsapp-message.processor.ts`):
- [ ] Enviar mensagem via WAHA API
- [ ] Retry logic (3 tentativas)
- [ ] Atualizar status em message_by_contact
- [ ] Logs detalhados

#### 5. Testes
- [ ] Testar conexão Redis
- [ ] Testar criação de jobs
- [ ] Testar processamento assíncrono
- [ ] Testar retry logic
- [ ] Testar falhas e recovery

#### 6. Documentação
- [ ] Documentar configuração Redis
- [ ] Documentar estrutura de jobs
- [ ] Exemplos de uso

---

## 🎯 PRIORIDADE 2: Módulo WhatsApp/WAHA (7-10 dias)

### Objetivo
Implementar integração completa com WhatsApp via WAHA API.

### Endpoints a Implementar (15 total)

#### Grupo 1: Conexão (3 endpoints)
- [ ] GET /api/v1/connect-whatsapp - Iniciar conexão
- [ ] GET /api/v1/connect-whatsapp-check - Verificar status
- [ ] POST /api/v1/force-check-whatsapp-connections - Forçar verificação

#### Grupo 2: WAHA Session (4 endpoints)
- [ ] POST /api/v1/waha/qr - Gerar QR Code
- [ ] GET /api/v1/waha/sessions/{sessionName} - Status sessão
- [ ] POST /api/v1/waha/disconnect - Desconectar sessão
- [ ] POST /api/v1/disconnect-waha-session - Endpoint público

#### Grupo 3: Webhooks (2 endpoints)
- [ ] POST /api/v1/webhook-whatsapp - Webhook eventos
- [ ] POST /api/v1/webhook-whatsapp-extractor - Webhook extração

#### Grupo 4: Operações (3 endpoints)
- [ ] POST /api/v1/whatsapp/{instance}/poll - Enviar enquete
- [ ] GET /api/v1/whatsapp/{instance}/settings - Obter configs
- [ ] POST /api/v1/whatsapp/{instance}/settings - Atualizar configs

#### Grupo 5: Mensagens (3 endpoints)
- [ ] POST /api/v1/whatsapp/{instance}/send-text - Enviar texto
- [ ] POST /api/v1/whatsapp/{instance}/send-media - Enviar mídia
- [ ] POST /api/v1/whatsapp/{instance}/send-file - Enviar arquivo

### Estrutura do Módulo

```
src/whatsapp/
├── whatsapp.module.ts
├── whatsapp.controller.ts
├── whatsapp.service.ts
├── waha/
│   ├── waha.service.ts          # Integração WAHA API
│   ├── waha-client.service.ts   # HTTP client
│   └── waha.types.ts            # Types WAHA
├── dto/
│   ├── connect.dto.ts
│   ├── send-message.dto.ts
│   ├── send-poll.dto.ts
│   └── settings.dto.ts
├── jobs/
│   └── whatsapp-message.processor.ts
└── webhooks/
    ├── webhook.controller.ts
    └── webhook.service.ts
```

### Checklist de Implementação

#### 1. Criar Módulo Base
- [ ] WhatsappModule
- [ ] WhatsappController
- [ ] WhatsappService

#### 2. Integração WAHA
- [ ] WahaService (API client)
- [ ] Métodos de conexão
- [ ] Métodos de envio
- [ ] QR Code generation
- [ ] Session management

#### 3. DTOs e Validação
- [ ] ConnectDto
- [ ] SendMessageDto
- [ ] SendPollDto
- [ ] SettingsDto
- [ ] WebhookDto

#### 4. Webhooks
- [ ] WebhookController (endpoints públicos)
- [ ] WebhookService (processamento)
- [ ] Validação de payloads
- [ ] Logs de eventos

#### 5. Jobs Assíncronos
- [ ] WhatsappMessageJob
- [ ] Retry logic robusto
- [ ] Update status messages

#### 6. Testes E2E
- [ ] Conexão/desconexão (5 testes)
- [ ] QR Code (3 testes)
- [ ] Envio de mensagens (10 testes)
- [ ] Webhooks (15 testes)
- [ ] Settings (5 testes)
- [ ] Polls (5 testes)
- [ ] Error handling (7 testes)
**Total**: 50+ testes

#### 7. Documentação
- [ ] Swagger completo
- [ ] Guia de integração WAHA
- [ ] Exemplos de webhooks

### Referência Laravel
Consultar: `../verte-back/app/Http/Controllers/WhatsappController.php`

---

## 🎯 PRIORIDADE 3: Módulo Payments (5-7 dias)

### Objetivo
Implementar sistema de pagamentos com Stripe e MercadoPago.

### Entidades a Criar

#### Payment Entity
```typescript
// src/database/entities/payment.entity.ts
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  plan_id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentStatus })
  status: PaymentStatus; // pending, paid, failed, refunded

  @Column({ type: 'enum', enum: PaymentGateway })
  gateway: PaymentGateway; // stripe, mercadopago

  @Column({ nullable: true })
  gateway_payment_id: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

#### Transaction Entity
```typescript
// src/database/entities/transaction.entity.ts
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  payment_id: number;

  @Column()
  type: string; // payment, refund, chargeback

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'json' })
  gateway_data: any;

  @CreateDateColumn()
  created_at: Date;
}
```

### Endpoints a Implementar (5 total)

- [ ] POST /api/v1/payments/create - Criar pagamento
- [ ] POST /api/v1/payments/webhook/stripe - Webhook Stripe
- [ ] POST /api/v1/payments/webhook/mercadopago - Webhook MercadoPago
- [ ] GET /api/v1/payments/history - Histórico
- [ ] GET /api/v1/payments/status/{id} - Status

### Estrutura do Módulo

```
src/payments/
├── payments.module.ts
├── payments.controller.ts
├── payments.service.ts
├── gateways/
│   ├── stripe/
│   │   ├── stripe.service.ts
│   │   └── stripe-webhook.controller.ts
│   └── mercadopago/
│       ├── mercadopago.service.ts
│       └── mercadopago-webhook.controller.ts
├── dto/
│   ├── create-payment.dto.ts
│   └── payment-response.dto.ts
└── entities/
    ├── payment.entity.ts
    └── transaction.entity.ts
```

### Checklist de Implementação

#### 1. Configuração
- [ ] Instalar Stripe SDK: `npm install stripe`
- [ ] Instalar MercadoPago SDK: `npm install mercadopago`
- [ ] Configurar keys em .env

#### 2. Entidades
- [ ] Payment entity
- [ ] Transaction entity
- [ ] Enums (PaymentStatus, PaymentGateway)

#### 3. Services
- [ ] PaymentsService (lógica principal)
- [ ] StripeService (integração Stripe)
- [ ] MercadoPagoService (integração MP)

#### 4. Endpoints
- [ ] POST /create - Criar pagamento
- [ ] GET /history - Histórico
- [ ] GET /status/{id} - Status

#### 5. Webhooks
- [ ] POST /webhook/stripe
  - Validar assinatura
  - Processar eventos
  - Atualizar status pagamento
  - Logs detalhados
- [ ] POST /webhook/mercadopago
  - Validar assinatura
  - Processar notificações
  - Atualizar status pagamento
  - Logs detalhados

#### 6. Lógica de Negócio
- [ ] Criar pagamento no gateway
- [ ] Atualizar plano do usuário após confirmação
- [ ] Enviar email de confirmação
- [ ] Handle refunds
- [ ] Handle chargebacks

#### 7. Testes E2E
- [ ] Criar pagamento (5 testes)
- [ ] Webhooks Stripe (5 testes)
- [ ] Webhooks MercadoPago (5 testes)
- [ ] Histórico (3 testes)
- [ ] Status (2 testes)
**Total**: 20+ testes

#### 8. Segurança
- [ ] Validar assinaturas webhooks
- [ ] Rate limiting em webhooks
- [ ] Logs de todas as transações
- [ ] Retry logic para falhas

#### 9. Documentação
- [ ] Swagger completo
- [ ] Guia de webhooks
- [ ] Fluxo de pagamento
- [ ] Ambientes sandbox/produção

### Referência Laravel
Consultar: `../verte-back/app/Http/Controllers/PaymentController.php`

---

## 📋 CHECKLIST GERAL POR SPRINT

### Sprint 1 (Semanas 1-3): Integrações Críticas

**Semana 1: Redis + Bull**
- [x] Dia 1-2: Setup Redis + Bull
- [x] Dia 3-4: Implementar Jobs
- [x] Dia 5: Testes + Docs

**Semana 2: WhatsApp Parte 1**
- [x] Dia 1-2: Estrutura módulo + WAHA client
- [x] Dia 3-4: Endpoints de conexão (7 endpoints)
- [x] Dia 5: Webhooks (2 endpoints)

**Semana 3: WhatsApp Parte 2 + Payments**
- [x] Dia 1-2: Endpoints mensagens/polls (6 endpoints)
- [x] Dia 3: Testes E2E WhatsApp
- [x] Dia 4-5: Payments (setup + 3 endpoints principais)

### Sprint 2 (Semanas 4-5): Admin & Features

**Semana 4: Admin**
- [x] Dia 1-2: AdminGuard + Dashboard
- [x] Dia 3-4: Endpoints admin (16 endpoints)
- [x] Dia 5: Testes E2E

**Semana 5: Finalizações**
- [x] Dia 1-2: Números Extras (8 endpoints)
- [x] Dia 3-5: Utilities essenciais (24 endpoints)

### Sprint 3 (Semanas 6-8): Deploy

**Semana 6: Testes**
- [x] Testes de compatibilidade 100%
- [x] Performance testing
- [x] Load testing

**Semana 7-8: Deploy**
- [x] Docker setup
- [x] CI/CD
- [x] Deploy staging
- [x] Testes em staging
- [x] Deploy produção
- [x] Monitoramento

---

## 🎓 CONVENÇÕES E PADRÕES

### Sempre Fazer
- ✅ Consultar código Laravel original antes de implementar
- ✅ Manter compatibilidade 100% (responses idênticos)
- ✅ Escrever testes E2E para cada endpoint
- ✅ Documentar no Swagger
- ✅ Validações em português
- ✅ Usar enums do banco de dados
- ✅ Soft deletes sempre
- ✅ Logs detalhados em integrações

### Nunca Fazer
- ❌ Alterar estrutura de responses
- ❌ Criar novas tabelas sem autorização
- ❌ Ignorar validações do Laravel
- ❌ Commit sem testes passando
- ❌ Deploy sem validação 100%

### Workflow de Desenvolvimento
1. Ler código Laravel
2. Criar/atualizar entidades TypeORM
3. Criar DTOs com validações
4. Implementar Service (lógica idêntica)
5. Implementar Controller
6. Documentar Swagger
7. Escrever testes E2E
8. Validar compatibilidade 100%
9. Commit + Push

---

## 📊 MÉTRICAS DE SUCESSO

### Sprint 1 (Meta: 60%)
- [ ] Redis + Bull funcionando
- [ ] 15 endpoints WhatsApp implementados
- [ ] 5 endpoints Payments implementados
- [ ] 70+ testes E2E novos (total ~285)
- [ ] 73/121 endpoints (60.3%)

### Sprint 2 (Meta: 100%)
- [ ] 16 endpoints Admin implementados
- [ ] 8 endpoints Números implementados
- [ ] 24 endpoints Utilities implementados
- [ ] 110+ testes E2E novos (total ~395)
- [ ] 121/121 endpoints (100%)

### Sprint 3 (Meta: Deploy ✅)
- [ ] 100% de compatibilidade validada
- [ ] Performance aceitável (< 200ms p95)
- [ ] 0 erros críticos em staging
- [ ] Deploy produção realizado
- [ ] Monitoramento ativo

---

## 🆘 SUPORTE E RECURSOS

### Documentação
- `docs/migration/` - Specs de migração
- `CLAUDE.md` - Instruções para IA
- `VALIDATION-CHECKLIST.md` - Checklist de validação

### Comandos Úteis
```bash
# Desenvolvimento
npm run start:dev

# Testes
npm run test:e2e

# Validação completa
npm run validate:full

# TypeCheck
npm run typecheck

# Build
npm run build
```

### Referências
- Laravel Original: `../verte-back/`
- Routes Inventory: `docs/migration/routes-inventory.md`
- Business Rules: `docs/migration/business-rules.md`

---

**Última atualização**: 08/11/2024
**Próxima revisão**: Após Sprint 1 (em 3 semanas)
