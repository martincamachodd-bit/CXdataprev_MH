# Spec: punch-list

Módulo 3/7 do [CAPABILITY-MAP.md](./CAPABILITY-MAP.md) — CxManager. Depende de `asset-commissioning` (já implementado — ativos, roadmap, gate, `/kanban`).

Fonte: protótipo [`comissionamento-prototipo.html`](D:\Downloads\comissionamento-prototipo.html) — aba "Punch List" e o card "Regras de Gate" do dashboard.

## Objective

Fornecer o controle de pendências (punch list) do CxManager, vinculando cada punch a um ativo com categoria **A** (crítico, bloqueia L4), **B** (corrigir antes do RFO) ou **C** (observação) — e conectar essas pendências ao gate de nível que já existe em `asset-commissioning`. Hoje `lib/gate.ts` bloqueia entrada no L4 usando `Asset.punchACount`, um campo stub criado de propósito para este módulo assumir (ver `SPEC-asset-commissioning.md`, decisão de 2026-08-20). Este módulo substitui esse contador manual por dados reais, e fecha uma regra que o protótipo já anuncia no dashboard mas `asset-commissioning` não implementou: **RFO (entrada no L5) exige zero pendências abertas, de qualquer categoria** — não só punch A.

Usuários: mesmos perfis de sempre. Abrir um punch é uma ação nova — **`punch.create`**, adicionada à matriz de `lib/permissions.ts`, concedida a Campo, Qualidade e Aprovador (quem faz o trabalho de campo/qualidade é quem encontra a pendência). Fechar continua com as ações que já existem: `punch.close_bc` (Campo, Qualidade, Aprovador) fecha B/C; `punch.close_a` (só Aprovador) fecha A — é por isso que A é a categoria que trava o gate.

Sucesso = um usuário consegue: abrir um punch a partir do drawer de um ativo (categoria, título, descrição, responsável, prazo); ver a lista de punches com filtros (categoria, status, ativo); fechar um punch dentro da permissão do seu perfil, com o fechamento registrado (quem, quando); tentar avançar um ativo pro L4 com punch A aberto continua bloqueado, agora com dado real; tentar avançar um ativo pro L5 com qualquer punch aberto (A, B ou C) é bloqueado — tanto pelo botão do drawer quanto pelo Kanban, sem lógica duplicada, como já é o padrão do gate.

## Tech Stack

Mesma base do projeto (Next.js 16, TypeScript strict, Prisma/Postgres, Auth.js v5, Vitest + Playwright). Nenhuma dependência nova.

## Commands

Mesmos comandos já documentados no `README.md`. Nenhum comando novo.

## Project Structure

```
src/
  app/
    (app)/
      punch/
        page.tsx              → lista de punches (filtros: categoria, status, ativo/tag)
        actions.ts             → abrir punch, fechar punch
        PunchList.tsx
      ativos/
        AssetDrawer.tsx         → + botão "Abrir punch" (estende o já existente, não recria)
  lib/
    permissions.ts              → + ação `punch.create` (campo, qualidade, aprovador)
    gate.ts                     → canAdvance ganha um parâmetro pra pendências totais abertas (bloqueia L5)
    assets.ts                   → getAssetSummaries: `punchACount` passa a ser calculado ao vivo da tabela Punch, não mais lido do campo stub
prisma/
  schema.prisma                  → + Punch, PunchCategoria, PunchStatus; remove Asset.punchACount (stub cumpriu seu papel)
tests/
  unit/
    gate.test.ts                 → + casos de bloqueio do L5 por pendência aberta (A, B ou C)
    permissions.test.ts          → + casos de `punch.create`
    punch.test.ts                → regras puras de punch, se houver (ex.: quem pode fechar qual categoria)
  e2e/
    punch-open-close.spec.ts     → abrir, listar, filtrar, fechar (por perfil)
    gate-real-punches.spec.ts    → L4 bloqueado por punch A real; L5 bloqueado por qualquer punch aberto
```

## Code Style

`canAdvance` (já existente, `lib/gate.ts`) ganha um parâmetro para o total de pendências abertas, usado só na entrada do L5 — a assinatura e as regras de L1-L4 não mudam, é uma extensão aditiva:

```ts
export function canAdvance(
  fromLevel: Level,
  toLevel: Level,
  validatedProgressPct: number,
  openPunchACount: number,
  openPunchTotalCount: number
): GateResult {
  // ...regras existentes (sequência, regressão, progresso, L4 × punch A)...

  if (toLevel === "L5" && openPunchTotalCount > 0) {
    return {
      ok: false,
      reason: `RFO bloqueado: ${openPunchTotalCount} pendência(s) aberta(s) (A, B ou C). Encerre todas antes do RFO.`,
    };
  }

  return { ok: true };
}
```

`advanceLevelAction` (`ativos/actions.ts`) passa a calcular `openPunchACount`/`openPunchTotalCount` com `db.punch.count(...)` em vez de ler `asset.punchACount`. `getAssetSummaries` (`lib/assets.ts`) faz o mesmo para a lista e o Kanban — mesmo formato de dado exposto pra UI (`AssetSummary.punchACount`), só a fonte muda de um campo stub pra uma contagem real.

Fechamento de punch centralizado numa única action com checagem de categoria:

```ts
export async function closePunchAction(punchId: string, resolutionNote?: string) {
  const session = await auth();
  const punch = await db.punch.findUniqueOrThrow({ where: { id: punchId } });
  const action = punch.categoria === "A" ? "punch.close_a" : "punch.close_bc";
  if (!session?.user || !can(session.user.role, action)) {
    return { error: "Você não tem permissão para encerrar esse punch." };
  }
  // ...
}
```

## Testing Strategy

- **Unit (Vitest):**
  - `gate.test.ts` — casos novos: L5 bloqueado com `openPunchTotalCount > 0` (mesmo com progresso 100%); L5 liberado com zero pendências; confirmar que os casos antigos (L1-L4) continuam passando com a assinatura estendida.
  - `permissions.test.ts` — `punch.create` pra cada papel (campo/qualidade/aprovador: sim; nenhum outro papel existe que devesse ser não).
- **E2E (Playwright):**
  - Campo (ou Qualidade/Aprovador) abre um punch A num ativo pelo drawer; punch aparece na lista `/punch`.
  - Campo fecha um punch B/C; Campo tenta fechar um punch A e é recusado no servidor (não só UI escondida).
  - Aprovador fecha um punch A.
  - Ativo com punch A aberto (real, não mais o campo stub) não avança pro L4 — reaproveita o mesmo teste de bloqueio já existente em `gate-transitions.spec.ts`/`kanban.spec.ts`, agora com dado de verdade.
  - Ativo com um punch B aberto (mas zero punch A) consegue entrar no L4, mas não consegue entrar no L5 até fechar esse punch B também.

## Boundaries

- **Sempre:** validar `can()` no servidor em toda mutação (abrir, fechar), com a categoria do punch decidindo qual ação checar; registrar quem abriu e quem fechou cada punch, nunca uma mudança de status silenciosa.
- **Perguntar antes:** adicionar uma quarta categoria de punch; vincular "responsável" a um usuário do sistema em vez de texto livre (hoje é texto livre de propósito — muitas vezes é uma empresa/disciplina externa, não um login do CxManager); mudar a regra do RFO pra aceitar punch B/C aberto com justificativa (o protótipo é explícito: "sem exceção").
- **Nunca:** deixar `Asset.punchACount` como fonte de verdade depois deste módulo — remover o campo do schema é intencional, não um esquecimento; permitir que `punch.close_bc` feche um punch categoria A (a separação de ação por categoria é o que torna A confiável como trava de gate).

## Success Criteria

- [ ] Usuário com `punch.create` (Campo, Qualidade ou Aprovador) abre um punch a partir do drawer de um ativo, escolhendo categoria, título, descrição, responsável e prazo.
- [ ] `/punch` lista todos os punches com filtros por categoria, status (aberto/fechado) e ativo.
- [ ] Campo/Qualidade fecham um punch B ou C; tentativa de fechar um punch A por esses perfis é recusada no servidor.
- [ ] Aprovador fecha um punch de qualquer categoria, inclusive A.
- [ ] Todo fechamento registra quem fechou e quando.
- [ ] Ativo com pelo menos um punch A aberto não avança pro L4 — usando contagem real da tabela `Punch`, não mais o campo stub.
- [ ] Ativo com qualquer punch aberto (A, B ou C) não avança pro L5, mesmo com progresso do L4 em 100%.
- [ ] `Asset.punchACount` removido do schema; toda leitura de "quantos punch A esse ativo tem aberto" vem de uma contagem real.
- [ ] Testes que hoje simulam punch aberto criando um `Asset` com `punchACount` diretamente (`gate-transitions.spec.ts`, `kanban.spec.ts`) atualizados para criar um `Punch` de verdade.
- [ ] Todos os itens de "Testing Strategy" implementados e passando.

## Open Questions

- **Quem pode abrir um punch:** assumi Campo, Qualidade e Aprovador (nova ação `punch.create`, mesma distribuição de `punch.close_bc`) — confirmar que faz sentido todo mundo poder abrir, já que fechar é que é escalonado por categoria.
- **Regra do RFO (L5 exige zero pendências, de qualquer categoria):** o protótipo anuncia essa regra no dashboard mas `asset-commissioning` não a implementou (só L4 × punch A estava no escopo daquele módulo). Assumi que é este módulo que fecha essa lacuna — confirmar que está certo trazer isso pra cá em vez de tratar como um módulo futuro à parte.
- **Prazo do punch:** o protótipo mostra datas curtas tipo "28/07" sem indicar o que acontece quando vence (só aparece destacado no relatório diário, que é um módulo futuro). Este módulo grava o prazo mas não implementa alerta de vencimento — isso fica pro módulo `daily-report`. Confirmar que é essa a divisão esperada.
