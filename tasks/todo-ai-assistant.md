# Todo: ai-assistant

Plano completo: [tasks/plan-ai-assistant.md](./plan-ai-assistant.md). Spec: [SPEC-ai-assistant.md](../SPEC-ai-assistant.md).

Último módulo do CxManager (7/7).

## Tarefas

- [x] Tarefa 1: `lib/assistant.ts` — casamento de intent + formatação de resposta — `matchIntent` (prioridade documents > asset_status) + 5 formatadores; 14 unit tests novos, 112/112 passando
- [x] Tarefa 2: `/assistente` — server action, chat UI, e2e — `askAssistant` busca só o mínimo por intent (reaproveita `getAssetSummaries()`, `computeEnergizationStatuses()`, `certificateStatus()`/`getSystemWarnings()`), sugestões fundamentadas numa TAG real buscada no servidor, chat efêmero em `useState`; verificado ao vivo no navegador (resposta real pra "Status da ADP-1A?" incluindo punch A aberto), 3 e2e novos, 51/51 passando

### Checkpoint: Lógica de intent e resposta
- [x] `npx tsc --noEmit` / `npm run lint` sem erro
- [x] Todos os casos de `Testing Strategy` cobertos e passando
- [ ] Revisar com o usuário antes de construir a página

### Checkpoint: Módulo completo (e projeto completo — 7/7)
- [x] Todos os critérios de sucesso de `SPEC-ai-assistant.md` revisados um a um contra teste real — todos atendidos, sem ressalva
- [x] `npx tsc --noEmit`, `npm run lint`, `rm -rf .next && npm run build` (`/assistente` como `ƒ` dinâmica), `npm run test` (112 unit), `npm run test:e2e` (51 e2e, suíte completa) passando
- [x] `CAPABILITY-MAP.md` (7/7) + memória do projeto atualizados
