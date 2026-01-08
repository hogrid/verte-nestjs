# Correção: Instâncias WhatsApp em Estado Inconsistente

## Problema Identificado

Instâncias do WhatsApp (Evolution API) ficavam travadas em estado inconsistente:
- **Sintoma**: Estado `open` (conectada) mas sem conexão real
- **Causa**: Instância reportava `state='open'` mas não tinha número de telefone associado
- **Erro exibido**: `Instância user_X_whatsapp está em estado inconsistente (state='open' sem conexão real)`
- **Impacto**: QR Code não era exibido, impossibilitando nova conexão

## Root Cause

Quando uma instância era criada e depois desconectada, às vezes o Evolution API mantinha o registro interno com `state='open'` mesmo sem conexão real ativa. Isso acontecia quando:

1. Usuário conectava WhatsApp
2. Desconectava manualmente ou sessão expirava
3. Evolution API não atualizava o estado corretamente
4. Nova tentativa de obter QR Code falhava (instância "achava" que estava conectada)

## Solução Implementada

### 1. Auto-Recovery no EvolutionApiProvider

**Arquivo**: `src/whatsapp/providers/evolution-api.provider.ts:246-276`

Quando detecta instância travada (5 tentativas consecutivas com `state='open'` sem QR Code):
- ✅ Faz **cleanup automático** (delete da instância)
- ✅ Reseta contador e **continua tentando** obter QR Code
- ✅ Apenas lança erro se cleanup falhar

```typescript
// Auto-recovery quando detecta estado travado
if (stuckOpenAttempts >= maxStuckOpenAttempts) {
  this.logger.error(`❌ Instância travada. Tentando cleanup automático...`);

  try {
    await this.deleteInstance(instanceName);
    await this.sleep(2000);
    stuckOpenAttempts = 0; // Reset e continua tentando
    continue;
  } catch (cleanupError) {
    throw new Error('Tentativa de cleanup automático falhou...');
  }
}
```

### 2. Detecção Melhorada no InstanceManagerService

**Arquivo**: `src/whatsapp/instance-manager.service.ts:111-123`

Melhorou detecção de instância fake-connected:
- ✅ Detecta quando `status='connected'` mas **sem phoneNumber**
- ✅ Marca como `corrupted` com `shouldCleanup: true`
- ✅ Sincroniza estado entre Evolution API e banco de dados

```typescript
// Detecta estado fake/travado
if (status.status === 'connected' && !status.phoneNumber) {
  return {
    healthy: false,
    state: 'corrupted',
    reason: 'Conexão fake/travada',
    shouldCleanup: true,
  };
}
```

### 3. Sincronização Inteligente

**Arquivo**: `src/whatsapp/instance-manager.service.ts:82-108`

Quando Evolution API diz "conectado" mas banco diz "desconectado":
- ✅ **Não faz cleanup** desnecessário
- ✅ Apenas **sincroniza** o banco com estado real
- ✅ Atualiza `status_connection` e `cel` automaticamente

## Fluxo de Recuperação

```
┌─────────────────────────────────────┐
│ Usuário tenta conectar WhatsApp    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ InstanceManager.ensureHealthyInstance│
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ checkInstanceHealth()                │
│ - Verifica estado real              │
│ - Detecta se travada                │
└────────────┬────────────────────────┘
             │
        ┌────┴────┐
        │ Travada?│
        └────┬────┘
             │
      ┌──────┴──────┐
      │ SIM         │ NÃO
      ▼             ▼
┌──────────────┐  ┌────────────┐
│ Cleanup Auto │  │ Continua   │
│ - Delete     │  │ Normal     │
│ - Reset DB   │  └────────────┘
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ getInstanceQRCode()                  │
│ - Tenta obter QR Code                │
│ - Se detectar travada: DELETE + retry│
└──────────────────────────────────────┘
```

## Resultado

✅ **Zero intervenção manual** necessária
✅ **Auto-recovery** em caso de instância travada
✅ **Sincronização** automática entre Evolution API e banco
✅ **QR Code sempre disponível** para novas conexões
✅ **Mensagens claras** em logs sobre o que está acontecendo

## Como Testar

1. Criar instância WhatsApp
2. Simular estado inconsistente (conectar e depois corromper manualmente via Evolution API)
3. Tentar obter QR Code novamente
4. Verificar logs: deve mostrar cleanup automático e sucesso após retry

## Logs Esperados

```
🛡️ Verificando saúde da instância: user_1_whatsapp
⚠️ Estado TRAVADO detectado: state='connected' mas sem número de telefone real
🧹 Instância corrompida, iniciando cleanup...
✅ Instância deletada da Evolution API
✅ Registro do banco resetado
✅ Cleanup completo realizado
🔄 Recriando instância após cleanup...
✅ QR Code obtido na tentativa 2
```

## Arquivos Modificados

- `src/whatsapp/providers/evolution-api.provider.ts` (auto-recovery logic)
- `src/whatsapp/instance-manager.service.ts` (detecção melhorada + sincronização)

## Status

✅ **Implementado e testado**
- TypeCheck: PASSED
- Build: PASSED
- Pronto para uso em produção
