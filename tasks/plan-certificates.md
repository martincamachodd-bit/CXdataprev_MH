# Implementation Plan: certificates

Módulo 4/7 do [CAPABILITY-MAP.md](../CAPABILITY-MAP.md). Spec: [SPEC-certificates.md](../SPEC-certificates.md). Continua no mesmo projeto (`cxmanager/`) — não é um projeto novo.

## Overview

Cadastro de instrumentos de calibração com status calculado ao vivo a partir da validade (válido/vencendo em 30 dias/vencido). Menor módulo até agora: nenhuma permissão nova (`certificates.manage` já existe), nenhum campo stub, nenhuma integração com `asset-commissioning` — puramente aditivo.

## Architecture Decisions

- **Nenhuma permissão nova** — `certificates.manage` (Qualidade, Aprovador) já existe na matriz desde `auth-permissions`.
- **Status nunca armazenado, sempre calculado** — mesma filosofia de `progressPct`/`punchACount` em `lib/assets.ts`: uma função pura (`certificateStatus`) computa o status a partir da validade em toda leitura, nunca um campo persistido que possa ficar desatualizado.
- **"Vida restante" usa o intervalo real de cada instrumento** (`validade - dataCalibracao`), não um ano fixo como o protótipo — decisão já registrada na spec.
- **Registro append-only** — sem editar/excluir certificado; recalibração = novo registro. Sem ações de update/delete neste módulo.
- **Sem filtros na lista** — poucos instrumentos numa obra; o próprio protótipo não tem filtro nessa página. KPIs contam a partir da mesma lista renderizada, nunca uma query separada, pra nunca divergir.

## Task List

### Phase 1: Modelo de dados + lógica de status

- [ ] **Tarefa 1: Schema Prisma — Certificate**
  - **Descrição:** Model `Certificate` (instrumento, numeroSerie, numeroCertificado, laboratorio, dataCalibracao, validade, uso, createdAt, createdById → User). Sem enum de status (calculado, nunca armazenado). Migration normal via `prisma migrate dev` (mudança puramente aditiva, não-destrutiva — sem repetir o workaround não-interativo de `punch-list`).
  - **Aceitação:**
    - [ ] `npx prisma migrate dev` cria a tabela sem erro
    - [ ] Relação `User → Certificate` (quem cadastrou) resolvida corretamente
  - **Verificação:** `npx prisma studio` mostra a tabela; `npm run build` sem erro.
  - **Dependências:** Nenhuma.
  - **Arquivos:** `prisma/schema.prisma`, nova migration
  - **Escopo estimado:** S

- [ ] **Tarefa 2: `lib/certificates.ts` — cálculo de status**
  - **Descrição:** `certificateStatus(validade, hoje?)` retornando `{ status: "ok"|"warn"|"exp", diasRestantes }`. `diasRestantes < 0` → exp; `<= 30` → warn; senão ok. Mesmo padrão de `lib/gate.ts` (função pura, testável sem banco).
  - **Aceitação:**
    - [ ] Vencido (diasRestantes negativo) → "exp"
    - [ ] Vencendo (0 a 30 dias, incluindo os dois limites exatos) → "warn"
    - [ ] Válido (31+ dias) → "ok"
  - **Verificação:** `npm run test` — casos de borda exatos (29, 30, 31 dias; exatamente 0; negativo).
  - **Dependências:** Nenhuma.
  - **Arquivos:** `lib/certificates.ts`, `tests/unit/certificates.test.ts`
  - **Escopo estimado:** S

### Checkpoint: Modelo de dados + status
- [ ] `npx prisma migrate dev` aplicado sem erro
- [ ] `certificateStatus` com 100% dos casos de borda cobertos em unit test
- [ ] Revisar com o usuário antes de construir qualquer página

### Phase 2: Lista, KPIs, cadastro

- [ ] **Tarefa 3: Página `/certificados` — KPIs + lista**
  - **Descrição:** `page.tsx` (Server Component, `force-dynamic`) busca todos os certificados, calcula status/diasRestantes/vida-restante-% por linha via `certificateStatus`. `CertificateTable.tsx` (Client) renderiza a tabela e os 3 KPIs (válidos/vencendo/vencidos) — contados a partir da mesma lista já calculada, nunca uma query separada.
  - **Aceitação:**
    - [ ] Lista mostra todos os certificados cadastrados com o status certo pra cada validade
    - [ ] KPIs batem exatamente com a contagem da tabela
  - **Verificação:** teste e2e conferindo KPIs após um cadastro novo.
  - **Dependências:** Tarefas 1, 2.
  - **Arquivos:** `app/(app)/certificados/page.tsx`, `app/(app)/certificados/CertificateTable.tsx`
  - **Escopo estimado:** M

- [ ] **Tarefa 4: Cadastrar certificado (Qualidade/Aprovador)**
  - **Descrição:** `createCertificateAction` (`certificates.manage`) + `NewCertificateForm.tsx` (mesmo padrão de `useActionState` de `NewAssetForm.tsx`/`CreateUserForm.tsx`), renderizado condicionalmente em `page.tsx` só pra quem tem permissão.
  - **Aceitação:**
    - [ ] Qualidade ou Aprovador cadastra um certificado novo e ele aparece na lista
    - [ ] Campo não vê nem consegue acionar o cadastro (checagem no servidor)
  - **Verificação:** teste e2e cobrindo cadastro + Campo sem acesso.
  - **Dependências:** Tarefa 3.
  - **Arquivos:** `app/(app)/certificados/actions.ts`, `app/(app)/certificados/NewCertificateForm.tsx`
  - **Escopo estimado:** M

### Checkpoint: Módulo completo
- [ ] Todos os critérios de sucesso de `SPEC-certificates.md` revisados um a um contra teste real
- [ ] `npm run build`, `npm run test`, `npm run test:e2e` passando
- [ ] Pronto para revisão humana antes de iniciar `energization`

## Risks and Mitigations

| Risco | Impacto | Mitigação |
|---|---|---|
| KPIs calculados numa query separada da lista podem divergir dela | Baixo | Decisão já tomada: contar a partir do mesmo array já buscado/calculado pra renderizar a tabela, nunca uma segunda query |
| Esquecer `force-dynamic` na página (armadilha já vista em `asset-commissioning`) | Baixo | Checklist da Tarefa 3 inclui verificar no `npm run build` que a rota aparece como `ƒ` (dinâmica), não `○` (estática) |

## Open Questions

Nenhuma nova além das já registradas em `SPEC-certificates.md` (Campo só consulta, registro append-only, bloqueio real adiado) — todas com suposição já assumida e aprovada para seguir.
