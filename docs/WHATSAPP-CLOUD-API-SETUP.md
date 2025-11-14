# WhatsApp Cloud API - Guia de Configuração

## 📋 Índice

1. [Sobre a Migração](#sobre-a-migração)
2. [Pré-requisitos](#pré-requisitos)
3. [Passo 1: Criar WhatsApp Business App](#passo-1-criar-whatsapp-business-app)
4. [Passo 2: Obter Phone Number ID](#passo-2-obter-phone-number-id)
5. [Passo 3: Obter System User Access Token](#passo-3-obter-system-user-access-token)
6. [Passo 4: Configurar no Sistema](#passo-4-configurar-no-sistema)
7. [Passo 5: Configurar Webhooks (Opcional)](#passo-5-configurar-webhooks-opcional)
8. [FAQ](#faq)

---

## Sobre a Migração

### ⚠️ Mudança Importante: WAHA → WhatsApp Cloud API

O sistema foi migrado de **WAHA** para **WhatsApp Cloud API oficial da Meta**.

**Motivos da mudança:**
- ❌ WAHA Core (gratuito) suporta apenas **1 sessão**
- ❌ Problemas com QR Code e conectividade
- ❌ Requer servidor adicional rodando

**Vantagens da nova solução:**
- ✅ **Múltiplas sessões** (cada usuário tem seu próprio número)
- ✅ **Não precisa de QR Code** (usa Phone Number ID + Access Token)
- ✅ **API oficial da Meta** (mais estável e segura)
- ✅ **Gratuito** para mensagens de resposta (janela de 24h)
- ✅ **Não requer servidor adicional**

---

## Pré-requisitos

- Conta de negócios no Facebook Business Manager
- Número de telefone verificado
- Acesso à [Meta for Developers](https://developers.facebook.com/)

---

## Passo 1: Criar WhatsApp Business App

1. Acesse [Facebook for Developers](https://developers.facebook.com/apps)
2. Clique em **"Create App"**
3. Selecione **"Business"** como tipo de app
4. Preencha:
   - **App Name**: Nome do seu aplicativo (ex: "Verte WhatsApp")
   - **App Contact Email**: Seu email
5. Clique em **"Create App"**

6. No dashboard do app, vá em **"Add Product"**
7. Localize **"WhatsApp"** e clique em **"Set Up"**

---

## Passo 2: Obter Phone Number ID

1. No dashboard do WhatsApp Business, vá em **"API Setup"**
2. Na seção **"From"**, você verá:
   ```
   Phone number ID: 123456789012345
   ```
3. **Copie este Phone Number ID** - você precisará dele!

---

## Passo 3: Obter System User Access Token

### Opção A: Temporary Access Token (Desenvolvimento)

1. No dashboard do WhatsApp, vá em **"API Setup"**
2. Clique em **"Generate Access Token"**
3. **Copie o token** (começa com `EAAJB...`)
4. ⚠️ **Atenção**: Este token expira em 24h - apenas para testes!

### Opção B: Permanent System User Token (Produção) ✅ RECOMENDADO

1. Vá em [Meta Business Settings](https://business.facebook.com/settings)
2. No menu lateral, clique em **"Users" → "System Users"**
3. Clique em **"Add"** para criar novo System User
4. Preencha:
   - **Name**: "Verte System User"
   - **Role**: "Admin"
5. Clique em **"Create System User"**

6. Clique no System User criado
7. Clique em **"Generate New Token"**
8. Selecione seu app WhatsApp
9. Selecione as permissões:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
10. Clique em **"Generate Token"**
11. **COPIE E SALVE O TOKEN** - ele não será mostrado novamente!

---

## Passo 4: Configurar no Sistema

### Via API (Recomendado)

Faça uma requisição POST para configurar o WhatsApp:

```bash
curl -X POST http://localhost:3000/api/v1/whatsapp/setup \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "123456789012345",
    "access_token": "EAAJB...",
    "name": "Meu WhatsApp Principal"
  }'
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "WhatsApp configurado com sucesso",
  "number": {
    "id": 1,
    "name": "Meu WhatsApp Principal",
    "phone_number": "+5511999999999",
    "verified_name": "Minha Empresa",
    "quality_rating": "GREEN"
  }
}
```

### Via Frontend (em desenvolvimento)

1. Faça login no sistema
2. Vá em **"Configurações → WhatsApp"**
3. Cole o **Phone Number ID**
4. Cole o **Access Token**
5. Clique em **"Conectar"**

---

## Passo 5: Configurar Webhooks (Opcional)

Para receber mensagens dos clientes, configure o webhook:

1. No dashboard do WhatsApp, vá em **"Configuration"**
2. Em **"Webhook"**, clique em **"Edit"**
3. Configure:
   - **Callback URL**: `https://seu-dominio.com/api/v1/whatsapp/webhook`
   - **Verify Token**: `verte_webhook_token_2024` (ou o valor do seu `.env`)
4. Clique em **"Verify and Save"**

5. Em **"Webhook fields"**, marque:
   - ✅ **messages** (receber mensagens)
   - ✅ **message_status** (status de entrega)
6. Salve as configurações

---

## FAQ

### 1. Posso ter múltiplos usuários com WhatsApp?

**Sim!** Cada usuário pode ter seu próprio Phone Number ID e Access Token.

### 2. O token expira?

- **Temporary Token**: Expira em 24h (apenas para testes)
- **System User Token**: **Nunca expira** ✅

### 3. Preciso pagar para usar a API?

- **Gratuito**: Mensagens de resposta (janela de 24h após cliente enviar mensagem)
- **Pago**: Mensagens iniciadas pelo negócio (templates)

Veja preços: https://developers.facebook.com/docs/whatsapp/pricing

### 4. Como enviar a primeira mensagem para um cliente?

Use um **template aprovado**:

```bash
curl -X POST http://localhost:3000/api/v1/whatsapp/send-template \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number_id": 1,
    "to": "+5511999999999",
    "template_name": "hello_world",
    "language_code": "pt_BR"
  }'
```

Após o cliente responder, você pode enviar mensagens de texto normais.

### 5. Como criar templates?

1. No dashboard do WhatsApp, vá em **"Message Templates"**
2. Clique em **"Create Template"**
3. Preencha nome, categoria e conteúdo
4. Envie para aprovação (pode levar até 24h)

### 6. O que mudou em relação ao WAHA?

| Recurso | WAHA | WhatsApp Cloud API |
|---------|------|-------------------|
| QR Code | ✅ Necessário | ❌ Não usa |
| Múltiplas sessões | ❌ Só na versão paga | ✅ Grátis |
| Servidor adicional | ✅ Necessário | ❌ Não precisa |
| Estabilidade | ⚠️ Instável | ✅ Muito estável |
| Custo | Grátis (1 sessão) | Grátis (mensagens de resposta) |

### 7. Como testar?

Use o número de teste fornecido pela Meta:

1. No dashboard, vá em **"API Setup"**
2. Em **"Test number"**, você verá um número de teste
3. Use este número para testar o envio de mensagens

---

## Recursos Úteis

- [Documentação Oficial](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Get Started Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Pricing](https://developers.facebook.com/docs/whatsapp/pricing)

---

## Suporte

Se tiver problemas:

1. Verifique os logs do backend: `npm run start:dev`
2. Confira a documentação oficial da Meta
3. Abra um issue no repositório
