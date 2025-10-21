# Documentação de Migração Laravel para NestJS - Projeto Verte

## Visão Geral

Esta documentação fornece um inventário completo e detalhado do projeto Laravel **Verte** para facilitar a migração 100% fidedigna para NestJS. Cada arquivo contém informações específicas e cruciais para replicar toda a funcionalidade existente.

## 📋 Índice de Documentação

### 1. **[Inventário de Rotas](./routes-inventory.md)**
- **121 rotas** documentadas com detalhes completos
- Validações de entrada e regras de negócio
- Middleware aplicado em cada rota
- Estrutura de resposta esperada
- Parâmetros obrigatórios e opcionais

**Crítico para**: Implementar todos os endpoints da API com validações idênticas

### 2. **[Esquema do Banco de Dados](./database-schema.md)**
- **22+ tabelas** com estrutura completa
- Relacionamentos entre tabelas
- Indexes e constraints
- Soft deletes e timestamps
- Comandos CREATE TABLE para replicação

**Crítico para**: Criar migrations TypeORM idênticas ao Laravel

### 3. **[Modelos e Relacionamentos](./models-relationships.md)**
- **20+ modelos** Laravel documentados
- Relacionamentos (hasMany, belongsTo, etc.)
- Campos fillable e guarded
- Scopes e accessors
- Mutators e casts

**Crítico para**: Implementar entidades TypeORM com relacionamentos corretos

### 4. **[Regras de Negócio](./business-rules.md)**
- Lógica de negócio de todos os controllers
- Validações específicas por endpoint
- Fluxos de processamento
- Tratamento de erros
- Integrações entre serviços

**Crítico para**: Manter comportamento idêntico da aplicação

### 5. **[Middleware e Autenticação](./middleware-auth.md)**
- Sistema de autenticação Sanctum
- Guards e políticas de acesso
- Middleware personalizado
- Estrutura de permissões
- Configurações CORS

**Crítico para**: Implementar autenticação JWT e guards no NestJS

### 6. **[Dependências Externas](./dependencies-external.md)**
- Integração WhatsApp (WAHA API)
- Pagamentos (Stripe e MercadoPago)
- Email e notificações
- WebSockets (Pusher)
- Redis e cache

**Crítico para**: Manter todas as integrações funcionais

### 7. **[Configuração de Ambiente](./environment-config.md)**
- Variáveis de ambiente essenciais
- Configurações de serviços
- Mapeamento Laravel → NestJS
- Estrutura de configuração recomendada

**Crítico para**: Configurar ambiente NestJS corretamente

## 🚀 Estratégia de Migração Recomendada

### Fase 1: Infraestrutura Base
1. **Configurar projeto NestJS** com estrutura modular
2. **Implementar banco de dados** usando as migrations documentadas
3. **Configurar autenticação JWT** baseada no sistema Sanctum
4. **Configurar Redis** para cache e filas

### Fase 2: Modelos e Relacionamentos
1. **Criar entidades TypeORM** baseadas nos modelos Laravel
2. **Implementar relacionamentos** conforme documentado
3. **Configurar repositórios** para acesso aos dados
4. **Implementar DTOs** para validação

### Fase 3: Controllers e Rotas
1. **Implementar controllers** seguindo as regras de negócio
2. **Criar rotas** com validações idênticas
3. **Aplicar guards** e middleware equivalentes
4. **Testar cada endpoint** comparando respostas

### Fase 4: Integrações Externas
1. **Migrar serviço WhatsApp** (WAHA API)
2. **Implementar pagamentos** (Stripe/MercadoPago)
3. **Configurar notificações** (email/WebSocket)
4. **Testar todas as integrações**

### Fase 5: Testes e Validação
1. **Testes unitários** para cada serviço
2. **Testes de integração** para fluxos completos
3. **Validação de dados** entre sistemas
4. **Performance testing**

## 🎯 Pontos Críticos de Atenção

### Autenticação
- **Laravel Sanctum** → **NestJS JWT**
- Manter estrutura de tokens idêntica
- Preservar sistema de permissões

### Banco de Dados
- **Eloquent ORM** → **TypeORM**
- Manter soft deletes funcionais
- Preservar relacionamentos complexos

### Filas e Jobs
- **Laravel Queue** → **Bull Queue**
- Manter processamento assíncrono
- Preservar retry logic

### Validações
- **Form Requests** → **DTOs com class-validator**
- Manter mensagens de erro idênticas
- Preservar regras de validação customizadas

### Integração WhatsApp
- Manter API WAHA funcional
- Preservar fluxo de sessões
- Manter envio de mensagens/mídia

### Pagamentos
- Preservar webhooks Stripe/MercadoPago
- Manter fluxo de assinaturas
- Preservar tratamento de erros

## 📊 Estatísticas do Projeto

- **121 rotas** API documentadas
- **22+ tabelas** no banco de dados
- **20+ modelos** Laravel
- **5 integrações** externas principais
- **3 sistemas** de pagamento
- **2 tipos** de autenticação

## 🔧 Tecnologias Envolvidas

### Laravel (Atual)
- Laravel 8.x
- Sanctum (autenticação)
- Eloquent ORM
- Redis (cache/queue)
- MySQL/MariaDB

### NestJS (Destino)
- NestJS 10.x
- JWT (autenticação)
- TypeORM
- Bull Queue
- MySQL/MariaDB

### Integrações
- WAHA (WhatsApp API)
- Stripe (pagamentos)
- MercadoPago (pagamentos)
- Pusher (WebSockets)
- Gmail SMTP (email)

## ⚡ Quick Start para Desenvolvedores

1. **Leia primeiro**: `business-rules.md` para entender a lógica
2. **Configure ambiente**: Use `environment-config.md`
3. **Implemente banco**: Use migrations de `database-schema.md`
4. **Crie entidades**: Baseado em `models-relationships.md`
5. **Implemente rotas**: Seguindo `routes-inventory.md`
6. **Configure integrações**: Usando `dependencies-external.md`
7. **Aplique segurança**: Baseado em `middleware-auth.md`

## 📝 Notas Importantes

- **Todos os arquivos são interdependentes** - leia a documentação completa
- **Mantenha a estrutura de dados idêntica** para evitar quebras
- **Teste cada endpoint** após implementação
- **Valide integrações externas** em ambiente de desenvolvimento
- **Mantenha backup** dos dados durante migração

## 🆘 Suporte e Dúvidas

Esta documentação foi criada para ser **auto-suficiente** e permitir migração sem perda de funcionalidades. Cada arquivo contém:

- ✅ **Código original** Laravel
- ✅ **Equivalência** NestJS
- ✅ **Exemplos práticos**
- ✅ **Pontos de atenção**
- ✅ **Validações necessárias**

---

**Última atualização**: Setembro 2025  
**Status**: Documentação completa para migração  
**Compatibilidade**: Laravel 8.x → NestJS 10.x