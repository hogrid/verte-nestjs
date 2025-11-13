# 🧪 Fase 1: Guia de Testes de Compatibilidade

**Status**: ✅ Ambiente configurado e pronto para testes
**Data**: 13/11/2024
**Objetivo**: Validar 100% de compatibilidade entre frontend e backend NestJS

---

## 📊 Status Atual

### ✅ Ambiente Preparado

| Componente | Status | URL | Observações |
|------------|--------|-----|-------------|
| **Backend NestJS** | 🟢 Rodando | http://localhost:3000 | 121 endpoints ativos |
| **Frontend React** | 🟢 Rodando | http://localhost:3005 | Pré-configurado para NestJS |
| **Swagger Docs** | 🟢 Disponível | http://localhost:3000/api/docs | Documentação interativa |
| **Database MySQL** | 🟢 Conectado | localhost:5306 | Compartilhado com Laravel |
| **Redis** | 🟢 Conectado | localhost:6379 | Bull Queue ativo |

---

## 🎯 Checklist de Testes

### Testes Obrigatórios (Fase 1)

Use este checklist enquanto testa o sistema no navegador:

#### 1. 🔐 Autenticação e Autorização

- [ ] **Login com usuário válido**
  - URL: http://localhost:3005
  - Ação: Fazer login com credenciais existentes
  - Esperado: Login bem-sucedido, redirecionamento para dashboard
  - Verificar: Token JWT salvo no localStorage (`auth_token`)

- [ ] **Login com credenciais inválidas**
  - Ação: Tentar login com email/senha errados
  - Esperado: Mensagem de erro em português
  - Exemplo: "Credenciais inválidas"

- [ ] **Acesso a página protegida sem login**
  - Ação: Acessar /dashboard sem estar logado
  - Esperado: Redirecionamento para tela de login

- [ ] **Logout**
  - Ação: Fazer logout
  - Esperado: Token removido, redirecionamento para login

#### 2. 📇 Módulo de Contatos

- [ ] **Listar contatos**
  - URL: http://localhost:3005/contacts (ou similar)
  - Esperado: Listagem com paginação estilo Laravel
  - Verificar: `current_page`, `total`, `per_page`, `data[]`

- [ ] **Criar novo contato**
  - Ação: Adicionar contato via formulário
  - Campos: Nome, email, telefone, etc
  - Esperado: Contato criado com sucesso

- [ ] **Editar contato existente**
  - Ação: Editar dados de um contato
  - Esperado: Alterações salvas

- [ ] **Deletar contato (soft delete)**
  - Ação: Remover um contato
  - Esperado: Contato marcado como deletado (não removido do banco)

- [ ] **Buscar/Filtrar contatos**
  - Ação: Usar campo de busca
  - Esperado: Resultados filtrados em tempo real

- [ ] **Importar contatos via CSV**
  - Ação: Upload de arquivo CSV
  - Esperado: Contatos importados com sucesso

- [ ] **Exportar contatos para CSV**
  - Ação: Clicar em "Exportar"
  - Esperado: Download de arquivo CSV

#### 3. 🎯 Módulo de Campanhas

- [ ] **Listar campanhas**
  - Esperado: Lista de campanhas com status (ativa, pausada, concluída)

- [ ] **Criar campanha simplificada**
  - Ação: Criar campanha para público-alvo
  - Esperado: Campanha criada e agendada

- [ ] **Criar campanha customizada**
  - Ação: Criar campanha com template personalizado
  - Esperado: Campanha salva

- [ ] **Ver detalhes da campanha**
  - Ação: Clicar em uma campanha
  - Esperado: Estatísticas (enviados, entregues, falhas)

- [ ] **Cancelar campanha**
  - Ação: Cancelar campanha ativa
  - Esperado: Status alterado para "cancelada"

#### 4. 💬 Módulo de WhatsApp (WAHA)

- [ ] **Conectar instância WhatsApp**
  - Ação: Solicitar QR Code
  - Esperado: QR Code exibido

- [ ] **Verificar status da conexão**
  - Esperado: Status "conectado" ou "desconectado"

- [ ] **Desconectar instância**
  - Ação: Desconectar WhatsApp
  - Esperado: Status alterado

- [ ] **Ver números conectados**
  - Esperado: Lista de números/instâncias ativas

#### 5. 💳 Módulo de Pagamentos (Stripe)

- [ ] **Visualizar planos disponíveis**
  - Esperado: Lista de planos (Free, Pro, Enterprise)

- [ ] **Iniciar checkout (Stripe)**
  - Ação: Selecionar plano pago
  - Esperado: Redirecionamento para Stripe Checkout

- [ ] **Webhook de pagamento (teste manual)**
  - Usar Stripe CLI ou dashboard para simular webhook
  - Esperado: Plano do usuário atualizado

#### 6. 📁 Módulo de Arquivos

- [ ] **Upload de arquivo (imagem/vídeo)**
  - Ação: Fazer upload de mídia
  - Esperado: Arquivo salvo em `/uploads/`

- [ ] **Download de arquivo**
  - Ação: Baixar arquivo previamente enviado
  - Esperado: Download bem-sucedido

- [ ] **Deletar arquivo**
  - Ação: Remover arquivo
  - Esperado: Arquivo removido do sistema

#### 7. 🏷️ Módulo de Labels/Públicos

- [ ] **Criar label**
  - Ação: Adicionar nova label (tag)
  - Esperado: Label criada

- [ ] **Associar label a contato**
  - Ação: Adicionar label a um contato
  - Esperado: Associação salva

- [ ] **Criar público-alvo**
  - Ação: Criar grupo de contatos por filtro
  - Esperado: Público criado com contatos filtrados

#### 8. 👤 Módulo de Usuário/Perfil

- [ ] **Ver perfil do usuário**
  - URL: Página "Meu Perfil" ou similar
  - Esperado: Dados do usuário exibidos

- [ ] **Editar perfil**
  - Ação: Alterar nome, email, etc
  - Esperado: Alterações salvas

- [ ] **Upload de foto de perfil**
  - Ação: Enviar imagem de perfil
  - Esperado: Foto atualizada

#### 9. 📊 Dashboard/Estatísticas

- [ ] **Ver dashboard**
  - Esperado: Gráficos e métricas (campanhas, contatos, mensagens)

- [ ] **Indicadores em tempo real**
  - Esperado: Números atualizados

#### 10. 🔧 Admin (se aplicável)

- [ ] **Listar todos os clientes** (admin only)
  - Esperado: Lista de todos os usuários do sistema

- [ ] **Ver configurações globais**
  - Esperado: Painel de configurações

---

## 🐛 Relatório de Bugs/Erros

Use esta seção para documentar problemas encontrados durante os testes:

### Modelo de Relatório:

```markdown
### Bug #1: [Título descritivo]

**Módulo**: Contatos
**Ação realizada**: Tentei criar um contato sem preencher email
**Resultado esperado**: Mensagem de erro em português
**Resultado atual**: Erro 500 ou mensagem em inglês
**Severidade**: Alta / Média / Baixa
**Logs do console (F12)**:
```
[Cole aqui logs de erro do DevTools]
```
```

---

## 📸 DevTools - Monitoramento

### Como Verificar Requisições:

1. Abra **DevTools** (F12)
2. Vá para aba **Network**
3. Filtre por **XHR** ou **Fetch**
4. Execute ações no frontend
5. Verifique:

#### Requisições bem-sucedidas:
```
✅ Status: 200, 201, 204
✅ Response JSON com estrutura Laravel
✅ Headers: Authorization: Bearer [token]
✅ Sem erros de CORS
```

#### Estrutura de Response esperada (Laravel-style):
```json
// Paginação
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "from": 1,
    "to": 15,
    "per_page": 15,
    "total": 100,
    "last_page": 7
  }
}

// Item único
{
  "data": {
    "id": 1,
    "name": "...",
    ...
  }
}

// Erro (validação)
{
  "message": "Erro de validação",
  "errors": {
    "email": ["O campo email é obrigatório."]
  }
}
```

---

## ✅ Critérios de Sucesso (Fase 1)

Para considerar a Fase 1 completa, **TODOS** os itens abaixo devem funcionar:

- ✅ Login/Logout funcionando
- ✅ Pelo menos 80% dos testes do checklist acima passando
- ✅ Zero erros de CORS no console
- ✅ Validações exibidas em português
- ✅ Paginação funcionando corretamente
- ✅ Upload/Download de arquivos funcionando
- ✅ Campanhas podem ser criadas (mesmo que não enviem de fato)
- ✅ Dashboard exibindo dados

---

## 🚦 Próximas Etapas

Após completar os testes da Fase 1:

### Se tudo funcionar (>80% dos testes passando):
➡️ **Fase 2**: Deploy em ambiente de staging
➡️ Preparar documentação de integração
➡️ Criar plano de rollout gradual

### Se houver problemas críticos:
➡️ Documentar bugs encontrados
➡️ Priorizar correções (Alta → Média → Baixa)
➡️ Corrigir e re-testar
➡️ Repetir Fase 1

---

## 📞 Suporte

### Documentação Adicional:
- **API Endpoints**: `/Users/emerson/Desktop/workspace/verte-nestjs/API-ENDPOINTS.md`
- **Integração Frontend**: `/Users/emerson/Desktop/workspace/verte-front/README-INTEGRACAO.md`
- **Deploy Guide**: `/Users/emerson/Desktop/workspace/verte-nestjs/DEPLOY.md`

### Logs e Debugging:
```bash
# Backend logs (em tempo real)
# Já rodando em: /Users/emerson/Desktop/workspace/verte-nestjs

# Ver logs do servidor
# Os logs aparecem no terminal onde você rodou npm run start:dev

# Frontend logs
# Abra DevTools (F12) → Console
```

---

## 🎬 Como Começar os Testes

### Passo 1: Acessar Frontend
```
URL: http://localhost:3005
```

### Passo 2: Fazer Login
- Use credenciais de um usuário existente no banco
- Se não tiver, consulte banco MySQL:
  ```sql
  SELECT id, email, name FROM users WHERE deleted_at IS NULL LIMIT 5;
  ```

### Passo 3: Seguir Checklist
- Teste cada item do checklist acima
- Marque como [x] quando funcionar
- Documente bugs se encontrar problemas

### Passo 4: Reportar Resultados
- Ao finalizar, crie um resumo:
  - X/Y testes passaram
  - Liste bugs críticos encontrados
  - Próximos passos recomendados

---

**Última atualização**: 13/11/2024 13:25
**Status**: ✅ Ambiente preparado - Pronto para testes manuais
**Backend**: http://localhost:3000
**Frontend**: http://localhost:3005
**Swagger**: http://localhost:3000/api/docs
