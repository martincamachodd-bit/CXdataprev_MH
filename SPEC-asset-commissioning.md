# Spec: asset-commissioning

Módulo 2/7 do [CAPABILITY-MAP.md](./CAPABILITY-MAP.md) — CxManager. Depende de `auth-permissions` (já implementado — sessão, `can()`, perfis Campo/Qualidade/Aprovador).

Fonte: protótipo [`comissionamento-prototipo.html`](D:\Downloads\comissionamento-prototipo.html) — abas "Ativos" e "Kanban".

## Objective

Fornecer o núcleo de comissionamento do CxManager: cadastro dos ~400 ativos elétricos da obra, cada um com seu roadmap de 5 níveis (L1→L5), checklist de etapas por nível com regras de não-aplicabilidade por tipo de ativo, upload de documento comprobatório por etapa, lista filtrável, drawer de detalhe do ativo, e visão Kanban para avançar de nível com validação automática de gate.

Usuários: os mesmos perfis de `auth-permissions` — **Campo** (executa etapas, anexa documentos), **Qualidade** (valida etapas executadas), **Aprovador** (tudo, mais cadastra/edita a base de ativos e aprova transições de gate). Nenhuma permissão nova precisa ser criada — este módulo reaproveita `checklist.edit`, `checklist.validate`, `gate.approve_transition` e `assets.edit_base`, todas já definidas em `lib/permissions.ts`.

Sucesso = um usuário consegue: ver a base de ativos com filtros (busca, tipo, célula, nível, status); abrir o drawer de um ativo e ver seu progresso nível a nível com as etapas aplicáveis ao seu tipo (etapas N/A puladas automaticamente); marcar uma etapa como executada e depois validada (dentro da permissão do seu perfil) e anexar o documento exigido; avançar o nível do ativo — por botão ou arrastando no Kanban — só quando o gate permitir, com toda tentativa inválida recusada e explicada; e toda transição de nível fica registrada com quem e quando (rastreabilidade), nunca silenciosa.

## Tech Stack

Mesma base já em uso em `cxmanager/`: Next.js 16 (App Router), TypeScript strict, Prisma + PostgreSQL (nativo, ver `README.md`), Auth.js v5 (sessão já configurada), Vitest (unit) + Playwright (e2e). Nenhuma dependência nova de auth/sessão/permissão.

**Upload de documentos:** sistema de arquivos local — `cxmanager/uploads/` (fora do controle de versão), caminho relativo salvo no banco. Server Actions do Next recebem `File` via `FormData` nativamente; grava-se com `fs/promises`. Sem storage em nuvem no MVP — decisão confirmada com o usuário em 2026-08-20; troca por S3-compatível é extensão futura direta (ver Boundaries).

## Commands

Mesmos comandos já documentados no `README.md` do projeto (`npm run dev`, `build`, `test`, `test:e2e`, `npx prisma migrate dev`, `npx prisma db seed`). Nenhum comando novo.

## Project Structure

```
src/
  app/
    (app)/
      ativos/
        page.tsx              → lista + filtros (busca, tipo, célula, nível, status)
        actions.ts             → concluir/validar etapa, anexar doc, criar/editar ativo
        AssetTable.tsx
        AssetDrawer.tsx         → drawer client (stepper L1→L5, checklist expansível, fontes)
        NewAssetForm.tsx        → Aprovador cadastra ativo (tag, nome, tipo, célula, fonte A/B)
      kanban/
        page.tsx
        KanbanBoard.tsx         → client, drag-and-drop entre colunas L1→L5
  lib/
    roadmap.ts                 → NIVEIS + ROADMAP (checklist por nível, regras de N/A por tipo) — dados puros
    gate.ts                    → canAdvance(asset, progressoNivelAtual, nivelAlvo) — função pura
    uploads.ts                 → helpers salvar/ler arquivo local, sanitização de nome
prisma/
  schema.prisma                 → + Asset, AssetType, Level, AssetStepCompletion, AssetDocument, LevelTransition
tests/
  unit/
    roadmap.test.ts             → etapas aplicáveis por tipo, tabela de casos de skip
    gate.test.ts                → sequência obrigatória, regressão bloqueada, punch A no L4, progresso <100%
  e2e/
    assets-list.spec.ts         → filtros da lista
    asset-drawer-checklist.spec.ts → checklist correto por tipo, executar/validar, anexar doc
    gate-transitions.spec.ts    → avanço válido/ inválido por botão
    kanban.spec.ts              → drag-and-drop respeita o mesmo gate
```

## Code Style

Roadmap e regras de gate centralizados em funções puras, testáveis sem banco — mesmo padrão de `lib/permissions.ts`:

```ts
// lib/roadmap.ts
export type Level = "L1" | "L2" | "L3" | "L4" | "L5";
export type AssetType = "XFM" | "MSB" | "UPS" | "ATS" | "ADP" | "PDU" | "CRAC" | "QDL";

export type RoadmapStep = {
  id: string;
  label: string;
  docPattern?: string;   // ex.: "FAT-{tag}.pdf"
  skipFor?: AssetType[]; // tipos para os quais a etapa é N/A
};

export const ROADMAP: Record<Level, RoadmapStep[]> = { /* ... */ };

export function applicableSteps(level: Level, tipo: AssetType): RoadmapStep[] {
  return ROADMAP[level].filter((s) => !s.skipFor?.includes(tipo));
}
```

```ts
// lib/gate.ts
export function canAdvance(
  fromLevel: Level,
  toLevel: Level,
  validatedProgressPct: number,
  punchACount: number
): { ok: true } | { ok: false; reason: string } {
  // sequência obrigatória, sem pular gate, sem regressão, L4 exige punchACount === 0,
  // sempre exige validatedProgressPct === 100 no nível atual
}
```

Toda rota/server action que muda estado de um ativo chama `can(session.user.role, "...")` no servidor antes de gravar — a UI pode esconder controles (ex.: Campo não vê o botão "Validar"), mas a checagem que importa é sempre no backend, como em `auth-permissions`.

**Conclusão de etapa em duas fases:** cada etapa do checklist tem `executedAt/executedById` (ação `checklist.edit`, perfil Campo ou Aprovador) e `validatedAt/validatedById` (ação `checklist.validate`, perfil Qualidade ou Aprovador), separados — uma etapa só conta pro progresso do nível (e portanto pro gate) quando **validada**, não apenas executada. Isso é uma extensão sobre o protótipo (que mostra um único checkbox) para refletir a distinção que a matriz de permissões de `auth-permissions` já define entre `checklist.edit` e `checklist.validate`. Ver Open Questions.

## Testing Strategy

- **Unit (Vitest):**
  - `roadmap.test.ts` — para cada tipo de ativo, tabela de casos confirmando quais etapas de cada nível são aplicáveis vs. N/A (baseado nos `skipFor` do protótipo).
  - `gate.test.ts` — matriz de casos: avanço sequencial válido; pular nível (bloqueado); regressão (bloqueada); entrar no L4 com `punchACount > 0` (bloqueado); avançar com progresso validado < 100% (bloqueado).
- **E2E (Playwright):**
  - Lista de ativos: cada filtro (busca, tipo, célula, nível, status) reduz a lista corretamente.
  - Drawer: abrir um ativo de tipo com etapas N/A (ex. CRAC pula megger) e confirmar que a etapa aparece marcada como N/A, não como pendente.
  - Campo executa uma etapa; Qualidade valida a mesma etapa; confirmar que o progresso do nível só sobe após a validação.
  - Anexar documento a uma etapa e confirmar que aparece associado, com quem enviou.
  - Tentar avançar nível sem 100% validado → recusado com mensagem clara (botão e drag-and-drop).
  - Avançar nível com 100% validado e sem punch A → sucesso, nível muda, transição fica registrada (quem/quando).
  - Tentar pular gate (ex. L1 → L3 direto) → sempre recusado, mesmo com 100%.
  - Ativo com `punchACount > 0` tentando entrar no L4 → recusado.
  - Kanban: arrastar um card para uma coluna inválida mostra toast de erro e o card volta pra coluna original.

## Boundaries

- **Sempre:** validar permissão no servidor (`can()`) em toda mutação (marcar/validar etapa, anexar doc, criar/editar ativo, avançar nível), mesmo que a UI já esconda o controle; gravar `LevelTransition` (ativo, de, para, quem, quando) em toda mudança de nível — nunca uma transição silenciosa; sanitizar nome de arquivo no upload (nunca usar o nome original como caminho no disco — gerar nome interno, preservar o original só como metadado exibido).
- **Perguntar antes:** permitir regressão de nível mesmo com justificativa (protótipo menciona, MVP não implementa — ver Open Questions); trocar storage local por serviço em nuvem; mudar a lista fixa de tipos de ativo ou as regras de N/A do roadmap sem entender o impacto; construir import em massa (CSV/planilha) da base inicial de ativos.
- **Nunca:** permitir avanço de nível com etapas aplicáveis pendentes de validação; permitir entrada no L4 com `punchACount > 0`; aceitar o nome de arquivo enviado pelo cliente como caminho de disco (risco de path traversal); expor caminho absoluto do servidor na resposta ao client.

## Success Criteria

- [ ] Lista de ativos carrega os ativos cadastrados e todos os filtros (busca por tag/nome, tipo, célula, nível, status) funcionam combinados.
- [ ] Drawer de um ativo mostra o stepper L1→L5 e, para o nível atual, exatamente as etapas aplicáveis ao seu tipo — etapas N/A aparecem marcadas como tal, nunca como pendência.
- [ ] Usuário Campo consegue marcar uma etapa como executada; usuário Qualidade consegue validar uma etapa já executada; nenhum dos dois perfis marca uma etapa como validada sem ela estar executada primeiro.
- [ ] Progresso do nível (usado pelo gate) só considera etapas validadas, não apenas executadas.
- [ ] Upload de documento numa etapa grava o arquivo em disco local, associa ao ativo/etapa/usuário, e aparece na UI como anexado.
- [ ] Tentativa de avançar nível com progresso validado < 100% é recusada, com mensagem explicando o motivo — pelo botão do drawer e pelo drag-and-drop do Kanban.
- [ ] Tentativa de pular gate (avançar mais de um nível de uma vez) é sempre recusada, mesmo com 100% de progresso.
- [ ] Ativo com `punchACount > 0` não consegue avançar para o L4.
- [ ] Avanço de nível válido registra uma `LevelTransition` com ativo, nível de origem, nível de destino, usuário e timestamp.
- [ ] Usuário Aprovador cadastra um novo ativo (tag, nome, tipo, célula, fonte A/B) pela UI; usuários Campo/Qualidade não veem nem conseguem acionar essa criação (checagem no servidor).
- [ ] Todos os itens de "Testing Strategy" implementados e passando.

## Open Questions

- **Checklist em duas fases (executado/validado):** o protótipo mostra um único checkbox por etapa, mas a matriz de `auth-permissions` já separa `checklist.edit` (Campo) de `checklist.validate` (Qualidade) como ações distintas. Assumi que isso significa um fluxo de duas fases (execução → validação), com o progresso do gate contando só etapas validadas — confirmar que é essa a intenção, ou se as duas ações deveriam apenas permitir que ambos os perfis marquem o mesmo checkbox único (sem fase de validação separada).
- **Cadastro inicial dos ~400 ativos:** o MVP cobre criar um ativo por vez pela UI (Aprovador). A carga inicial da base real de ~400 ativos fica fora do MVP — assumi que entra via script de seed/import feito à parte (fora da UI) quando for hora de popular a base real. Confirmar se isso é aceitável ou se precisa de uma tela de import em massa já nesta fase.
- **Regressão de nível com justificativa:** o protótipo menciona a possibilidade ("regressão de nível exige justificativa e aprovação do gerente") mas não implementa. Deixei fora do MVP — nenhum nível pode regredir. Confirmar se isso é aceitável por enquanto ou se é bloqueante pra algum fluxo real da obra.
- **Fonte A / Fonte B:** neste módulo ficam como campos de texto livre (referência à tag de outro ativo), sem validação de que o ativo referenciado existe e sem a árvore de energização — isso é trabalho do módulo `energization` (que depende deste). Confirmar que essa divisão de responsabilidade está correta.
