# Implementation Plan: ai-assistant

Módulo 7/7 (o último) do [CAPABILITY-MAP.md](../CAPABILITY-MAP.md). Spec: [SPEC-ai-assistant.md](../SPEC-ai-assistant.md). Continua no mesmo projeto (`cxmanager/`) — não é um projeto novo.

## Overview

Chat de consulta mockado (sem LLM real) que responde 4 tipos de pergunta com dado real do banco, via casamento de palavra-chave — nunca reproduzindo o texto fictício do protótipo. Último módulo do CxManager; ao fechar, os 7/7 do `CAPABILITY-MAP.md` ficam completos.

## Architecture Decisions

- **4 intents no MVP** — status de ativo por TAG, ativos prontos pro L4, documentos de um ativo, certificados vencendo — cada um reaproveitando uma lib já existente (`lib/assets.ts`, `lib/energization.ts`, `lib/certificates.ts`/`lib/dailyReport.ts`). O que não casa cai numa mensagem genérica que deixa claro que é um mock.
- **Conversa efêmera, só no client** — sem `ChatMessage` no schema, sem histórico entre sessões, estado em `useState`, some ao recarregar.
- **Casamento por radical sem acento** (mesmo truque do protótipo: `"calibra"` cobre calibração/calibrar) — evita normalização de acentuação.
- **Prioridade de intent**: "documentos" bate na frente de "status de ativo" quando os dois casam na mesma pergunta (ex.: "documentos do MSB-1A").
- **Sugestões de exemplo usam uma TAG real** (buscada no servidor), não uma TAG fictícia fixa como no protótipo.
- **Sem permissão nova** — página de consulta, aberta a qualquer papel logado, mesmo padrão de `/kanban`, `/energizacao`, `/relatorio`.
- **`askAssistant` é uma server action chamada direto do client** (`onClick`/Enter + `useTransition`), não um `<form>`/`useActionState` — é uma pergunta livre repetida, não um formulário de campos fixos, mesmo padrão de `getAssetDetail`/`executeStepAction` no drawer.

## Task List

### Tarefa 1: `lib/assistant.ts` — casamento de intent + formatação de resposta

- **Descrição:** `matchIntent(query, knownTags)` e os 5 formatadores (`formatAssetStatusReply`, `formatDocumentsReply`, `formatReadyL4Reply`, `formatCertificatesExpiringReply`, `formatUnknownReply`) exatamente como no Code Style de `SPEC-ai-assistant.md`. Tudo puro, sem acesso a banco.
- **Aceitação:**
  - [ ] Pergunta com TAG conhecida + palavra de documento → `documents` (prioridade sobre `asset_status`)
  - [ ] Só TAG conhecida → `asset_status`
  - [ ] "certificados vencendo"/"calibração" → `certificates_expiring`
  - [ ] "prontos pro L4" → `ready_l4`
  - [ ] Nada casa → `unknown`
  - [ ] `formatAssetStatusReply(null)` (TAG inexistente) retorna mensagem clara de "não encontrado"
  - [ ] `formatDocumentsReply`/`formatReadyL4Reply`/`formatCertificatesExpiringReply` com lista vazia retornam mensagem de "nada encontrado", não uma lista em branco
  - [ ] `formatUnknownReply` sempre menciona que é um mock e lista os 4 exemplos
- **Verificação:** `npm run test` — `tests/unit/assistant.test.ts` cobrindo cada caso acima.
- **Dependências:** Nenhuma.
- **Arquivos:** `src/lib/assistant.ts`, `tests/unit/assistant.test.ts`
- **Escopo estimado:** M

### Checkpoint: Lógica de intent e resposta
- [ ] `npx tsc --noEmit`, `npm run lint` sem erro
- [ ] Todos os casos de `Testing Strategy` cobertos e passando
- [ ] Revisar com o usuário antes de construir a página

### Tarefa 2: `/assistente` — server action, chat UI, e2e

- **Descrição:** `actions.ts` (`"use server"`) com `askAssistant(query)` — casa o intent contra as TAGs conhecidas (`getAssetSummaries()`), busca só o mínimo que o intent precisa (documentos: `AssetDocument` da TAG; certificados: `Certificate` + `certificateStatus`; prontos-pro-L4 e status: já vem de `getAssetSummaries()`/`computeEnergizationStatuses()`), chama o formatador certo. `page.tsx` busca uma TAG real (primeira em ordem alfabética) pra fundamentar as sugestões de exemplo. `AssistantChat.tsx` (client): lista de mensagens em `useState`, input + Enter/botão de enviar, 4 chips de sugestão, chama `askAssistant` direto envolto em `useTransition`.
- **Aceitação:**
  - [ ] As 4 perguntas de exemplo respondem com dado real cadastrado (nunca o texto do protótipo)
  - [ ] Pergunta sem match cai na mensagem genérica de mock
  - [ ] Recarregar a página limpa a conversa (nada persiste)
- **Verificação:** `npm run test:e2e -- ai-assistant` cobrindo os 3 itens acima; depois suíte completa pra regressão.
- **Dependências:** Tarefa 1.
- **Arquivos:** `src/app/(app)/assistente/{page.tsx,AssistantChat.tsx,actions.ts}`, `tests/e2e/ai-assistant.spec.ts`
- **Escopo estimado:** M

### Checkpoint: Módulo completo (e projeto completo — 7/7)
- [ ] Todos os critérios de sucesso de `SPEC-ai-assistant.md` revisados um a um contra teste real
- [ ] `npx tsc --noEmit`, `npm run lint`, `rm -rf .next && npm run build` (rota `/assistente` como `ƒ` dinâmica), `npm run test`, `npm run test:e2e` (suíte completa) passando
- [ ] `CAPABILITY-MAP.md` (7/7) + memória do projeto atualizados

## Risks and Mitigations

| Risco | Impacto | Mitigação |
|---|---|---|
| Casamento por palavra-chave dar falso positivo (ex.: pergunta menciona uma TAG só de passagem, não pedindo status dela) | Baixo | Aceito conscientemente — é um mock documentado como tal; `formatUnknownReply`/mensagens sempre deixam claro o que está sendo respondido, e a spec já define a ordem de prioridade entre intents |
| Esquecer `force-dynamic` na página (armadilha recorrente) | Baixo | Checklist da Tarefa 2 inclui conferir no `npm run build` que a rota aparece como `ƒ`, não `○` |
| Sugestão de exemplo referenciar uma TAG que deixou de existir entre o fetch e o clique (ativo excluído nesse meio-tempo) | Muito baixo | Não há exclusão de ativo no sistema (só criação) — cenário não ocorre na prática |

## Open Questions

Nenhuma — as duas decisões de arquitetura (4 intents reaproveitando as libs já existentes; conversa efêmera sem persistência) já foram confirmadas com o usuário antes da spec ser escrita.
