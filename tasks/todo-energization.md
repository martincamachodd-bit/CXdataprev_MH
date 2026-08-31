# Todo: energization

Plano completo: [tasks/plan-energization.md](./plan-energization.md). Spec: [SPEC-energization.md](../SPEC-energization.md).

## Tarefas

- [x] Tarefa 1: `lib/energization.ts` — cascata de status + profundidade — `computeEnergizationStatuses` (punch A sempre prevalece, fonte externa sempre disponível, ciclo protegido) + `computeSourceDepth` (indentação, teto defensivo `MAX_DEPTH`); 12 unit tests novos, 77/77 passando
- [x] Tarefa 2: Página `/energizacao` — árvore por célula + drawer — `page.tsx` (força dinâmica, cruza `getAssetSummaries()` com a etapa `ene` do L3) + `EnergizationTree.tsx` (agrupa por célula, indenta por profundidade, legenda de 4 cores, reaproveita `AssetDrawer` sem alteração); achado e corrigido durante a verificação: os Maps da lib são indexados por TAG (necessário pra cascata), mas o client component lê por `id` — corrigido reindexando em `page.tsx`, único lugar com as duas chaves; 3 e2e novos, 45/45 passando

### Checkpoint: Lógica de cascata
- [x] `npx tsc --noEmit` / `npm run lint` sem erro
- [x] Todos os casos de `Testing Strategy` cobertos e passando (incluindo ciclo de fontes, que não trava)
- [ ] Revisar com o usuário antes de construir a página

### Checkpoint: Módulo completo
- [x] Todos os critérios de sucesso de `SPEC-energization.md` revisados um a um contra teste real — todos atendidos, sem ressalva
- [x] `npx tsc --noEmit`, `npm run lint`, `rm -rf .next && npm run build` (`/energizacao` como `ƒ` dinâmica), `npm run test` (77 unit), `npm run test:e2e` (45 e2e, suíte completa) passando
- [x] `CAPABILITY-MAP.md` + memória do projeto atualizados
