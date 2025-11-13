# ✅ Como Verificar se Está Usando NestJS (ao invés do Laravel)

**Última atualização**: 13/11/2024 14:30

---

## 🎯 **Método 1: Verificar URL (MAIS FÁCIL - 10 segundos)**

### Passo a Passo:

1. **Abra o navegador** (Chrome/Firefox/Edge)
2. **Pressione F12** (abre DevTools)
3. Clique na aba **Network** (ou "Rede")
4. Filtre por **Fetch/XHR**
5. **Atualize a página** (F5 ou Ctrl+R)
6. **Olhe as requisições** na lista

### ✅ **ESTÁ USANDO NESTJS se você ver:**
```
http://localhost:3000/api/v1/ping
http://localhost:3000/api/v1/contacts
http://localhost:3000/api/v1/campaigns
```
**👉 Porta :3000 = NestJS** ✅

### ❌ **ESTÁ USANDO LARAVEL se você ver:**
```
http://localhost:8000/api/v1/ping
http://localhost:8000/api/v1/contacts
```
**👉 Porta :8000 = Laravel** ❌

---

## 🔍 **Método 2: Verificar Logs do Servidor (CONFIRMAÇÃO VISUAL)**

### No Terminal onde você rodou `npm run start:dev`:

Quando você **fizer login** ou **qualquer ação no frontend**, você verá logs assim:

### ✅ **NESTJS** (logs aparecem em tempo real):
```
[Nest] 87021  - 11/13/2025, 1:20:55 PM    LOG [RouterExplorer] Mapped {/api/v1/login, POST} route

query: SELECT `Campaign`.`id` AS `Campaign_id`, `Campaign`.`name` AS...
(Query SQL aparece quando você busca dados)

GET /api/v1/ping 200 - 12ms
POST /api/v1/login 200 - 45ms
GET /api/v1/contacts?page=1 200 - 89ms
```

### ❌ **LARAVEL** (sem logs ou logs do PHP/Apache):
```
[Nenhum log aparece no terminal do npm]
ou
[PHP artisan serve logs]
```

**Se você vê queries SQL coloridas e logs do Nest = NESTJS!** ✅

---

## 🧪 **Método 3: Verificar Headers da Resposta (TÉCNICO)**

### No DevTools (F12) → Network → Clique em uma requisição:

1. Selecione uma requisição (ex: `/api/v1/ping`)
2. Vá para a aba **Headers**
3. Procure por **Response Headers**

### ✅ **NESTJS** geralmente tem:
```
X-Powered-By: Express
content-type: application/json
```

### ❌ **LARAVEL** geralmente tem:
```
X-Powered-By: PHP/8.1.0
X-RateLimit-Limit: 60
```

---

## 🔑 **Método 4: Verificar Token JWT (ao invés de CSRF)**

### No DevTools (F12):

1. Vá para **Application** (ou "Aplicação")
2. No menu lateral esquerdo, expanda **Local Storage**
3. Clique em `http://localhost:3005`
4. Procure por `auth_token`

### ✅ **NESTJS** usa JWT:
```
Key: auth_token
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTczMTUwNzYwMCwiZXhwIjoxNzMxNTExMjAwfQ.xxxxx
```
👆 Token JWT começa com "eyJ..."

### ❌ **LARAVEL** usaria Sanctum:
```
Cookie: laravel_session=xxxxx
Cookie: XSRF-TOKEN=xxxxx
```

---

## 🌐 **Método 5: Teste Direto via cURL (CONFIRMAÇÃO 100%)**

### No terminal, rode:

```bash
curl -s http://localhost:3000/api/v1/health
```

### ✅ **NESTJS** retorna:
```json
{
  "status": "ok",
  "timestamp": "2025-11-13T16:21:02.674Z",
  "uptime": 12.836615791,
  "environment": "development"
}
```

### ❌ **LARAVEL** retornaria diferente ou erro 404

---

## 📊 **Checklist Visual Rápido**

Use esta tabela para confirmar:

| Indicador | NestJS ✅ | Laravel ❌ |
|-----------|----------|-----------|
| **URL das requisições** | `:3000` | `:8000` |
| **Logs no terminal** | `[Nest] ...` com queries SQL | Sem logs ou PHP logs |
| **Token** | JWT (`eyJ...`) no localStorage | CSRF cookies |
| **Headers** | `X-Powered-By: Express` | `X-Powered-By: PHP` |
| **Health endpoint** | `{"status":"ok",...}` | Outro formato |

---

## 🎬 **Passo a Passo Completo (INFALÍVEL)**

### 1️⃣ **Abra o navegador e vá para:**
```
http://localhost:3005
```

### 2️⃣ **Pressione F12**

### 3️⃣ **Vá para Network → Fetch/XHR**

### 4️⃣ **Faça login ou atualize a página**

### 5️⃣ **Olhe a primeira requisição**
- Se começar com `http://localhost:3000` → **NESTJS** ✅
- Se começar com `http://localhost:8000` → **LARAVEL** ❌

---

## ⚠️ **Possíveis Confusões**

### Se você ver ambas as portas:

**Cenário 1**: Frontend na porta 3005, mas requisições para 8000
```
Frontend: http://localhost:3005 ✅
API requests: http://localhost:8000 ❌ (Laravel)
```
**Solução**: Verifique o arquivo `.env` do frontend:
```env
# Deve estar assim:
VITE_BACKEND_BASE_URL=http://localhost:3000

# NÃO deve estar assim:
VITE_BACKEND_BASE_URL=http://localhost:8000
```

**Cenário 2**: Erros de CORS
```
Access to fetch at 'http://localhost:3000/api/v1/login' from origin 'http://localhost:3005' has been blocked by CORS policy
```
**Isso significa**: Você ESTÁ usando NestJS, mas precisa configurar CORS.
**Solução**: Já está configurado no NestJS, apenas reinicie o backend.

---

## 📸 **Screenshot Guia (Descrição)**

### O que você deve ver no DevTools:

```
Network Tab (aba Rede)
├── Filter: Fetch/XHR (filtro ativo)
├── Request URL: http://localhost:3000/api/v1/login  ✅ (porta 3000)
├── Status: 200 OK
├── Method: POST
└── Response:
    {
      "token": "eyJhbGciOiJ...",
      "user": { "id": 1, "name": "..." }
    }
```

**Se você ver exatamente isso = 100% NestJS** ✅

---

## 🚨 **Como Saber se Algo Deu Errado**

### Erro 1: "Network Error" ou "Failed to fetch"
```
Causa: Backend NestJS não está rodando
Solução:
  cd /Users/emerson/Desktop/workspace/verte-nestjs
  npm run start:dev
```

### Erro 2: Requisições para `:8000`
```
Causa: Frontend ainda configurado para Laravel
Solução: Verifique /Users/emerson/Desktop/workspace/verte-front/.env
         VITE_BACKEND_BASE_URL=http://localhost:3000
```

### Erro 3: "401 Unauthorized"
```
Causa: Token JWT não está sendo enviado corretamente
Solução: Verifique localStorage.getItem('auth_token')
         Faça logout e login novamente
```

---

## ✅ **Confirmação Final**

**VOCÊ ESTÁ 100% USANDO NESTJS SE:**

1. ✅ URLs das requisições apontam para `:3000`
2. ✅ Vê logs `[Nest]` no terminal do backend
3. ✅ Vê queries SQL no terminal quando faz ações
4. ✅ Token JWT salvo no localStorage
5. ✅ CORS funciona sem erros
6. ✅ Login funciona normalmente
7. ✅ Dashboard carrega dados

**Se TODOS os 7 itens acima funcionam = SUCCESS!** 🎉

---

## 📞 **Precisa de Ajuda?**

Se ainda estiver em dúvida:

1. Tire um screenshot da aba **Network** do DevTools (F12)
2. Copie as URLs das requisições
3. Cole aqui para análise

Exemplo do que colar:
```
POST http://localhost:3000/api/v1/login - Status: 200
GET http://localhost:3000/api/v1/ping - Status: 200
```

---

**Status Atual**: ✅ NestJS rodando na porta 3000
**Frontend**: ✅ Rodando na porta 3005
**Confirmado**: Você ESTÁ usando NestJS! 🎉
