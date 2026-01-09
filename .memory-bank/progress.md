# Progress

## Concluído
- Status Evolution lido corretamente.
- Eventos de webhook normalizados.
- Evitar re-QR em sessão aberta.
- Memory Bank atualizado.
- Testes E2E adicionados e passando para status/perfil/desconexão.
- **Bulk block/unblock de contatos funcionando** (09/01/2025):
  - Frontend: MUI DataGrid com seleção persistente entre páginas.
  - Frontend: Refetch automático após ações em massa.
  - Backend: `updateContactsStatus()`, `blockContacts()`, `unblockContacts()` com filtro `user_id`.
  - Backend: Logs de diagnóstico detalhados para debugging.
- **Criação de campanhas com FormData funcionando** (09/01/2026):
  - Backend: Controller aceita multipart/form-data com arquivos de mídia.
  - Backend: Função `parseFormDataFields()` para parsear campos aninhados.
  - Backend: Mapeamento automático de campos frontend→backend (date_schedule→schedule_date, tags→labels, text→message).
  - Backend: Suporte a upload de mídia nas mensagens com detecção automática de tipo (image, audio, video, document).
  - Service: Atualizado para usar campos `media` e `media_type` das mensagens.

## Em andamento
- Remover logs de debug após validação em produção.
- SSE de status.
- UX frontend: feedback, redirecionamento e sincronização de contatos.

## Problemas conhecidos
- Instâncias antigas podem manter webhook antigo (porta 3000). Recomenda-se recriar.
- Sincronização de contatos requer mapeamento de endpoints Evolution.
- Dados legados têm `number_id` inconsistente - bulk operations filtram apenas por `user_id`.
