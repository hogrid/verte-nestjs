# Active Context

## Foco atual
- Correção de reconhecimento de conexão Evolution API.
- Normalização de eventos de webhook.
- Evitar regeneração de QR em sessão aberta.
- Adição de SSE para status em tempo real.
- Endpoint de desconexão.
- Testes E2E para status/perfil/desconexão.

## Decisões
- Evolution API v2.3.6 (imagem `evoapicloud/evolution-api:latest`).
- WhatsApp Web version: `2.3000.1030492420`.
- Webhook: `http://host.docker.internal:3500/api/v1/whatsapp/webhook`.
- Backend lê `state` em `response.data.instance.state`.

## Próximos passos
- Sincronização de contatos pós-conexão.
- Ajustes de frontend: feedback visual e redirecionamento.
- Validar via navegador (Playwright) quando ambiente suportar isolamento.
