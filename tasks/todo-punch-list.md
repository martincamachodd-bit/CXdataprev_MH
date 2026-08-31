# Todo: punch-list

Plano completo: [tasks/plan-punch-list.md](./plan-punch-list.md). Spec: [SPEC-punch-list.md](../SPEC-punch-list.md).

## Phase 1: Modelo de dados de punch + permissão

- [x] Tarefa 1: Schema Prisma — Punch — `PunchCategoria`/`PunchStatus` enums, model `Punch` (assetId cascade, createdBy restrict, closedBy set-null); migration aplicada, estrutura conferida via psql
- [x] Tarefa 2: `punch.create` na matriz de permissões — campo/qualidade/aprovador; 53/53 testes unit (30 casos da matriz)

### Checkpoint: Modelo de dados + permissão
- [x] `npx prisma migrate dev` aplicado sem erro
- [x] Matriz de permissões 100% coberta em unit test (30 casos)
- [ ] Revisar com o usuário antes de construir qualquer página

## Phase 2: Abrir e listar punches

- [x] Tarefa 3: Abrir punch (server action + botão no drawer) — `openPunchAction` (`punch.create`), `OpenPunchForm.tsx` no `AssetDrawer`; e2e confirmando o punch criado no banco associado ao ativo e a quem abriu
- [x] Tarefa 4: Página `/punch` — lista com filtros — `PunchList.tsx` (busca por ativo, categoria, status); e2e cobrindo os 3 filtros combinados

### Checkpoint: Abrir e listar
- [x] Abrir um punch pelo drawer e vê-lo aparecer em `/punch` funciona ponta a ponta
- [ ] Revisar com o usuário antes de implementar fechamento + integração com o gate

## Phase 3: Fechar punches + regra de gate

- [x] Tarefa 5: Fechar punch (server action + botão na lista) — `closePunchAction` (categoria decide `punch.close_a`/`punch.close_bc`); botão "Encerrar" em `PunchList.tsx`; 4 e2e (Campo fecha B, Campo/Qualidade sem botão pra A, Aprovador fecha A)
- [x] Tarefa 6: `canAdvance` — regra do L5 (RFO exige zero pendências) — parâmetro `openPunchTotalCount` opcional (default 0), 100% retrocompatível; 4 casos unit novos, os 9 antigos intactos sem edição

### Checkpoint: Fechar + regra de gate
- [x] Fechamento de punch funciona ponta a ponta, escalonado por categoria
- [x] `canAdvance` cobre a regra do L5 isoladamente (unit), ainda não plugado em nenhuma UI
- [ ] Revisar com o usuário antes de aposentar o campo stub

## Phase 4: Aposentar o stub, plugar dado real

- [x] Tarefa 7: Remover `Asset.punchACount`, plugar contagem real — migration manual (não-interativa) removendo a coluna; `advanceLevelAction` e `getAssetSummaries` agora usam `db.punch.count`/`groupBy`; seed atualizado (2 punches A reais em vez do campo stub)
- [x] Tarefa 8: Atualizar testes que simulavam punch via o campo stub — feito junto da Tarefa 7 (o `tsc` acusou 4 referências quebradas em 3 arquivos ao rodar a verificação; corrigidas antes de seguir, não deixadas pra depois)

### Checkpoint: Stub aposentado
- [x] Nenhum código lê `punchACount` como coluna do banco (a coluna não existe) — confirmado via `tsc --noEmit` limpo e grep no código-fonte
- [x] `npm run build`, `npm run test` (57 unit), `npm run test:e2e` (37 e2e, suíte completa) passando

## Phase 5: Fechamento do módulo

- [x] Tarefa 9: E2E de fechamento — `gate-real-punches.spec.ts` (punch B não trava L4, trava L5 até ser fechado — cenário que não existia antes deste módulo) + reforço em `punch-open-close.spec.ts` (punch aberto pelo drawer aparece de fato em `/punch`)

### Checkpoint: Módulo completo
- [x] Todos os critérios de sucesso de `SPEC-punch-list.md` revisados um a um contra teste real — todos atendidos, sem ressalva
- [x] `npm run build`, `npm run test` (57 unit), `npm run test:e2e` (39 e2e) passando
- [x] Pronto para revisão humana antes de iniciar `certificates`/`energization`
