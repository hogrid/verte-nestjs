# Tarefas Pendentes - Verte NestJS

Este documento rastreia tarefas que foram identificadas mas ainda não implementadas, para execução posterior.

---

## 🧪 Testes E2E - Redis + Bull Queue

**Status**: ⏸️ Pendente (Prioridade: Alta)
**Motivo**: Módulo funcional, mas falta cobertura de testes de integração
**Estimativa**: 1-2 dias

### Escopo

Criar testes de integração end-to-end para validar o fluxo assíncrono completo:

#### 1. Testes de CampaignsProcessor
- [ ] Processar campanha imediata (status=0)
- [ ] Processar campanha agendada (status=3)
- [ ] Validar criação de jobs de WhatsApp
- [ ] Validar atualização de progresso
- [ ] Validar marcação de campanha como concluída
- [ ] Validar marcação de campanha como falhada
- [ ] Cenários de erro (número desconectado, sem público, sem mensagens)

#### 2. Testes de SimplifiedPublicProcessor
- [ ] Processar público simplificado sem filtros
- [ ] Processar público com filtro de labels
- [ ] Validar criação de Public
- [ ] Validar criação de PublicByContact
- [ ] Validar atualização de status do SimplifiedPublic
- [ ] Cenários de erro (número não encontrado, sem contatos)

#### 3. Testes de CustomPublicProcessor
- [ ] Processar arquivo XLSX válido
- [ ] Validar leitura e parsing do XLSX
- [ ] Validar formatação de números WhatsApp
- [ ] Validar criação/atualização de contatos
- [ ] Validar criação de Public e PublicByContact
- [ ] Validar remoção de arquivo temporário
- [ ] Cenários de erro (arquivo não encontrado, XLSX inválido, sem contatos válidos)

#### 4. Testes de WhatsappMessageProcessor
- [ ] Enviar mensagem de texto
- [ ] Enviar mensagem com imagem
- [ ] Enviar mensagem com áudio
- [ ] Enviar mensagem com vídeo
- [ ] Validar delay entre mensagens
- [ ] Validar atualização de PublicByContact
- [ ] Validar callback de progresso da campanha
- [ ] Cenários de erro (número bloqueado, WAHA API indisponível, timeout)

#### 5. Testes de Integração Completa
- [ ] Fluxo completo: Criar campanha → Processar → Enviar mensagens
- [ ] Fluxo de público simplificado: Criar → Processar → Usar em campanha
- [ ] Fluxo de público customizado: Upload XLSX → Processar → Usar em campanha
- [ ] Validar jobs em paralelo (múltiplas campanhas)
- [ ] Validar retry logic (exponential backoff)

### Configuração Necessária

#### Mock da WAHA API
```typescript
// test/mocks/waha-api.mock.ts
- Mock de endpoints WAHA
- Respostas simuladas de envio
- Simulação de erros
- Simulação de delays
```

#### Setup de Redis para Testes
```typescript
// test/setup/redis-test.setup.ts
- Redis em memória ou container Docker
- Limpeza de queues entre testes
- Configuração de timeout adequado
```

#### Fixtures de Dados
```typescript
// test/fixtures/
- campaigns.fixture.ts
- contacts.fixture.ts
- messages.fixture.ts
- xlsx-files/ (arquivos XLSX de teste)
```

### Comandos de Teste

```bash
# Executar todos os testes de queue
npm run test:e2e:queue

# Executar teste específico
npm run test:e2e -- campaigns-processor.e2e-spec.ts

# Executar com cobertura
npm run test:e2e:cov:queue
```

### Critérios de Sucesso

- ✅ 100% dos processors testados
- ✅ Cobertura de cenários positivos e negativos
- ✅ Testes passando de forma consistente
- ✅ Validação de compatibilidade Laravel
- ✅ Documentação de setup e execução

### Notas

- **IMPORTANTE**: Testes devem usar banco de dados de teste separado
- Considerar usar Docker Compose para Redis + MySQL de teste
- Validar que testes não afetam dados de desenvolvimento
- Garantir que testes são determinísticos (não flaky)

---

## 📝 Outras Tarefas Pendentes

### Cron Job para Campanhas Agendadas

**Status**: ⏸️ Pendente (Prioridade: Média)
**Estimativa**: 2-3 horas

- [ ] Implementar job recorrente usando @nestjs/schedule
- [ ] Executar a cada minuto
- [ ] Verificar campanhas com schedule_date <= now
- [ ] Disparar processamento automaticamente
- [ ] Logs de execução

### Webhooks WAHA

**Status**: ⏸️ Pendente (Prioridade: Média)
**Estimativa**: 1 dia

- [ ] Endpoint para receber webhooks do WAHA
- [ ] Processar eventos de mensagem enviada
- [ ] Processar eventos de mensagem recebida
- [ ] Processar eventos de erro
- [ ] Atualizar status de campanhas

### Upload e Storage de Media

**Status**: ⏸️ Pendente (Prioridade: Baixa)
**Estimativa**: 2-3 dias

- [ ] Configurar storage (S3, local, etc)
- [ ] Upload de imagens para mensagens
- [ ] Upload de áudios para mensagens
- [ ] Upload de vídeos para mensagens
- [ ] Validação de tipos e tamanhos
- [ ] Integração com WAHA API

---

**Última atualização**: 2024-11-08
**Responsável**: Equipe de migração NestJS
