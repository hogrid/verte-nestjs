# Active Context

## Foco atual
- Bulk operations (bloquear/desbloquear contatos) funcionando corretamente.
- Frontend com MUI DataGrid e seleção persistente entre páginas.
- Logs de diagnóstico para operações em massa.

## Decisões
- Evolution API v2.3.6 (imagem `evoapicloud/evolution-api:latest`).
- WhatsApp Web version: `2.3000.1030492420`.
- Webhook: `http://host.docker.internal:3500/api/v1/whatsapp/webhook`.
- Backend lê `state` em `response.data.instance.state`.
- Bulk update de contatos filtra apenas por `user_id` (não `number_id`) devido a inconsistências de dados legados.

## Correções recentes (09/01/2025)
- **Bug bulk block/unblock**: Corrigido problema onde bloqueio em massa atualizava números aleatórios.
  - Causa: Dados inconsistentes com `number_id` não preenchido.
  - Solução: Filtrar apenas por `user_id` (IDs já vêm filtrados do frontend).
- **Frontend refetch**: Adicionado refetch da lista após ações em massa.
- **Seleção entre páginas**: MUI DataGrid com `keepNonExistentRowsSelected` e lógica de acumulação.

## Próximos passos
- Remover logs de debug após validação em produção.
- Sincronização de contatos pós-conexão.
- Ajustes de frontend: feedback visual e redirecionamento.
