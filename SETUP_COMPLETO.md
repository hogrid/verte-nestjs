# ✅ Setup Completo - QR Code via Webhook

## Status: PRONTO PARA TESTAR

Todas as configurações foram aplicadas e o sistema está pronto para uso.

## 📋 Checklist de Configuração

### ✅ 1. Ambiente (.env)
```env
APP_URL=http://host.docker.internal:3000
```
**Configurado!** Evolution API (Docker) consegue acessar o backend via `host.docker.internal`

### ✅ 2. Backend NestJS
- **Status**: Rodando em `http://localhost:3000`
- **PID**: Verifique com `lsof -i:3000`
- **Logs**: `/tmp/backend.log`

### ✅ 3. Evolution API
- **Status**: Rodando em `http://localhost:8080`
- **Versão**: 2.1.1
- **Container**: `evolution_api`

### ✅ 4. Código Backend
- **WhatsApp Service**: Configurado para webhooks
- **Evolution Provider**: Removido polling inútil
- **Webhook Handler**: Implementado para evento `qrcode.updated`

## 🧪 Como Testar

### Opção 1: Via Frontend (Recomendado)

1. **Acesse o frontend**
   ```bash
   # Certifique-se que o frontend está rodando
   cd ../verte-front
   npm run dev
   ```

2. **Faça login**
   - URL: `http://localhost:5173` (ou porta do frontend)
   - Email: `admin@verte.com`
   - Senha: `password`

3. **Vá para página de WhatsApp**
   - Menu > WhatsApp > Conectar

4. **Clique em "Conectar WhatsApp"**
   - Backend criará instância
   - Evolution API gerará QR Code
   - Webhook enviará QR Code para backend
   - Frontend fará polling e exibirá QR Code

5. **Monitore os logs do backend**
   ```bash
   tail -f /tmp/backend.log | grep -i "qrcode\|webhook"
   ```

   **Logs esperados:**
   ```
   📡 QR Code será enviado via webhook (evento QRCODE_UPDATED)
   📥 Webhook recebido { event: 'qrcode.updated' }
   🔥 QR Code recebido via webhook!
   ✅ QR Code salvo no banco para number_id: X
   ```

### Opção 2: Via API (Teste Manual)

1. **Obter token de autenticação**
   ```bash
   TOKEN=$(curl -s -X POST "http://localhost:3000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@verte.com",
       "password": "password"
     }' | jq -r '.token')

   echo "Token: $TOKEN"
   ```

2. **Criar instância WhatsApp**
   ```bash
   RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/whatsapp/setup" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "instanceName": "meu_whatsapp",
       "name": "WhatsApp Principal"
     }')

   echo "$RESPONSE" | jq .

   # Salvar NUMBER_ID para próximo passo
   NUMBER_ID=$(echo "$RESPONSE" | jq -r '.number.id')
   echo "Number ID: $NUMBER_ID"
   ```

3. **Aguardar webhook (15-30 segundos)**
   ```bash
   echo "Aguardando QR Code via webhook..."
   sleep 15
   ```

4. **Buscar QR Code do banco**
   ```bash
   curl -s -X GET "http://localhost:3000/api/v1/whatsapp/qrcode/$NUMBER_ID" \
     -H "Authorization: Bearer $TOKEN" | jq .
   ```

   **Resposta esperada:**
   ```json
   {
     "success": true,
     "qr_code": "data:image/png;base64,iVBORw0KG...",
     "instance_name": "meu_whatsapp"
   }
   ```

## 🔍 Verificação e Troubleshooting

### 1. Verificar Backend está rodando
```bash
curl http://localhost:3000/
# Deve retornar: Hello World!
```

### 2. Verificar Evolution API está rodando
```bash
curl http://localhost:8080/ | jq .
# Deve retornar status 200
```

### 3. Verificar webhooks estão sendo recebidos
```bash
tail -f /tmp/backend.log | grep "📥 Webhook recebido"
```

### 4. Verificar banco de dados
```bash
mysql -h localhost -P 5306 -u root -pyPiS83D8iN VerteApp -e \
  "SELECT id, name, instance, qrcode IS NOT NULL as has_qrcode, created_at
   FROM numbers
   ORDER BY id DESC
   LIMIT 5;"
```

## ⚠️ Problemas Conhecidos e Soluções

### Problema: QR Code retorna null

**Possíveis causas:**

1. **Webhook não está sendo enviado pela Evolution API**
   - Verificar logs da Evolution API: `docker logs evolution_api --tail 100`
   - Verificar se webhook está configurado na instância

2. **Webhook não consegue acessar o backend**
   - Verificar `APP_URL` no `.env`
   - Testar conectividade:
     ```bash
     docker exec evolution_api curl http://host.docker.internal:3000/
     ```

3. **Evento QRCODE_UPDATED não está sendo enviado**
   - Evolution API pode enviar evento com nome diferente
   - Verificar payload completo do webhook nos logs

### Problema: Backend não está recebendo webhooks

**Solução:**
```bash
# Verificar se porta 3000 está acessível
lsof -i:3000

# Reiniciar backend
pkill -f "nest start"
npm run start:dev
```

### Problema: Evolution API não consegue acessar backend

**Solução:** Usar ngrok para expor localhost

```bash
# Instalar ngrok
npm install -g ngrok

# Expor porta 3000
ngrok http 3000

# Atualizar .env com URL do ngrok
APP_URL=https://abc123.ngrok.io
```

## 📊 Status Atual dos Testes

### ✅ Testes Realizados:
- [x] Backend iniciado com sucesso
- [x] Evolution API acessível
- [x] Webhook configurado corretamente
- [x] Webhooks sendo recebidos (connection.update)
- [x] Build TypeScript sem erros
- [x] Código implementado seguindo documentação Evolution API

### ⏳ Aguardando Teste:
- [ ] Teste completo via frontend
- [ ] Confirmação de QR Code sendo exibido
- [ ] Scan de QR Code e conexão bem-sucedida

## 🚀 Comandos Rápidos

### Iniciar backend
```bash
cd /Users/emerson/Desktop/workspace/verte-nestjs
npm run start:dev
```

### Reiniciar backend
```bash
pkill -f "nest start"
npm run start:dev
```

### Ver logs em tempo real
```bash
tail -f /tmp/backend.log
```

### Ver apenas logs de webhook/QR code
```bash
tail -f /tmp/backend.log | grep -i "qrcode\|webhook"
```

### Limpar instâncias de teste
```bash
# Listar instâncias
curl -s http://localhost:8080/instance/fetchInstances \
  -H "apikey: change-me-to-secure-api-key" | jq '.[] | .name'

# Deletar instância específica
curl -X DELETE "http://localhost:8080/instance/delete/INSTANCE_NAME" \
  -H "apikey: change-me-to-secure-api-key"
```

## 📝 Próximos Passos

1. **Teste via frontend**
   - Abra o frontend
   - Tente conectar WhatsApp
   - Verifique se QR Code aparece

2. **Se QR Code não aparecer:**
   - Verificar logs do backend
   - Verificar logs da Evolution API
   - Considerar usar ngrok se `host.docker.internal` não funcionar

3. **Se QR Code aparecer:**
   - Escanear com WhatsApp
   - Verificar se conexão é estabelecida
   - Testar envio de mensagens

## 🎉 Solução Implementada

- **Antes**: Backend tentava fazer polling inútil do endpoint `/instance/connect`
- **Depois**: Backend recebe QR Code via webhook e salva no banco de dados
- **Resultado**: Frontend faz polling no banco (rápido), não na Evolution API

---

**Última atualização**: 19/11/2025 18:06
**Status**: ✅ PRONTO PARA TESTE VIA FRONTEND
