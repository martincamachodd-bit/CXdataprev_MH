# Capability Map: CxManager — Gestão de Comissionamento

Fonte: protótipo [`comissionamento-prototipo.html`](D:\Downloads\comissionamento-prototipo.html) (DATAPREV, piloto, ~400 ativos).

Decisões de escopo (confirmadas com o usuário em 2026-08-18):
- MVP full-stack real desde já (não é só front-end).
- Stack: Next.js (App Router) + Node/TypeScript.
- Assistente IA: mockado no MVP; hooks para IA real (Claude API) em fase futura.
- Mono-projeto (DATAPREV); multi-tenant/multi-projeto fica para depois.

| Módulo id | Responsabilidade | Depende de |
|---|---|---|
| `auth-permissions` | Login, sessão, perfis (Campo, Qualidade, Aprovador — Cliente adiado) e permissões por ação | — |
| `asset-commissioning` | Cadastro de ativos, roadmap L1→L5, checklist por nível (regras N/A por tipo), upload de docs, drawer de detalhe, visão Kanban com validação de gate | `auth-permissions` |
| `punch-list` | Pendências A/B/C vinculadas a ativos, bloqueio de gate (punch A trava L4) | `asset-commissioning` |
| `certificates` | Instrumentos de calibração, vencimento, bloqueio de uso vencido | `auth-permissions` |
| `energization` | Árvore de dependência de fontes (fonte A/B), status de energização em cascata | `asset-commissioning`, `punch-list` |
| `daily-report` | Relatório diário automático agregando ativos, punchs, energização e docs pendentes; geração agendada e distribuição | `asset-commissioning`, `punch-list`, `energization`, `certificates` |
| `ai-assistant` | Chat mockado hoje, com hooks para IA real depois | `asset-commissioning`, `certificates` |

**Ordem de construção:** `auth-permissions` → `asset-commissioning` → `punch-list`, `certificates` → `energization` → `daily-report` → `ai-assistant`

Cada módulo tem spec própria: `SPEC-<id>.md`, na raiz do projeto.

Status:
- [x] `auth-permissions` — completo (2026-08-20): login, sessão, proteção de rotas, matriz de permissões, gestão de usuários (criar/resetar senha), 13 e2e + 30 unit passando
- [x] `asset-commissioning` — completo (2026-08-29): cadastro de ativos, roadmap L1→L5, checklist de duas fases (executar/validar), upload de documentos, gate de avanço (drawer + Kanban), 31 e2e + 50 unit passando
- [x] `punch-list` — completo (2026-08-30): pendências A/B/C vinculadas a ativos, gate real (punch A trava L4, qualquer pendência aberta trava o RFO/L5), `Asset.punchACount` (stub) removido em favor de contagem real, 39 e2e + 57 unit passando
- [x] `certificates` — completo (2026-08-30): cadastro de instrumentos de calibração, status calculado ao vivo (válido/vencendo/vencido), KPIs sempre coerentes com a lista, 42 e2e + 65 unit passando
- [x] `energization` — completo (2026-08-30): árvore de dependência de fontes (fonte A) por célula, status de energização em cascata (energizado/liberado/aguardando/bloqueado) calculado ao vivo, zero schema novo, 45 e2e + 77 unit passando
- [x] `daily-report` — completo (2026-08-30): relatório diário sob demanda agregando ativos, punch-list, energização e certificados em 5 seções calculadas ao vivo, zero schema novo, zero persistência, 48 e2e + 98 unit passando
- [x] `ai-assistant` — completo (2026-08-30): chat de consulta mockado (sem LLM real) respondendo 4 intents com dado real via casamento de palavra-chave, conversa efêmera sem persistência, zero schema novo, 51 e2e + 112 unit passando
