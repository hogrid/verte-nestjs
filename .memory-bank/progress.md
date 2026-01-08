# Progress

## Concluído
- Status Evolution lido corretamente.
- Eventos de webhook normalizados.
- Evitar re-QR em sessão aberta.
- Memory Bank atualizado.
- Testes E2E adicionados e passando para status/perfil/desconexão.

## Em andamento
- SSE de status.
- UX frontend: feedback, redirecionamento e sincronização de contatos.
- Validação visual com Playwright (erro de isolamento do navegador no ambiente atual).

## Problemas conhecidos
- Instâncias antigas podem manter webhook antigo (porta 3000). Recomenda-se recriar.
- Sincronização de contatos requer mapeamento de endpoints Evolution.
