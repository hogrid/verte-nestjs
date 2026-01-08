# System Patterns

## Arquitetura
- Provider Evolution API implementa IWhatsAppProvider.
- Webhook → WhatsappService → atualiza banco e emite eventos.
- SSE para status em tempo real.

## Padrões
- Não regenerar QR quando `status_connection=1`.
- Normalizar eventos do Evolution (`CONNECTION_UPDATE`, `QRCODE_UPDATED`).
- Mapear estados: `open/CONNECTED`, `connecting/CONNECTING`, `close/CLOSED`.

## Recuperação
- Evitar cleanup automático quando `state=open` sem QR.
- Reconectar via endpoint dedicado.

