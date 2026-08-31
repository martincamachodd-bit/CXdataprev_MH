# Implementation Plan: energization

Módulo 5/7 do [CAPABILITY-MAP.md](../CAPABILITY-MAP.md). Spec: [SPEC-energization.md](../SPEC-energization.md). Continua no mesmo projeto (`cxmanager/`) — não é um projeto novo.

## Overview

Árvore de dependência de fontes (`Asset.fonteA`) com status de energização calculado ao vivo por ativo: Energizado / Liberado / Aguardando fonte / Bloqueado. Menor módulo até agora: nenhum schema novo, nenhuma migration, nenhuma permissão nova, nenhuma mutação — é 100% derivado de dados que `asset-commissioning` e `punch-list` já gravam.

## Architecture Decisions

- **"Energizado" reaproveita a etapa `ene` do L3** (`AssetStepCompletion` com `level: "L3", stepId: "ene", validatedAt` preenchido) — decisão confirmada com o usuário, zero campo novo.
- **N+1 (fonte A + fonte B) fica só visual** — a leitura de "liberado" considera só `fonteA` (fonte principal); `lib/gate.ts` não é tocado neste módulo.
- **Status nunca armazenado, sempre calculado** — mesma filosofia de `progressPct`/`punchACount` (`lib/assets.ts`) e `certificateStatus` (`lib/certificates.ts`): função pura recalculada a cada leitura.
- **Punch A sempre prevalece** — mesmo um ativo com `ene` validada aparece como "Bloqueado" se tiver punch A aberto (reaproveita a mesma contagem de `getAssetSummaries()`).
- **Fonte não cadastrada = fonte externa, nunca erro** — `fonteA` é texto livre desde `asset-commissioning`; se não bate com nenhuma TAG existente, é tratada como sempre disponível (ex.: "Concessionária").
- **Ciclo de fontes não trava a página** — proteção defensiva com `Set` de "em resolução"; dado ruim vira "Aguardando", nunca uma tela quebrada.
- **Reaproveita `AssetDrawer` e `getAssetSummaries()` sem alteração nenhuma** — mesmo padrão de composição já usado por `/kanban`.

## Task List

### Tarefa 1: `lib/energization.ts` — cascata de status + profundidade

- **Descrição:** `computeEnergizationStatuses(assets)` — função pura que resolve a cascata via `fonteA` → TAG, com punch A sempre prevalecendo sobre `ene` validada, fonte externa/ausente sempre disponível, e proteção contra ciclo (exatamente como no Code Style de `SPEC-energization.md`). Segunda função pequena, `computeSourceDepth(assets)` — contagem de saltos até uma fonte externa/raiz, só para indentação na UI, com a mesma proteção contra ciclo (profundidade máxima limitada por segurança).
- **Aceitação:**
  - [ ] Ativo sem `fonteA` (ou fonte não cadastrada) e sem `ene` validada → "lb"
  - [ ] Ativo cuja fonte tem `ene` validada, ele mesmo sem `ene` validada e sem punch A → "lb"
  - [ ] Ativo cuja fonte ainda não está energizada → "ag"
  - [ ] Ativo com `ene` validada → "en"
  - [ ] Ativo com `ene` validada **e** punch A aberto → "bl" (punch A prevalece)
  - [ ] Ciclo de fontes (A depende de B, B depende de A) não trava — cai em "ag" para os dois
  - [ ] `computeSourceDepth` retorna 0 para fonte externa/ausente e a contagem certa de saltos numa cadeia de 2–3 níveis
- **Verificação:** `npm run test` — todos os casos acima como testes individuais em `tests/unit/energization.test.ts`.
- **Dependências:** Nenhuma.
- **Arquivos:** `src/lib/energization.ts`, `tests/unit/energization.test.ts`
- **Escopo estimado:** S

### Checkpoint: Lógica de cascata
- [ ] `npx tsc --noEmit`, `npm run lint` sem erro
- [ ] Todos os casos de `Testing Strategy` da spec cobertos e passando
- [ ] Revisar com o usuário antes de construir a página

### Tarefa 2: Página `/energizacao` — árvore por célula + drawer

- **Descrição:** `page.tsx` (Server Component, `force-dynamic`) busca `getAssetSummaries()` + as `AssetStepCompletion` validadas de `level: "L3", stepId: "ene"`, monta o Set de ativos energizados, calcula status e profundidade via `lib/energization.ts`, passa tudo pro client. `EnergizationTree.tsx` (Client) agrupa por célula (mesmo padrão `Array.from(new Set(...)).sort()` de `KanbanBoard`), renderiza cada ativo indentado pela profundidade com um badge de status (4 cores, legenda igual à do protótipo), um card "Regra do sistema" estático, e abre o `AssetDrawer` já existente ao clicar (mesmo `selectedId` + `key={selected.id}` de `KanbanBoard`).
- **Aceitação:**
  - [ ] `/energizacao` mostra os ativos agrupados por célula com o status certo
  - [ ] Ativo cuja fonte principal tem `ene` validada aparece como "Liberado"
  - [ ] Ativo com `ene` validada aparece como "Energizado"
  - [ ] Esse mesmo ativo, com um punch A aberto contra ele, aparece como "Bloqueado"
  - [ ] Fonte não cadastrada nunca quebra a página
  - [ ] Clicar num ativo abre o `AssetDrawer` com o detalhe certo
- **Verificação:** `npm run test:e2e -- energization` cobrindo os 4 primeiros itens de aceitação acima; depois suíte completa pra regressão.
- **Dependências:** Tarefa 1.
- **Arquivos:** `src/app/(app)/energizacao/page.tsx`, `src/app/(app)/energizacao/EnergizationTree.tsx`, `tests/e2e/energization.spec.ts`
- **Escopo estimado:** M

### Checkpoint: Módulo completo
- [ ] Todos os critérios de sucesso de `SPEC-energization.md` revisados um a um contra teste real
- [ ] `npx tsc --noEmit`, `npm run lint`, `rm -rf .next && npm run build` (rota `/energizacao` como `ƒ` dinâmica), `npm run test`, `npm run test:e2e` passando
- [ ] `CAPABILITY-MAP.md` + memória do projeto atualizados, pronto pra revisão humana antes de iniciar `daily-report`

## Risks and Mitigations

| Risco | Impacto | Mitigação |
|---|---|---|
| Referência cruzada entre células (ex.: um transformador de célula 1 alimentando um ativo da célula 2) quebrar o agrupamento visual | Baixo | Resolução de `fonteA` é global (por TAG), não escopada por célula — cada ativo aparece na sua própria célula, a fonte é só um texto de referência, nunca precisa "pertencer" à mesma célula |
| Esquecer `force-dynamic` na página (armadilha já vista em `asset-commissioning`) | Baixo | Checklist da Tarefa 2 inclui conferir no `npm run build` que a rota aparece como `ƒ`, não `○` |
| Ciclo de fontes num dado real mal cadastrado travar a resolução recursiva | Baixo | Já cobrado por unit test dedicado na Tarefa 1, com `Set` de "em resolução" nas duas funções |

## Open Questions

Nenhuma — as duas decisões de arquitetura (energizado deriva da etapa `ene`; N+1 só visual) já foram confirmadas com o usuário antes da spec ser escrita.
