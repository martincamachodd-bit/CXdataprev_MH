# Spec: ai-assistant

Módulo 7/7 (o último) do [CAPABILITY-MAP.md](./CAPABILITY-MAP.md) — CxManager. Depende de `asset-commissioning`, `certificates` (ambos já implementados).

Fonte: protótipo [`comissionamento-prototipo.html`](D:\Downloads\comissionamento-prototipo.html) — aba "Assistente IA" (`#page-ia`, função `aiReply()`/`RESP`).

## Objective

Chat de consulta em linguagem natural sobre o estado da obra. Decisão de escopo já tomada em 2026-08-18: **mockado no MVP, hooks pra IA real (Claude API) numa fase futura** — sem chamada de LLM de verdade neste módulo.

O protótipo responde com texto fictício fixo, casado por palavra-chave (`RESP` — um array de `{k: palavras-chave, r: resposta fixa}` com números de certificado e documentos inventados). Seguindo a mesma regra já aplicada em `energization` e `daily-report` (nunca reproduzir o texto fictício do protótipo — toda resposta reflete dado real), este módulo reaproveita o mesmo mecanismo de casamento por palavra-chave do protótipo, mas troca as respostas fixas por **respostas montadas na hora a partir do banco real**, reaproveitando as libs já existentes de cada módulo dependente.

Duas decisões confirmadas com o usuário em 2026-08-30:

1. **4 intents no MVP**, iguais aos exemplos do protótipo — cada um casado por palavra-chave e resolvido com dado real:
   - **Status de um ativo** (por TAG) — nível atual, progresso validado no nível, punch A aberto, status de energização. Reaproveita `getAssetSummaries()` + `computeEnergizationStatuses()`.
   - **Quais ativos estão prontos pro L4** — ativos no L3 com 100% validado e zero punch A. Reaproveita `getAssetSummaries()`.
   - **Documentos de um ativo** — lista os `AssetDocument` de uma TAG. Reaproveita o schema já existente, nenhuma lib nova.
   - **Certificados vencendo** — reaproveita `getSystemWarnings()`/`certificateStatus()` de `daily-report`/`certificates`.
   - O que não casar com nenhum intent cai numa mensagem genérica explicando que é um mock e sugerindo os 4 exemplos.
2. **Conversa efêmera, só no client** — sem `ChatMessage` no schema, sem histórico entre sessões. Estado vive em `useState`, some ao recarregar a página — mesmo espírito do array em memória do protótipo.

Sucesso = qualquer usuário logado abre `/assistente`, faz uma pergunta que casa com um dos 4 intents e recebe uma resposta com dado real do banco (nunca o texto fictício do protótipo); uma pergunta que não casa recebe a mensagem genérica; nada é persistido.

## Tech Stack

Mesma base do projeto. Nenhuma dependência nova, **nenhuma migration** — 100% derivado de dados que já existem (`Asset`, `AssetDocument`, `Certificate`, mais as libs de `asset-commissioning`, `energization`, `certificates`/`daily-report`).

## Commands

Mesmos comandos já documentados no `README.md`. Nenhum comando novo.

## Project Structure

```
src/
  app/
    (app)/
      assistente/
        page.tsx           → busca uma TAG real (pra sugestão de exemplo) + role, passa pro client
        AssistantChat.tsx    → client — lista de mensagens (useState, efêmero), input + sugestões, chama askAssistant via useTransition
        actions.ts           → "use server" — askAssistant(query): busca só o que o intent precisa e chama os formatadores de lib/assistant.ts
  lib/
    assistant.ts             → matchIntent() + um formatador por intent — funções puras (ver Code Style)
tests/
  unit/
    assistant.test.ts        → matchIntent() e cada formatador testados isoladamente com dados simples
  e2e/
    ai-assistant.spec.ts     → cada um dos 4 intents responde com dado real cadastrado; pergunta sem match cai na mensagem genérica; nada persiste (reload limpa a conversa)
```

## Code Style

Mesmo padrão de `lib/dailyReport.ts`: casamento de intent e formatação de resposta são funções puras, testáveis sem banco; `actions.ts` faz a busca mínima que cada intent precisa e chama os formatadores.

```ts
// lib/assistant.ts

export type Intent =
  | { kind: "asset_status"; tag: string }
  | { kind: "documents"; tag: string }
  | { kind: "ready_l4" }
  | { kind: "certificates_expiring" }
  | { kind: "unknown" };

// Mesmo truque do protótipo pra evitar acentuação: casa por radicais sem
// acento ("calibra" cobre calibração/calibrar/recalibração). Ordem importa —
// "documentos de X" tem prioridade sobre "status de X" quando os dois casam.
export function matchIntent(query: string, knownTags: string[]): Intent {
  const q = query.toLowerCase();
  const tag = knownTags.find((t) => q.includes(t.toLowerCase()));

  if (tag && /document|relat[oó]rio|anexo|upload/.test(q)) {
    return { kind: "documents", tag };
  }
  if (/certificado|vencendo|calibra/.test(q)) {
    return { kind: "certificates_expiring" };
  }
  if (/pronto|l4/.test(q)) {
    return { kind: "ready_l4" };
  }
  if (tag) {
    return { kind: "asset_status", tag };
  }
  return { kind: "unknown" };
}

export type AssistantReply = { text: string; source: string };

export function formatAssetStatusReply(asset: {
  tag: string;
  nome: string;
  nivelAtual: string;
  progressPct: number;
  punchACount: number;
  energizationStatus: "en" | "lb" | "ag" | "bl";
} | null): AssistantReply { /* ... — null quando a TAG não existe */ }

export function formatDocumentsReply(
  tag: string,
  documents: { filename: string; stepLabel: string; uploadedByName: string | null }[]
): AssistantReply { /* ... */ }

export function formatReadyL4Reply(
  assets: { tag: string; nome: string }[]
): AssistantReply { /* ... */ }

export function formatCertificatesExpiringReply(
  warnings: { instrumento: string; status: "warn" | "exp"; diasRestantes: number }[]
): AssistantReply { /* ... */ }

export function formatUnknownReply(): AssistantReply { /* ... — sugere os 4 exemplos, deixa claro que é um mock */ }
```

`AssistantChat.tsx` chama `askAssistant(query)` diretamente (server action invocada por `onClick`/Enter, envolta em `useTransition` — mesmo padrão de `executeStepAction`/`getAssetDetail` já usado no drawer), nunca via `useActionState`/`<form>` (não é um formulário de campos fixos, é uma pergunta livre repetida).

## Testing Strategy

- **Unit (Vitest):**
  - `matchIntent`: pergunta com TAG conhecida e palavra de documento → `documents`; só TAG conhecida → `asset_status`; "certificados vencendo"/"calibração" → `certificates_expiring`; "prontos pro L4" → `ready_l4`; nada casa → `unknown`; documento tem prioridade sobre status quando os dois casam na mesma pergunta.
  - `formatAssetStatusReply`: ativo real formatado corretamente; TAG que não existe (`null`) retorna mensagem clara de "não encontrado".
  - `formatDocumentsReply`: lista vazia retorna "nenhum documento"; lista com itens formata cada um.
  - `formatReadyL4Reply`: lista vazia retorna "nenhum ativo pronto"; lista com itens formata a contagem certa.
  - `formatCertificatesExpiringReply`: lista vazia retorna "nenhum certificado vencendo"; warn e exp formatados diferente.
  - `formatUnknownReply`: sempre menciona que é um mock e lista os 4 exemplos.
- **E2E (Playwright):** cadastra via Prisma um ativo com punch A aberto e etapa energizada, um documento anexado, e um certificado vencendo; confere que cada uma das 4 perguntas de exemplo responde com esse dado real (nunca o texto do protótipo); confere que uma pergunta aleatória sem match cai na mensagem genérica; confere que recarregar a página limpa a conversa (nada persiste).

## Boundaries

- **Sempre:** toda resposta reflete dado real do banco no momento da pergunta — nenhuma resposta fixa/fictícia como no protótipo.
- **Perguntar antes:** trocar o casamento por palavra-chave por uma chamada real de LLM (Claude API); persistir histórico de conversa; ampliar os intents além dos 4 combinados.
- **Nunca:** inventar dado na resposta — quando não há informação real (TAG inexistente, lista vazia), a resposta diz isso explicitamente em vez de improvisar.

## Success Criteria

- [ ] `/assistente` abre com uma mensagem inicial e sugestões de pergunta baseadas em dado real (não uma TAG fictícia fixa).
- [ ] Perguntar pelo status de uma TAG real responde com nível, progresso, punch A e status de energização daquele ativo específico.
- [ ] Perguntar "quais ativos prontos pro L4" responde com a lista real de ativos no L3 100% validado e zero punch A.
- [ ] Perguntar pelos documentos de uma TAG real responde com os documentos de fato anexados àquele ativo (ou diz que não há nenhum).
- [ ] Perguntar por certificados vencendo responde com os certificados reais em "warn"/"exp" (via `certificateStatus`).
- [ ] Uma pergunta sem nenhum casamento de intent recebe a mensagem genérica explicando que é um mock.
- [ ] Recarregar a página limpa a conversa — nada é persistido.
- [ ] Todos os itens de "Testing Strategy" implementados e passando.

## Open Questions

Nenhuma nova além das já registradas nas duas perguntas confirmadas com o usuário (4 intents reaproveitando as libs já existentes; conversa efêmera sem persistência) — ambas com decisão tomada, não suposição.
