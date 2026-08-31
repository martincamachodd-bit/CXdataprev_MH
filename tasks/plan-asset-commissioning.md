# Implementation Plan: asset-commissioning

Módulo 2/7 do [CAPABILITY-MAP.md](../CAPABILITY-MAP.md). Spec: [SPEC-asset-commissioning.md](../SPEC-asset-commissioning.md). Continua no mesmo projeto de `auth-permissions` (`cxmanager/`) — não é um projeto novo.

## Overview

Cadastro de ativos com roadmap L1→L5, checklist de etapas por nível (execução por Campo, validação por Qualidade), upload de documento por etapa, avanço de nível com gate automático (botão no drawer + drag-and-drop no Kanban), e cadastro de ativo pelo Aprovador. Reaproveita 100% da sessão/permissões de `auth-permissions` — nenhuma ação nova na matriz.

## Architecture Decisions

- **Nenhuma permissão nova** — `checklist.edit`, `checklist.validate`, `gate.approve_transition` e `assets.edit_base` já existem em `lib/permissions.ts` (Tarefa 5 do módulo 1) e cobrem exatamente as ações deste módulo.
- **Checklist em duas fases (executado/validado)** — decisão confirmada na spec: uma etapa só conta pro progresso/gate quando validada por Qualidade (ou Aprovador), não basta ser executada por Campo.
- **`punchACount` como campo stub no `Asset`** — decisão confirmada com o usuário em 2026-08-20. O gate do L4 já valida de verdade; o módulo `punch-list` assume esse campo quando for construído.
- **Roadmap e regras de gate como funções puras** (`lib/roadmap.ts`, `lib/gate.ts`) — mesmo padrão de `lib/permissions.ts`: dados/lógica centralizados, testáveis sem banco, nunca reimplementados nas duas UIs (drawer e Kanban chamam a mesma server action de avanço).
- **Upload em disco local** (`cxmanager/uploads/`, gitignored) — decisão confirmada com o usuário em 2026-08-20. Sem dependência nova; Server Actions recebem `File` via `FormData` nativamente.
- **Sem regressão de nível e sem import em massa no MVP** — confirmado na spec (Open Questions).

## Task List

### Phase 1: Fundação de dados

- [ ] **Tarefa 1: Schema Prisma — Asset e tabelas relacionadas**
  - **Descrição:** Adicionar ao `schema.prisma`: enums `AssetType` (XFM/MSB/UPS/ATS/ADP/PDU/CRAC/QDL) e `Level` (L1..L5); model `Asset` (tag único, nome, tipo, celula, fonteA/fonteB opcionais, nivelAtual default L1, punchACount default 0); `AssetStepCompletion` (assetId, level, stepId, executedAt/By, validatedAt/By, único por assetId+level+stepId); `AssetDocument` (assetId, level, stepId, filename, storedPath, uploadedAt/By); `LevelTransition` (assetId, fromLevel, toLevel, at, byId). Rodar migration. Seed de dev com uns 6-8 ativos cobrindo tipos diferentes (inclusive um tipo com regra de skip, ex. CRAC) para testar roadmap/gate depois.
  - **Aceitação:**
    - [ ] `npx prisma migrate dev` cria as tabelas sem erro
    - [ ] Seed cria ativos de tipos variados, visíveis via `prisma studio`
    - [ ] Relações `User → AssetStepCompletion/AssetDocument/LevelTransition` (quem executou/validou/enviou/transicionou) resolvidas corretamente
  - **Verificação:** `npx prisma studio` mostra as tabelas e os dados do seed; `npm run build` sem erro (Prisma Client gerado).
  - **Dependências:** Nenhuma (módulo 1 já dá a base de User/Role/sessão).
  - **Arquivos:** `prisma/schema.prisma`, nova migration em `prisma/migrations/`, `prisma/seed.ts` (estender)
  - **Escopo estimado:** M

- [ ] **Tarefa 2: `lib/roadmap.ts` — níveis, checklist e regras de N/A**
  - **Descrição:** Portar do protótipo: `NIVEIS` (nome/descrição por nível), `ROADMAP` (etapas por nível, com `docPattern` e `skipFor` por tipo), e `applicableSteps(level, tipo)`. Dados puros, sem I/O.
  - **Aceitação:**
    - [ ] `applicableSteps` retorna as etapas certas pra cada combinação nível × tipo do protótipo (ex.: CRAC pula megger e termografia)
    - [ ] Etapa marcada `skipFor` nunca aparece como aplicável pro tipo listado
  - **Verificação:** `npm run test` — tabela de casos cobrindo cada tipo × nível.
  - **Dependências:** Nenhuma.
  - **Arquivos:** `lib/roadmap.ts`, `tests/unit/roadmap.test.ts`
  - **Escopo estimado:** S

- [ ] **Tarefa 3: `lib/gate.ts` — regra de avanço de nível**
  - **Descrição:** `canAdvance(fromLevel, toLevel, validatedProgressPct, punchACount)` — bloqueia pular gate, bloqueia regressão, bloqueia entrada no L4 com `punchACount > 0`, exige `validatedProgressPct === 100` no nível atual antes de avançar.
  - **Aceitação:**
    - [ ] Avanço sequencial válido (L1→L2 com 100%) retorna ok
    - [ ] Pular nível (L1→L3) sempre bloqueado, mesmo com 100%
    - [ ] Regressão (L3→L2) sempre bloqueada
    - [ ] L3→L4 com `punchACount > 0` bloqueado; com 0 e 100%, ok
    - [ ] Avanço com `validatedProgressPct < 100` bloqueado
  - **Verificação:** `npm run test` — matriz de casos.
  - **Dependências:** Nenhuma.
  - **Arquivos:** `lib/gate.ts`, `tests/unit/gate.test.ts`
  - **Escopo estimado:** S

### Checkpoint: Fundação de dados
- [ ] `npx prisma migrate dev` + seed funcionam sem erro
- [ ] `roadmap.ts` e `gate.ts` com 100% dos casos da spec cobertos em unit test
- [ ] Revisar com o usuário antes de construir qualquer página

### Phase 2: Lista e detalhe do ativo

- [ ] **Tarefa 4: Página `/ativos` — lista com filtros**
  - **Descrição:** Server Component busca todos os ativos; Client Component de filtros (busca por tag/nome, tipo, célula, nível, status) filtrando client-side (mesmo padrão do protótipo, ~400 ativos cabe em memória). Tabela com tag/nome, célula, fonte A/B, nível (badge colorido), progresso do nível atual, status.
  - **Aceitação:**
    - [ ] Lista mostra todos os ativos do seed
    - [ ] Cada filtro reduz a lista corretamente, combinados entre si
    - [ ] Clicar numa linha abre o drawer do ativo (Tarefa 5)
  - **Verificação:** `npm run test:e2e` — `assets-list.spec.ts` cobrindo cada filtro.
  - **Dependências:** Tarefa 1.
  - **Arquivos:** `app/(app)/ativos/page.tsx`, `app/(app)/ativos/AssetTable.tsx`, `tests/e2e/assets-list.spec.ts`
  - **Escopo estimado:** M

- [ ] **Tarefa 5: Drawer de detalhe do ativo (leitura)**
  - **Descrição:** Client Component (estado local de qual ativo está aberto, dado buscado via server action). Stepper L1→L5, box de fontes A/B, blocos expansíveis por nível mostrando `applicableSteps` com estado (pendente/executado/validado/N-A) — ainda sem poder marcar nada, só visualizar.
  - **Aceitação:**
    - [ ] Abrir um ativo mostra o stepper com o nível atual destacado
    - [ ] Nível atual mostra exatamente as etapas aplicáveis ao tipo do ativo
    - [ ] Etapa N/A aparece marcada como tal, nunca como pendência
  - **Verificação:** teste e2e cobrindo abertura do drawer de um ativo com regra de skip (ex. CRAC) e confirmando a etapa N/A.
  - **Dependências:** Tarefas 2, 4.
  - **Arquivos:** `app/(app)/ativos/AssetDrawer.tsx`, `app/(app)/ativos/actions.ts` (leitura)
  - **Escopo estimado:** M

- [ ] **Tarefa 6: Executar / validar etapa**
  - **Descrição:** Server actions `executeStepAction` (`checklist.edit` — Campo/Aprovador) e `validateStepAction` (`checklist.validate` — Qualidade/Aprovador) gravando `executedAt/By`/`validatedAt/By` em `AssetStepCompletion`. UI no drawer: Campo vê "marcar executado"; Qualidade vê "validar" (desabilitado até estar executado); Aprovador vê os dois. Progresso do nível recalculado só com etapas validadas.
  - **Aceitação:**
    - [ ] Campo executa uma etapa; Qualidade consegue validar essa etapa depois
    - [ ] Qualidade não consegue validar etapa ainda não executada
    - [ ] Campo não vê nem consegue acionar "validar" (checagem no servidor, não só UI escondida)
    - [ ] Progresso do nível só sobe após validação, não após execução isolada
  - **Verificação:** `npm run test:e2e` — `asset-drawer-checklist.spec.ts` cobrindo execução, validação, e tentativa de burlar (Campo chamando validação direto).
  - **Dependências:** Tarefa 5.
  - **Arquivos:** `app/(app)/ativos/actions.ts`
  - **Escopo estimado:** M

- [ ] **Tarefa 7: Upload de documento por etapa**
  - **Descrição:** `lib/uploads.ts` — sanitiza nome do arquivo, gera nome interno, grava em `cxmanager/uploads/{assetTag}/`. Server action recebe `FormData` com o arquivo, cria `AssetDocument`. Drawer mostra chip do documento (enviado vs. pendente, como no protótipo).
  - **Aceitação:**
    - [ ] Anexar um arquivo a uma etapa grava em disco e cria o registro no banco
    - [ ] Chip do documento aparece como "enviado" com quem enviou
    - [ ] Nome de arquivo malicioso (ex. `../../etc/passwd`) nunca vira caminho de disco real
  - **Verificação:** `npm run test:e2e` — upload de um arquivo de teste dentro de `asset-drawer-checklist.spec.ts`; unit test de sanitização de nome.
  - **Dependências:** Tarefa 5.
  - **Arquivos:** `lib/uploads.ts`, `tests/unit/uploads.test.ts`, `app/(app)/ativos/actions.ts` (estender)
  - **Escopo estimado:** S

### Checkpoint: Lista e detalhe do ativo
- [ ] Lista + filtros + drawer + checklist duas fases + upload funcionando ponta a ponta pra pelo menos um ativo de cada tipo do seed
- [ ] Revisar com o usuário antes de implementar o gate de avanço

### Phase 3: Gate e Kanban

- [ ] **Tarefa 8: Avançar nível (server action + botão no drawer)**
  - **Descrição:** `advanceLevelAction` — checa `can(role, "gate.approve_transition")` (só Aprovador), chama `canAdvance()` de `lib/gate.ts` com o progresso validado atual e `punchACount`, se ok grava `LevelTransition` e atualiza `nivelAtual`. Botão no drawer; mensagem de erro explicando o motivo do bloqueio (mesmo texto do protótipo: pular gate, punch A, progresso incompleto).
  - **Aceitação:**
    - [ ] Aprovador avança um ativo com 100% validado e sem punch A — sucesso, `LevelTransition` gravada
    - [ ] Tentativa de avanço sem 100% é recusada com mensagem clara
    - [ ] Tentativa de pular gate é recusada mesmo com 100%
    - [ ] Ativo com `punchACount > 0` não avança pro L4
    - [ ] Campo/Qualidade não vê nem consegue acionar o avanço (checagem no servidor)
  - **Verificação:** `npm run test:e2e` — `gate-transitions.spec.ts` cobrindo os 4 cenários de bloqueio + 1 de sucesso.
  - **Dependências:** Tarefas 3, 6.
  - **Arquivos:** `app/(app)/ativos/actions.ts` (estender), `app/(app)/ativos/AssetDrawer.tsx` (botão)
  - **Escopo estimado:** M

- [ ] **Tarefa 9: Página `/kanban` — drag-and-drop**
  - **Descrição:** 5 colunas (L1..L5), cards dos ativos filtráveis por tipo/célula (como o protótipo). Drag-and-drop chama a **mesma** `advanceLevelAction` da Tarefa 8 — nenhuma lógica de gate duplicada. Drop inválido mostra toast de erro e o card volta pro lugar.
  - **Aceitação:**
    - [ ] Arrastar um card pra uma coluna válida avança o ativo (mesmo resultado do botão do drawer)
    - [ ] Arrastar pra uma coluna inválida mostra a mesma mensagem de erro do drawer e não move o card
  - **Verificação:** `npm run test:e2e` — `kanban.spec.ts`.
  - **Dependências:** Tarefa 8.
  - **Arquivos:** `app/(app)/kanban/page.tsx`, `app/(app)/kanban/KanbanBoard.tsx`, `tests/e2e/kanban.spec.ts`
  - **Escopo estimado:** M

### Checkpoint: Gate e Kanban
- [ ] Avanço válido/inválido consistente entre botão do drawer e drag-and-drop do Kanban (mesma action, mesmo resultado)
- [ ] Toda transição de nível registrada em `LevelTransition`

### Phase 4: Cadastro de ativo

- [ ] **Tarefa 10: Formulário "Novo ativo" (Aprovador)**
  - **Descrição:** Página/seção em `/ativos` (protegida por `assets.edit_base`, mesmo padrão de `CreateUserForm` do módulo `usuarios`) — tag, nome, tipo, célula, fonte A/B. Erro claro se a tag já existir.
  - **Aceitação:**
    - [ ] Aprovador cadastra um ativo novo pela UI e ele aparece na lista
    - [ ] Campo/Qualidade não veem nem conseguem acionar essa criação
    - [ ] Tag duplicada mostra erro claro
  - **Verificação:** teste e2e cobrindo criação + tentativa de duplicata + tentativa de acesso por perfil sem permissão.
  - **Dependências:** Tarefa 4.
  - **Arquivos:** `app/(app)/ativos/NewAssetForm.tsx`, `app/(app)/ativos/actions.ts` (estender)
  - **Escopo estimado:** S

### Checkpoint: Módulo completo
- [ ] Todos os critérios de sucesso de `SPEC-asset-commissioning.md` atendidos (revisados um a um, não só "parece que sim")
- [ ] `npm run build`, `npm run test`, `npm run test:e2e` passando
- [ ] Pronto para revisão humana antes de iniciar `punch-list`/`certificates`

## Risks and Mitigations

| Risco | Impacto | Mitigação |
|---|---|---|
| Checklist em duas fases (executado/validado) é uma extensão sobre o protótipo — pode não bater com a expectativa real do usuário depois de ver funcionando | Médio | Já flagado como Open Question na spec; se o usuário rejeitar depois de ver a Tarefa 6 rodando, é uma mudança de schema pequena (colapsar pra um único `completedAt/By`) |
| Upload em disco local não sobrevive a um redeploy/reset de ambiente | Baixo | Aceito conscientemente pro MVP (decisão do usuário); trocar por storage em nuvem é boundary "perguntar antes" já documentado na spec |
| Kanban com drag-and-drop nativo do browser pode ter comportamento inconsistente entre navegadores | Baixo | Testar só em Chromium (mesmo escopo do Playwright já configurado); não é um requisito cross-browser no MVP |
| Volume de ~400 ativos filtrados client-side pode ficar lento se a lista crescer muito além disso | Baixo | Aceitável pro pilot DATAPREV; paginação/filtro server-side fica pra quando o volume justificar |

## Open Questions

Nenhuma nova além das já registradas em `SPEC-asset-commissioning.md` (checklist em duas fases, regressão de nível fora do MVP, cadastro um-a-um sem import em massa, Fonte A/B como texto livre) — todas com suposição já assumida e aprovada para seguir.
