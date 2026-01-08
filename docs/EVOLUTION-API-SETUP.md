# Evolution API - Guia de Configuração e Uso

## 📋 Índice

1. [Sobre a Migração](#sobre-a-migração)
2. [Pré-requisitos](#pré-requisitos)
3. [Instalação e Configuração](#instalação-e-configuração)
4. [Iniciar Evolution API](#iniciar-evolution-api)
5. [Conectar WhatsApp (QR Code)](#conectar-whatsapp-qr-code)
6. [Endpoints Disponíveis](#endpoints-disponíveis)
7. [Arquitetura Desacoplada](#arquitetura-desacoplada)
8. [FAQ](#faq)

---

## Sobre a Migração

### 🔄 Histórico de Migrações

**WAHA → WhatsApp Cloud API → Evolution API**

1. **WAHA** (versão inicial)
   - ❌ Core (gratuito) suporta apenas **1 sessão global**
   - ❌ Problemas com QR Code e conectividade
   - ❌ Limitações para SaaS multi-usuário

2. **WhatsApp Cloud API** (Meta/Facebook)
   - ❌ Requer **aprovação Meta** (1-3 dias)
   - ❌ **Não suporta QR Code** para números pessoais
   - ❌ Apenas para WhatsApp Business

3. **Evolution API v2** (solução atual) ✅
   - ✅ **Múltiplas sessões** (cada usuário com seu próprio número)
   - ✅ **QR Code** para conexão (não precisa aprovação)
   - ✅ **Open-source** e auto-hospedável
   - ✅ **Gratuito** e sem limitações
   - ✅ **API completa** (mensagens, mídia, webhooks, etc)

---

## Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 18+ instalado
- Porta 8080 disponível (Evolution API)
- PostgreSQL e Redis (via Docker)

---

## Instalação e Configuração

### Passo 1: Configurar Variáveis de Ambiente

Edite o arquivo `.env`:

```bash
# Evolution API (WhatsApp Multi-Sessão com QR Code)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=change-me-to-secure-api-key  # ⚠️ ALTERE PARA SUA API KEY
```

**⚠️ IMPORTANTE**: Altere `EVOLUTION_API_KEY` para uma chave segura e única!

### Passo 2: Configurar Docker (Opcional - Customização)

O arquivo `docker-compose.evolution-api.yml` já está pré-configurado com:
- Evolution API v2.1.1
- PostgreSQL 15 (porta 5433)
- Redis 7 (porta 6380)

Se quiser customizar, edite o arquivo conforme necessário.

---

## Iniciar Evolution API

### Iniciar via Docker Compose

```bash
# Iniciar Evolution API + PostgreSQL + Redis
docker-compose -f docker-compose.evolution-api.yml up -d

# Verificar logs
docker-compose -f docker-compose.evolution-api.yml logs -f evolution-api

# Parar serviços
docker-compose -f docker-compose.evolution-api.yml down
```

### Verificar se está rodando

```bash
# Teste de health check
curl http://localhost:8080/

# Deve retornar: "Welcome to the Evolution API..."
```

---

## Conectar WhatsApp (QR Code)

### Fluxo de Conexão

```
1. POST /api/v1/whatsapp/setup
   └─> Cria instância e retorna QR Code

2. Escanear QR Code no WhatsApp
   └─> WhatsApp conecta automaticamente

3. GET /api/v1/whatsapp/status
   └─> Verifica se está conectado
```

### Exemplo: Criar Instância e Obter QR Code

```bash
curl -X POST http://localhost:3000/api/v1/whatsapp/setup \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "meu_whatsapp_principal",
    "name": "WhatsApp Principal",
    "webhookUrl": "https://meu-dominio.com/api/v1/whatsapp/webhook"
  }'
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "WhatsApp configurado. Escaneie o QR Code para conectar seu número.",
  "number": {
    "id": 1,
    "name": "WhatsApp Principal",
    "instance_name": "meu_whatsapp_principal",
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "status": "qr"
  }
}
```

### Obter QR Code Atualizado

Se o QR Code expirar (30 segundos), obtenha um novo:

```bash
curl -X GET http://localhost:3000/api/v1/whatsapp/qrcode/1 \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

**Resposta:**
```json
{
  "success": true,
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "instance_name": "meu_whatsapp_principal"
}
```

### Verificar Status de Conexão

```bash
curl -X GET http://localhost:3000/api/v1/whatsapp/status \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

**Resposta (conectado):**
```json
{
  "connected": true,
  "status": "connected",
  "phone_number": "5511999999999",
  "profile_name": "Meu Nome",
  "instance_name": "meu_whatsapp_principal"
}
```

---

## Endpoints Disponíveis

### 1. POST /api/v1/whatsapp/setup
Criar instância WhatsApp e gerar QR Code

```json
{
  "instanceName": "user_123_whatsapp",
  "name": "WhatsApp Principal",
  "webhookUrl": "https://meu-dominio.com/webhook"
}
```

### 2. GET /api/v1/whatsapp/qrcode/:number
Obter QR Code atualizado para conexão

### 3. GET /api/v1/whatsapp/status
Verificar status de conexão

### 4. POST /api/v1/whatsapp/send-text
Enviar mensagem de texto

```json
{
  "number_id": 1,
  "to": "5511999999999",
  "text": "Olá! Esta é uma mensagem de teste."
}
```

### 5. POST /api/v1/whatsapp/send-image
Enviar imagem

```json
{
  "number_id": 1,
  "to": "5511999999999",
  "image_url": "https://example.com/image.jpg",
  "caption": "Legenda da imagem"
}
```

### 6. GET /api/v1/numbers
Listar números WhatsApp do usuário

### 7. GET /api/v1/numbers/:number
Mostrar detalhes de número específico

### 8. DELETE /api/v1/numbers/:number
Remover número (soft delete + deletar instância no Evolution API)

### 9. GET /api/v1/whatsapp/webhook
Verificação de webhook

### 10. POST /api/v1/whatsapp/webhook
Receber eventos do WhatsApp (mensagens, status, conexão)

---

## Arquitetura Desacoplada

### 🎯 Design Pattern: Provider Interface

O sistema foi **refatorado** para usar uma **arquitetura desacoplada**, permitindo **trocar facilmente** entre diferentes providers WhatsApp.

#### Interface Abstrata

```typescript
// src/whatsapp/providers/whatsapp-provider.interface.ts
export interface IWhatsAppProvider {
  readonly providerName: string;
  readonly providerVersion: string;

  createInstance(options: CreateInstanceOptions): Promise<WhatsAppInstanceInfo>;
  getInstanceStatus(instanceName: string): Promise<WhatsAppInstanceInfo>;
  deleteInstance(instanceName: string): Promise<{ success: boolean }>;
  getQRCode(instanceName: string): Promise<{ qr: string }>;
  sendText(instanceName: string, options: SendTextOptions): Promise<SendMessageResult>;
  sendMedia(instanceName: string, options: SendMediaOptions): Promise<SendMessageResult>;
  // ... outros métodos
}
```

#### Provider Atual: Evolution API

```typescript
// src/whatsapp/providers/evolution-api.provider.ts
@Injectable()
export class EvolutionApiProvider implements IWhatsAppProvider {
  readonly providerName = 'evolution-api';
  readonly providerVersion = 'v2';

  // Implementação completa de todos os métodos
}
```

### Como Trocar de Provider

**É MUITO SIMPLES!** Basta alterar **1 linha** no módulo:

```typescript
// src/whatsapp/whatsapp.module.ts
@Module({
  providers: [
    WhatsappService,
    EvolutionApiProvider,      // Provider concreto
    {
      provide: WHATSAPP_PROVIDER,
      useClass: EvolutionApiProvider,  // ✅ TROCAR AQUI
    },
  ],
})
export class WhatsappModule {}
```

**Exemplo**: Para trocar para WAHA:

```typescript
import { WahaProvider } from './providers/waha.provider';

@Module({
  providers: [
    WhatsappService,
    WahaProvider,               // Novo provider
    {
      provide: WHATSAPP_PROVIDER,
      useClass: WahaProvider,   // ✅ Trocar para WahaProvider
    },
  ],
})
export class WhatsappModule {}
```

**Vantagens**:
- ✅ **Zero mudanças** no WhatsappService
- ✅ **Zero mudanças** no WhatsappController
- ✅ **Zero mudanças** na lógica de negócio
- ✅ Apenas implementar a interface `IWhatsAppProvider`

---

## FAQ

### 1. Como criar múltiplas instâncias para diferentes usuários?

Cada usuário pode ter **múltiplas instâncias**. Basta chamar `/whatsapp/setup` com diferentes `instanceName`:

```bash
# Usuário 1 - WhatsApp Pessoal
POST /whatsapp/setup { "instanceName": "user_1_personal" }

# Usuário 1 - WhatsApp Trabalho
POST /whatsapp/setup { "instanceName": "user_1_work" }

# Usuário 2 - WhatsApp Pessoal
POST /whatsapp/setup { "instanceName": "user_2_personal" }
```

### 2. O QR Code expira?

**Sim**, após **30 segundos**. Use `GET /whatsapp/qrcode/:number` para obter um novo.

### 3. Preciso escanear QR Code toda vez que reiniciar?

**Não**! Após conectar uma vez, a sessão fica salva no Evolution API (PostgreSQL + Redis). Apenas escaneie novamente se desconectar.

### 4. Como receber mensagens dos clientes?

Configure o `webhookUrl` ao criar a instância:

```json
{
  "instanceName": "my_instance",
  "webhookUrl": "https://meu-dominio.com/api/v1/whatsapp/webhook"
}
```

Evolution API enviará eventos para este webhook quando receber mensagens.

### 5. Posso usar em produção?

**Sim!** Evolution API é usado em produção por milhares de projetos. Recomendações:
- Use HTTPS para a API
- Configure autenticação forte (`EVOLUTION_API_KEY`)
- Monitore logs e performance
- Configure backup do PostgreSQL

### 6. Como atualizar Evolution API?

```bash
# Parar containers
docker-compose -f docker-compose.evolution-api.yml down

# Editar docker-compose.evolution-api.yml
# Alterar: image: atendai/evolution-api:v2.1.1 → v2.2.0

# Iniciar novamente
docker-compose -f docker-compose.evolution-api.yml up -d
```

### 7. Como trocar para outro provider WhatsApp?

Veja seção [Arquitetura Desacoplada](#arquitetura-desacoplada). Basta:
1. Criar classe que implementa `IWhatsAppProvider`
2. Alterar `useClass` no `WhatsappModule`
3. Pronto! 🎉

### 8. Diferenças entre WAHA, Cloud API e Evolution API

| Recurso | WAHA Core | Cloud API | Evolution API |
|---------|-----------|-----------|---------------|
| QR Code | ✅ | ❌ | ✅ |
| Múltiplas sessões | ❌ (só 1) | ✅ | ✅ |
| Aprovação Meta | ❌ | ✅ Requer | ❌ |
| Open-source | ✅ | ❌ | ✅ |
| Auto-hospedável | ✅ | ❌ | ✅ |
| Custo | Grátis (1 sessão) | Grátis (janela 24h) | **Grátis** |
| Estabilidade | ⚠️ Médio | ✅ Alta | ✅ Alta |

---

## Recursos Úteis

- [Documentação Oficial Evolution API v2](https://doc.evolution-api.com/v2)
- [GitHub Evolution API](https://github.com/EvolutionAPI/evolution-api)
- [Docker Hub](https://hub.docker.com/r/atendai/evolution-api)
- [Swagger API Evolution](http://localhost:8080/docs)

---

## Suporte

Se tiver problemas:

1. Verifique se Evolution API está rodando: `curl http://localhost:8080/`
2. Verifique logs: `docker-compose -f docker-compose.evolution-api.yml logs -f`
3. Verifique `.env`: `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`
4. Consulte documentação oficial: https://doc.evolution-api.com/v2

---

**Última atualização**: Novembro 2024
**Provider atual**: Evolution API v2.1.1
**Status**: ✅ Migração completa - Arquitetura desacoplada implementada
