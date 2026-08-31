# Implementation Plan: punch-list

Módulo 3/7 do [CAPABILITY-MAP.md](../CAPABILITY-MAP.md). Spec: [SPEC-punch-list.md](../SPEC-punch-list.md). Continua no mesmo projeto (`cxmanager/`) — não é um projeto novo.

## Overview

Modelo de dados de punch (A/B/C) vinculado a ativo, abertura pelo drawer, listagem/filtro em `/punch`, fechamento escalonado por categoria (`punch.close_a` vs `punch.close_bc`), e a peça que fecha o círculo do gate: `Asset.punchACount` (stub deixado de propósito por `asset-commissioning`) é removido e substituído por contagem real da tabela `Punch` — tanto para a regra existente (punch A trava L4) quanto para a nova regra do RFO (qualquer punch aberto trava L5).

## Architecture Decisions

- **Nova ação `punch.create`** (Campo, Qualidade, Aprovador) — única permissão nova deste módulo; fechar reaproveita `punch.close_a`/`punch.close_bc`, já existentes desde `auth-permissions`.
- **`responsavel` como texto livre** — decisão da spec: muitas vezes é uma disciplina/empresa externa, não um login do sistema.
- **Ordem das fases pensada pra nunca deixar o gate quebrado**: o stub só é removido (Fase 4) depois que a tabela `Punch` já existe e o `canAdvance` já sabe lidar com a nova regra (Fases 1-3) — nunca há uma janela onde o gate depende de um dado que não existe mais.
- **`canAdvance` ganha parâmetro, não muda comportamento existente** — `openPunchTotalCount` é aditivo; L1-L4 continuam exatamente como estavam, só L5 ganha uma regra nova.
- **`AssetSummary.punchACount` mantém nome e formato** — só a fonte muda (campo stub → `db.punch.count(...)`), então `AssetTable.tsx` e `KanbanBoard.tsx` não precisam mudar nada.
- **Regra do RFO sem exceção** — nenhuma justificativa/override pra avançar pro L5 com punch aberto, conforme o protótipo ("sem exceção") e a spec.

## Task List

### Phase 1: Modelo de dados de punch + permissão

- [ ] **Tarefa 1: Schema Prisma — Punch**
  - **Descrição:** Adicionar enums `PunchCategoria` (A/B/C) e `PunchStatus` (aberto/fechado); model `Punch` (assetId, categoria, titulo, descricao, responsavel, prazo opcional, status default aberto, resolutionNote opcional, createdAt/createdById, closedAt/closedById opcionais). Migration.
  - **Aceitação:**
    - [ ] `npx prisma migrate dev` cria a tabela sem erro
    - [ ] Relações `Asset → Punch` e `User → Punch` (criado por / fechado por) resolvidas corretamente
  - **Verificação:** `npx prisma studio` mostra a tabela; `npm run build` sem erro (Prisma Client gerado).
  - **Dependências:** Nenhuma (módulo `asset-commissioning` já dá a base de `Asset`/`User`).
  - **Arquivos:** `prisma/schema.prisma`, nova migration
  - **Escopo estimado:** S

- [ ] **Tarefa 2: `punch.create` na matriz de permissões**
  - **Descrição:** Adicionar `"punch.create"` ao union `Action` e à `MATRIX` de `lib/permissions.ts` (campo, qualidade, aprovador). Estender `tests/unit/permissions.test.ts` (tabela vira 3 papéis × 10 ações = 30 casos).
  - **Aceitação:**
    - [ ] Campo, Qualidade e Aprovador têm `punch.create`
    - [ ] Todos os casos antigos continuam passando sem alteração de expectativa
  - **Verificação:** `npm run test` — 30/30 casos da matriz.
  - **Dependências:** Nenhuma.
  - **Arquivos:** `lib/permissions.ts`, `tests/unit/permissions.test.ts`
  - **Escopo estimado:** S

### Checkpoint: Modelo de dados + permissão
- [ ] `npx prisma migrate dev` aplicado sem erro
- [ ] Matriz de permissões 100% coberta em unit test (30 casos)
- [ ] Revisar com o usuário antes de construir qualquer página

### Phase 2: Abrir e listar punches

- [ ] **Tarefa 3: Abrir punch (server action + botão no drawer)**
  - **Descrição:** `openPunchAction` em novo `app/(app)/punch/actions.ts` — checa `can(role, "punch.create")`, cria `Punch`. Botão "Abrir punch" no `AssetDrawer.tsx` (protótipo já reserva esse espaço nas ações do drawer) abrindo um formulário inline (categoria, título, descrição, responsável, prazo); mesmo padrão de `useTransition` + erro local já usado nas ações de execução/validação/upload do mesmo arquivo.
  - **Aceitação:**
    - [ ] Usuário com `punch.create` abre um punch a partir do drawer de um ativo
    - [ ] Usuário sem `punch.create` não vê nem consegue acionar o botão (checagem no servidor)
    - [ ] Punch criado aparece associado ao ativo certo, com quem abriu e quando
  - **Verificação:** teste e2e cobrindo abertura de punch pelo drawer.
  - **Dependências:** Tarefas 1, 2.
  - **Arquivos:** `app/(app)/punch/actions.ts`, `app/(app)/ativos/AssetDrawer.tsx` (estende)
  - **Escopo estimado:** M

- [ ] **Tarefa 4: Página `/punch` — lista com filtros**
  - **Descrição:** `page.tsx` (Server Component, `force-dynamic`) busca todos os punches; `PunchList.tsx` (Client) filtra por categoria, status e ativo/tag — mesmo padrão de `AssetTable`/`ativos/page.tsx`.
  - **Aceitação:**
    - [ ] Lista mostra todos os punches abertos e fechados
    - [ ] Cada filtro (categoria, status, ativo) reduz a lista corretamente, combinados
  - **Verificação:** teste e2e cobrindo os filtros.
  - **Dependências:** Tarefa 3.
  - **Arquivos:** `app/(app)/punch/page.tsx`, `app/(app)/punch/PunchList.tsx`
  - **Escopo estimado:** M

### Checkpoint: Abrir e listar
- [ ] Abrir um punch pelo drawer e vê-lo aparecer em `/punch` funciona ponta a ponta
- [ ] Revisar com o usuário antes de implementar fechamento + integração com o gate

### Phase 3: Fechar punches + regra de gate

- [ ] **Tarefa 5: Fechar punch (server action + botão na lista)**
  - **Descrição:** `closePunchAction` — a categoria decide a permissão checada (`A` → `punch.close_a`; `B`/`C` → `punch.close_bc`), grava `closedAt`/`closedById`/`resolutionNote` opcional. Botão "Encerrar" em `PunchList.tsx`.
  - **Aceitação:**
    - [ ] Campo/Qualidade fecham punch B ou C
    - [ ] Campo/Qualidade tentando fechar punch A são recusados no servidor (não só botão escondido)
    - [ ] Aprovador fecha punch de qualquer categoria
  - **Verificação:** teste e2e cobrindo fechamento por cada perfil, incluindo a tentativa negada.
  - **Dependências:** Tarefa 4.
  - **Arquivos:** `app/(app)/punch/actions.ts` (estende), `app/(app)/punch/PunchList.tsx` (estende)
  - **Escopo estimado:** M

- [ ] **Tarefa 6: `canAdvance` — regra do L5 (RFO exige zero pendências)**
  - **Descrição:** Estender `lib/gate.ts` com parâmetro `openPunchTotalCount`; bloquear entrada no L5 se `> 0`, mesmo com progresso 100%. Estender `tests/unit/gate.test.ts` com os novos casos, mantendo os antigos intactos.
  - **Aceitação:**
    - [ ] L4→L5 com `openPunchTotalCount > 0` bloqueado, mesmo com 100%
    - [ ] L4→L5 com `openPunchTotalCount = 0` e 100% permitido
    - [ ] Todos os casos anteriores (L1-L4) continuam passando sem mudança de expectativa
  - **Verificação:** `npm run test` — casos novos + todos os antigos.
  - **Dependências:** Nenhuma (função pura, independente da tabela `Punch`).
  - **Arquivos:** `lib/gate.ts`, `tests/unit/gate.test.ts`
  - **Escopo estimado:** S

### Checkpoint: Fechar + regra de gate
- [ ] Fechamento de punch funciona ponta a ponta, escalonado por categoria
- [ ] `canAdvance` cobre a regra do L5 isoladamente (unit), ainda não plugado em nenhuma UI
- [ ] Revisar com o usuário antes de aposentar o campo stub

### Phase 4: Aposentar o stub, plugar dado real

- [ ] **Tarefa 7: Remover `Asset.punchACount`, plugar contagem real**
  - **Descrição:** Migration removendo a coluna. `advanceLevelAction` (`ativos/actions.ts`) passa a calcular `openPunchACount`/`openPunchTotalCount` via `db.punch.count(...)` (categoria A / todas, status aberto) em vez de ler `asset.punchACount`. `getAssetSummaries` (`lib/assets.ts`) idem — `AssetSummary.punchACount` mantém nome/formato, só a fonte muda.
  - **Aceitação:**
    - [ ] Coluna `punchACount` não existe mais no schema
    - [ ] `advanceLevelAction` usa contagem real pras regras de L4 e L5
    - [ ] Lista `/ativos` e Kanban continuam mostrando o indicador de punch A corretamente (mesma UI, dado vindo de outro lugar)
  - **Verificação:** `npm run build` sem erro (Prisma Client regenerado sem o campo); `npx tsc --noEmit` confirma que nenhum código morto ainda referencia `punchACount` como coluna.
  - **Dependências:** Tarefas 1, 6.
  - **Arquivos:** `prisma/schema.prisma`, nova migration, `app/(app)/ativos/actions.ts`, `lib/assets.ts`
  - **Escopo estimado:** M

- [ ] **Tarefa 8: Atualizar testes que simulavam punch via o campo stub**
  - **Descrição:** `gate-transitions.spec.ts` e `kanban.spec.ts` têm um helper `createAsset({ punchACount: 1, ... })` — vira `createAsset({ ... })` + `prisma.punch.create({ data: { assetId, categoria: "A", status: "aberto", ... } })` separado. Rodar os dois arquivos inteiros de novo.
  - **Aceitação:**
    - [ ] Cenário "ativo com punch A aberto não avança pro L4" continua passando, agora criando um `Punch` de verdade
    - [ ] Nenhum teste existente quebrado pela migration da Tarefa 7
  - **Verificação:** `npm run test:e2e -- tests/e2e/gate-transitions.spec.ts tests/e2e/kanban.spec.ts`.
  - **Dependências:** Tarefa 7.
  - **Arquivos:** `tests/e2e/gate-transitions.spec.ts`, `tests/e2e/kanban.spec.ts`
  - **Escopo estimado:** S

### Checkpoint: Stub aposentado
- [ ] Nenhum código lê `punchACount` como coluna do banco (a coluna não existe)
- [ ] `npm run build`, `npm run test`, `npm run test:e2e` (suíte completa) passando

### Phase 5: Fechamento do módulo

- [ ] **Tarefa 9: E2E de fechamento — abrir/fechar por perfil + gate com dado real**
  - **Descrição:** `punch-open-close.spec.ts` (abrir, listar, filtrar, fechar por perfil, incluindo a recusa de Campo/Qualidade fechando punch A). `gate-real-punches.spec.ts` (L4 bloqueado por punch A real; L5 bloqueado por punch B aberto mesmo com L4 100% e zero punch A — cenário que não existia antes deste módulo).
  - **Aceitação:**
    - [ ] Todos os itens de "Testing Strategy" da spec cobertos
  - **Verificação:** `npm run test:e2e` (suíte completa).
  - **Dependências:** Tarefas 5, 6, 7, 8.
  - **Arquivos:** `tests/e2e/punch-open-close.spec.ts`, `tests/e2e/gate-real-punches.spec.ts`
  - **Escopo estimado:** M

### Checkpoint: Módulo completo
- [ ] Todos os critérios de sucesso de `SPEC-punch-list.md` revisados um a um contra teste real (não só "parece que sim") — inclusive os dois itens de limpeza (stub removido, testes antigos atualizados)
- [ ] `npm run build`, `npm run test`, `npm run test:e2e` passando
- [ ] Pronto para revisão humana antes de iniciar `certificates`/`energization`

## Risks and Mitigations

| Risco | Impacto | Mitigação |
|---|---|---|
| Remover `Asset.punchACount` quebra código/testes esquecidos (grep incompleto) | Médio | Tarefa 7 exige `tsc --noEmit` limpo (campo removido do tipo gerado do Prisma torna qualquer uso residual um erro de compilação, não um bug silencioso) |
| Janela entre "regra do L5 escrita" e "dado real plugado" deixar o gate temporariamimente incompleto se as fases forem puladas fora de ordem | Baixo | Ordem das fases documentada explicitamente pra evitar isso; checkpoints intermediários não devem ser pulados |
| `openPunchAction`/`closePunchAction` duplicarem a lógica de "achar o punch e checar categoria" | Baixo | Centralizar num helper único usado pelas duas actions, mesmo padrão de `findStep` em `ativos/actions.ts` |

## Open Questions

Nenhuma nova além das já registradas em `SPEC-punch-list.md` (quem pode abrir punch, escopo da regra do RFO neste módulo, prazo sem alerta de vencimento) — todas com suposição já assumida e aprovada para seguir.
