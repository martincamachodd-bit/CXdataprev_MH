# Todo: certificates

Plano completo: [tasks/plan-certificates.md](./plan-certificates.md). Spec: [SPEC-certificates.md](../SPEC-certificates.md).

## Phase 1: Modelo de dados + lógica de status

- [x] Tarefa 1: Schema Prisma — Certificate — model append-only (sem status armazenado), relação `createdBy` restrict; migration aditiva aplicada sem o workaround não-interativo (só necessário pra mudança destrutiva)
- [x] Tarefa 2: `lib/certificates.ts` — cálculo de status — `certificateStatus()` + 8 casos unit (vencido, exatamente 0, 29/30/31 dias, futuro distante, default de `hoje`); 65/65 testes passando

### Checkpoint: Modelo de dados + status
- [x] `npx prisma migrate dev` aplicado sem erro
- [x] `certificateStatus` com 100% dos casos de borda cobertos em unit test
- [x] Revisar com o usuário antes de construir qualquer página

## Phase 2: Lista, KPIs, cadastro

- [x] Tarefa 3: Página `/certificados` — KPIs + lista — `CertificateTable.tsx` (KPIs contados a partir da própria lista renderizada, nunca query separada); e2e confirmando status calculado certo e KPI de vencidos batendo com a tabela
- [x] Tarefa 4: Cadastrar certificado (Qualidade/Aprovador) — `createCertificateAction` (`certificates.manage`) + `NewCertificateForm.tsx`; e2e cobrindo cadastro completo (todos os campos), KPI de válidos batendo, e Campo sem acesso

### Checkpoint: Módulo completo
- [x] Todos os critérios de sucesso de `SPEC-certificates.md` revisados um a um contra teste real — todos atendidos, sem ressalva
- [x] `npm run build`, `npm run test` (65 unit), `npm run test:e2e` (42 e2e) passando
- [x] Pronto para revisão humana antes de iniciar `energization`
