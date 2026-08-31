# Todo: asset-commissioning

Plano completo: [tasks/plan-asset-commissioning.md](./plan-asset-commissioning.md). Spec: [SPEC-asset-commissioning.md](../SPEC-asset-commissioning.md).

## Phase 1: Fundação de dados

- [x] Tarefa 1: Schema Prisma — Asset e tabelas relacionadas — `AssetType`/`Level` enums, `Asset`, `AssetStepCompletion`, `AssetDocument`, `LevelTransition`; migration aplicada; 8 ativos seed (tipos variados, CRAC p/ skip rules, UPS-1.1 com `punchACount=1` p/ gate)
- [x] Tarefa 2: `lib/roadmap.ts` — níveis, checklist e regras de N/A — `applicableSteps()` + 6 casos unit (tabela por tipo × nível + invariante geral), 36/36 testes passando
- [x] Tarefa 3: `lib/gate.ts` — regra de avanço de nível — `canAdvance()` + 9 casos unit (sequencial, pular gate, regressão, mesmo nível, progresso <100%, punch A no L4), 45/45 testes passando

### Checkpoint: Fundação de dados
- [x] `npx prisma migrate dev` + seed funcionam sem erro
- [x] `roadmap.ts` e `gate.ts` com 100% dos casos da spec cobertos em unit test
- [ ] Revisar com o usuário antes de construir qualquer página

## Phase 2: Lista e detalhe do ativo

- [x] Tarefa 4: Página `/ativos` — lista com filtros — `AssetTable.tsx` (busca/tipo/célula/nível/status), status derivado (bloqueado/em espera/concluído/em andamento) a partir de `punchACount` e progresso validado; `AssetDrawer.tsx` como shell (conteúdo completo na Tarefa 5); 2 e2e passando
- [x] Tarefa 5: Drawer de detalhe do ativo (leitura) — `actions.ts` (`getAssetDetail`) + corpo completo do `AssetDrawer.tsx` (stepper L1-L5, fontes A/B, níveis expansíveis com checklist mostrando pendente/executado/validado/N-A); 2 e2e passando
- [x] Tarefa 6: Executar / validar etapa — `executeStepAction`/`validateStepAction` (checagem dupla: UI esconde botão errado por papel + servidor re-checa `can()`); progresso do nível só sobe com validação; e2e cobrindo Campo executa → Qualidade valida → progresso muda só depois da validação
- [x] Tarefa 7: Upload de documento por etapa — `lib/uploads.ts` (`sanitizeFilename` independente de SO, 5 casos unit incluindo path traversal) + `saveUploadedFile`; `uploadDocumentAction`; chips de documento no drawer (pendente/enviado + quem enviou); e2e cobrindo upload real via input de arquivo

### Checkpoint: Lista e detalhe do ativo
- [x] Lista + filtros + drawer + checklist duas fases + upload funcionando ponta a ponta pra pelo menos um ativo de cada tipo do seed
- [ ] Revisar com o usuário antes de implementar o gate de avanço

## Phase 3: Gate e Kanban

- [x] Tarefa 8: Avançar nível (server action + botão no drawer) — `advanceLevelAction` (só `gate.approve_transition`, reaproveita `canAdvance` da Tarefa 3); botão "Avançar para L{n+1}" no drawer. 5 e2e: sucesso registra `LevelTransition`, bloqueio por progresso <100%, bloqueio por punch A no L4, Campo/Qualidade não veem o botão. **Ressalva:** o botão só oferece o próximo nível (por construção nunca oferece pular gate), então o cenário "pular gate mesmo com 100%" não tem e2e via essa UI — já tem 100% de cobertura unit (Tarefa 3) e ganha e2e de verdade na Tarefa 9 (Kanban aceita soltar em qualquer coluna)
- [x] Tarefa 9: Página `/kanban` — drag-and-drop — `KanbanBoard.tsx` (5 colunas, filtros tipo/célula, drag-and-drop nativo HTML5 chamando a mesma `advanceLevelAction` da Tarefa 8, toast de sucesso/erro, drawer reaproveitado no clique do card). Extraí `lib/assets.ts` (`getAssetSummaries`) compartilhado entre `/ativos` e `/kanban` — evita duplicar a query+cálculo de progresso. 3 e2e: avanço válido, bloqueio por progresso incompleto, **e o cenário de "pular gate" que ficou pendente da Tarefa 8** — agora com cobertura e2e de verdade

### Checkpoint: Gate e Kanban
- [x] Avanço válido/inválido consistente entre botão do drawer e drag-and-drop do Kanban (mesma `advanceLevelAction`, nenhuma lógica duplicada)
- [x] Toda transição de nível registrada em `LevelTransition`

## Phase 4: Cadastro de ativo

- [x] Tarefa 10: Formulário "Novo ativo" (Aprovador) — `createAssetAction` (`assets.edit_base`), `NewAssetForm.tsx` só visível pra quem tem permissão; 4 e2e (criação aparece na lista, TAG duplicada, Campo/Qualidade sem acesso)

### Checkpoint: Módulo completo
- [x] Todos os critérios de sucesso da spec atendidos — revisados um a um contra `SPEC-asset-commissioning.md`, todos com e2e ou unit test cobrindo (nenhuma ressalva desta vez — diferente de `auth-permissions`, os critérios daqui são todos autocontidos neste módulo)
- [x] `npm run build`, `npm run test` (50 unit), `npm run test:e2e` (31 e2e) passando
- [x] Pronto para revisão humana antes de iniciar `punch-list`/`certificates`

**Nota (2026-08-29):** durante a Tarefa 10, o novo campo "Tipo" do formulário de cadastro colidiu com o filtro "Tipo" da lista (`getByRole("combobox").nth(0)` em `assets-list.spec.ts` passou a pegar o select errado). Corrigido dando `aria-label` a cada filtro (`Filtrar por tipo/célula/nível/status`) em `/ativos` e `/kanban`, e usando `{ exact: true }` nos testes do formulário — elimina a fragilidade de seletor por posição/substring pra futuras extensões da página.
