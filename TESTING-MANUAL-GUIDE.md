# 🧪 Guia Interativo de Testes - Fase 1

**Data**: 13/11/2024
**Objetivo**: Testar todos os módulos do sistema via navegador (frontend)

---

## ✅ Pré-requisitos

Antes de começar os testes, verifique:

```bash
# Backend NestJS rodando?
curl http://localhost:3000/api/v1/health
# Deve retornar: {"status":"ok",...}

# Frontend rodando?
curl http://localhost:3005
# Deve retornar HTML

# DevTools aberto?
# Pressione F12 no navegador
# Vá para aba Network → Fetch/XHR
```

**URLs**:
- Frontend: http://localhost:3005
- Backend API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api/docs

---

## 📋 Checklist de Testes

### ✅ 1. Autenticação (COMPLETO)

- [x] Login com usuário válido
- [x] Token JWT salvo no localStorage
- [x] Requisições usando Bearer token
- [x] CORS funcionando

**Status**: ✅ **PASSOU** - Login funcionando!

---

### 🔲 2. Módulo de Contatos

**URL**: http://localhost:3005/contatos (ou similar)

#### 2.1 Listar Contatos

**Como testar**:
1. Clique em "Contatos" no menu
2. Verifique se a lista carrega
3. Abra DevTools (F12) → Network
4. Verifique requisição: `GET /api/v1/contacts?page=1`

**O que verificar**:
```json
// Response deve ser estilo Laravel:
{
  "data": [
    {
      "id": 1,
      "name": "João Silva",
      "email": "joao@example.com",
      "phone": "11999999999",
      ...
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 100,
    "last_page": 7
  }
}
```

✅ **PASSOU** se:
- Lista de contatos exibida
- Paginação funcionando
- Status code: 200

❌ **FALHOU** se:
- Erro 500, 404, ou CORS
- Paginação quebrada
- Dados não carregam

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 2.2 Criar Novo Contato

**Como testar**:
1. Clique em "Novo Contato" ou "+"
2. Preencha o formulário:
   - Nome: "Teste Manual"
   - Email: "teste@manual.com"
   - Telefone: "11888888888"
3. Clique em "Salvar"
4. Verifique no DevTools: `POST /api/v1/contacts`

**O que verificar**:
```json
// Response:
{
  "data": {
    "id": 123,
    "name": "Teste Manual",
    "email": "teste@manual.com",
    "phone": "11888888888",
    "created_at": "2024-11-13T...",
    ...
  }
}
```

✅ **PASSOU** se:
- Contato criado com sucesso
- Toast/mensagem de sucesso exibida
- Contato aparece na listagem
- Status code: 201

❌ **FALHOU** se:
- Erro ao salvar
- Validações não funcionam (tente enviar sem nome)
- Contato não aparece na lista

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 2.3 Editar Contato

**Como testar**:
1. Na lista, clique em "Editar" em um contato
2. Altere o nome para "Teste Manual Editado"
3. Clique em "Salvar"
4. Verifique no DevTools: `PUT /api/v1/contacts/{id}`

✅ **PASSOU** se:
- Alterações salvas
- Nome atualizado na lista
- Status code: 200

❌ **FALHOU** se:
- Erro ao salvar
- Mudanças não persistem

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 2.4 Deletar Contato (Soft Delete)

**Como testar**:
1. Clique em "Deletar" em um contato
2. Confirme a exclusão
3. Verifique no DevTools: `DELETE /api/v1/contacts/{id}`
4. **IMPORTANTE**: Verificar se é soft delete (campo `deleted_at`)

✅ **PASSOU** se:
- Contato removido da lista
- Status code: 204 ou 200
- Soft delete aplicado (não removido do banco)

❌ **FALHOU** se:
- Erro ao deletar
- Contato hard deleted (removido do banco)

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 2.5 Buscar/Filtrar Contatos

**Como testar**:
1. Use o campo de busca
2. Digite "João"
3. Verifique DevTools: `GET /api/v1/contacts?search=João`

✅ **PASSOU** se:
- Resultados filtrados corretamente
- Busca case-insensitive funciona
- Status code: 200

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 2.6 Importar Contatos (CSV)

**Como testar**:
1. Clique em "Importar" ou "Upload CSV"
2. Selecione arquivo CSV com contatos
3. Aguarde processamento
4. Verifique DevTools: `POST /api/v1/contacts/import`

**Arquivo CSV de teste**:
```csv
name,email,phone
João Imported,joao@import.com,11777777777
Maria Imported,maria@import.com,11666666666
```

✅ **PASSOU** se:
- Importação concluída
- Contatos aparecem na lista
- Status code: 200 ou 201

❌ **FALHOU** se:
- Erro ao processar CSV
- Contatos não importados

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 2.7 Exportar Contatos (CSV)

**Como testar**:
1. Clique em "Exportar" ou "Download CSV"
2. Verifique se arquivo CSV foi baixado
3. Abra o arquivo e valide conteúdo
4. Verifique DevTools: `GET /api/v1/export/contacts`

✅ **PASSOU** se:
- Arquivo CSV baixado
- Dados corretos no arquivo
- Status code: 200

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

### 🔲 3. Módulo de Campanhas

**URL**: http://localhost:3005/campanhas (ou similar)

#### 3.1 Listar Campanhas

**Como testar**:
1. Clique em "Campanhas" no menu
2. Verifique lista de campanhas
3. DevTools: `GET /api/v1/campaigns?page=1`

**O que verificar**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Campanha Black Friday",
      "status": "scheduled", // ou "running", "completed", "paused"
      "scheduled_at": "2024-11-20T10:00:00Z",
      "total_contacts": 500,
      "sent": 250,
      "delivered": 240,
      "failed": 10,
      ...
    }
  ],
  "meta": { "current_page": 1, ... }
}
```

✅ **PASSOU** se:
- Campanhas listadas
- Status exibido corretamente
- Estatísticas (enviados, entregues) visíveis

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 3.2 Criar Campanha Simplificada

**Como testar**:
1. Clique em "Nova Campanha"
2. Preencha:
   - Nome: "Teste Manual Campaign"
   - Público-alvo: Selecione um público
   - Mensagem: "Olá {{name}}, esta é uma campanha de teste!"
   - Agendamento: "Agora" ou data futura
3. Clique em "Criar"
4. DevTools: `POST /api/v1/campaigns`

✅ **PASSOU** se:
- Campanha criada
- Aparece na lista
- Status correto (scheduled ou running)

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 3.3 Ver Detalhes da Campanha

**Como testar**:
1. Clique em uma campanha na lista
2. Verifique página de detalhes
3. DevTools: `GET /api/v1/campaigns/{id}`

**O que verificar**:
- Estatísticas: Total enviados, entregues, falhas
- Timeline de envio
- Lista de contatos impactados
- Gráficos (se houver)

✅ **PASSOU** se:
- Detalhes corretos
- Estatísticas atualizadas
- Status code: 200

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 3.4 Pausar/Retomar Campanha

**Como testar**:
1. Em uma campanha ativa, clique em "Pausar"
2. Verifique mudança de status
3. Clique em "Retomar"
4. DevTools: `PATCH /api/v1/campaigns/{id}/pause` e `../resume`

✅ **PASSOU** se:
- Status muda para "paused" e depois "running"
- Mensagens de feedback corretas

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 3.5 Cancelar Campanha

**Como testar**:
1. Clique em "Cancelar" em uma campanha
2. Confirme cancelamento
3. DevTools: `DELETE /api/v1/campaigns/{id}` ou `PATCH .../cancel`

✅ **PASSOU** se:
- Campanha cancelada
- Status muda para "cancelled"
- Não é enviada mais mensagens

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

### 🔲 4. Módulo de WhatsApp (WAHA)

**URL**: http://localhost:3005/whatsapp (ou similar)

#### 4.1 Conectar Instância WhatsApp

**Como testar**:
1. Clique em "Conectar WhatsApp" ou "Nova Instância"
2. Solicite QR Code
3. DevTools: `POST /api/v1/whatsapp/sessions` e `GET .../qr`

**O que verificar**:
- QR Code exibido na tela
- Escaneie com WhatsApp (se possível)
- Status muda para "connected"

✅ **PASSOU** se:
- QR Code gerado
- Conexão bem-sucedida (se escaneado)
- Status atualizado

❌ **FALHOU** se:
- QR Code não exibido
- Erro ao conectar

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 4.2 Verificar Status da Conexão

**Como testar**:
1. Na lista de instâncias, verifique status
2. DevTools: `GET /api/v1/whatsapp/sessions`

**Status possíveis**:
- `connected` - Conectado ✅
- `disconnected` - Desconectado ⭕
- `connecting` - Conectando 🔄
- `qr` - Aguardando QR 📱

✅ **PASSOU** se:
- Status exibido corretamente
- Atualização em tempo real (polling)

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 4.3 Desconectar Instância

**Como testar**:
1. Clique em "Desconectar" em uma instância ativa
2. Confirme desconexão
3. DevTools: `DELETE /api/v1/whatsapp/sessions/{id}`

✅ **PASSOU** se:
- Instância desconectada
- Status muda para "disconnected"

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 4.4 Ver Números Conectados

**Como testar**:
1. Vá para "Números" ou "Instâncias"
2. Verifique lista de números/instâncias ativas
3. DevTools: `GET /api/v1/numbers`

✅ **PASSOU** se:
- Números exibidos
- Status de cada número visível

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

### 🔲 5. Módulo de Pagamentos (Stripe)

**URL**: http://localhost:3005/planos (ou similar)

#### 5.1 Visualizar Planos Disponíveis

**Como testar**:
1. Clique em "Planos" ou "Assinatura"
2. Verifique planos disponíveis (Free, Pro, Enterprise)
3. DevTools: `GET /api/v1/plans`

**O que verificar**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Free",
      "price": 0,
      "features": ["100 contatos", "1 campanha/mês"],
      ...
    },
    {
      "id": 2,
      "name": "Pro",
      "price": 99.90,
      "features": ["10.000 contatos", "Ilimitado campanhas"],
      ...
    }
  ]
}
```

✅ **PASSOU** se:
- Planos listados
- Preços corretos
- Features visíveis

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 5.2 Iniciar Checkout (Stripe)

**⚠️ AVISO**: Este teste redirecionará para Stripe. Use modo de teste.

**Como testar**:
1. Selecione um plano pago (Pro ou Enterprise)
2. Clique em "Assinar" ou "Contratar"
3. Será redirecionado para Stripe Checkout
4. DevTools: `POST /api/v1/payments/checkout`

**O que verificar**:
- URL de redirecionamento para Stripe retornada
- Redirecionamento acontece
- Página de pagamento Stripe carrega

✅ **PASSOU** se:
- Redirecionamento funciona
- Checkout Stripe exibido
- Status code: 200

❌ **FALHOU** se:
- Erro ao criar checkout
- Redirecionamento não funciona

**Marque aqui**: [ ] PASSOU | [ ] FALHOU

---

#### 5.3 Webhook de Pagamento (Manual)

**⚠️ Teste avançado - Requer Stripe CLI**

**Como testar**:
```bash
# No terminal, use Stripe CLI para simular webhook
stripe trigger checkout.session.completed
```

Ou use o dashboard Stripe: https://dashboard.stripe.com/test/webhooks

✅ **PASSOU** se:
- Webhook recebido
- Plano do usuário atualizado no banco
- Status code: 200 no webhook endpoint

**Marque aqui**: [ ] PASSOU | [ ] FALHOU | [ ] SKIPPED

---

## 📊 Resumo de Testes

### Contatos (7 testes)
- [ ] 2.1 Listar
- [ ] 2.2 Criar
- [ ] 2.3 Editar
- [ ] 2.4 Deletar
- [ ] 2.5 Buscar
- [ ] 2.6 Importar CSV
- [ ] 2.7 Exportar CSV

### Campanhas (5 testes)
- [ ] 3.1 Listar
- [ ] 3.2 Criar
- [ ] 3.3 Ver Detalhes
- [ ] 3.4 Pausar/Retomar
- [ ] 3.5 Cancelar

### WhatsApp (4 testes)
- [ ] 4.1 Conectar
- [ ] 4.2 Verificar Status
- [ ] 4.3 Desconectar
- [ ] 4.4 Ver Números

### Pagamentos (3 testes)
- [ ] 5.1 Visualizar Planos
- [ ] 5.2 Checkout Stripe
- [ ] 5.3 Webhook (opcional)

**Total**: 19 testes

---

## 🐛 Reportar Bugs

Se encontrar bugs, anote aqui:

### Bug #1
- **Módulo**:
- **Ação**:
- **Esperado**:
- **Atual**:
- **Severidade**: Alta / Média / Baixa
- **Logs (Console F12)**:
```
[Cole aqui]
```

### Bug #2
(repita o formato acima)

---

## ✅ Critérios de Sucesso

Para considerar os testes **APROVADOS**:

- ✅ Pelo menos **80% dos testes** passando (15/19)
- ✅ Zero bugs críticos (que impedem uso do sistema)
- ✅ Validações funcionando em português
- ✅ Paginação funcionando
- ✅ CORS sem erros

---

**Última atualização**: 13/11/2024
**Status**: 🔄 Em andamento - Aguardando testes manuais
