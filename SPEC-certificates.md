# Spec: certificates

Módulo 4/7 do [CAPABILITY-MAP.md](./CAPABILITY-MAP.md) — CxManager. Depende de `auth-permissions` (já implementado).

Fonte: protótipo [`comissionamento-prototipo.html`](D:\Downloads\comissionamento-prototipo.html) — aba "Certificados & Calibração".

## Objective

Cadastro dos instrumentos de calibração usados na obra (megôhmetro, torquímetro, câmera térmica etc.), com validade calculada automaticamente e alerta visual de status: **válido**, **vencendo em 30 dias** ou **vencido**. Decisão confirmada com o usuário em 2026-08-30: o "bloqueio de uso vencido" que o `CAPABILITY-MAP.md` menciona fica **só visual/alerta** no MVP — não há vínculo entre um certificado e uma etapa/documento específico do roadmap de `asset-commissioning`, e nenhuma ação do sistema é recusada automaticamente por causa de um certificado vencido. O protótipo em si também não implementa esse bloqueio de fato (só mostra o status); formalizar um bloqueio real de verdade (ex.: recusar upload de documento se o instrumento usado estiver vencido) fica pra uma fase futura, se necessário.

Usuários: **Qualidade** e **Aprovador** cadastram certificados (`certificates.manage`, ação que já existe na matriz desde `auth-permissions` — nenhuma permissão nova neste módulo). **Campo** só consulta — é útil saber qual instrumento está liberado antes de ir a campo.

Sucesso = qualquer usuário logado consegue ver a lista de certificados com status calculado automaticamente pela validade; Qualidade/Aprovador cadastram um novo certificado (instrumento, nº de série, nº do certificado, laboratório, data de calibração, validade, uso); Campo não vê nem consegue acionar o cadastro; os KPIs (válidos/vencendo/vencidos) batem com o que está na tabela.

## Tech Stack

Mesma base do projeto (Next.js 16, TypeScript strict, Prisma/Postgres, Auth.js v5, Vitest + Playwright). Nenhuma dependência nova.

## Commands

Mesmos comandos já documentados no `README.md`. Nenhum comando novo.

## Project Structure

```
src/
  app/
    (app)/
      certificados/
        page.tsx              → KPIs + lista de certificados
        actions.ts             → cadastrar certificado
        NewCertificateForm.tsx
        CertificateTable.tsx
  lib/
    certificates.ts             → certificateStatus(validade, hoje?) — função pura, mesmo padrão de lib/gate.ts
prisma/
  schema.prisma                  → + model Certificate
tests/
  unit/
    certificates.test.ts         → válido / vencendo (≤30d) / vencido, casos de borda (exatamente 30 dias, exatamente hoje)
  e2e/
    certificates.spec.ts         → cadastro, KPIs batendo com a lista, Campo sem acesso ao cadastro
```

## Code Style

Status calculado ao vivo a partir da validade — nunca armazenado, pra nunca ficar desatualizado (mesmo raciocínio de `progressPct`/`punchACount` em `lib/assets.ts`):

```ts
// lib/certificates.ts
export type CertificateStatus = "ok" | "warn" | "exp";

export function certificateStatus(
  validade: Date,
  hoje: Date = new Date()
): { status: CertificateStatus; diasRestantes: number } {
  const diasRestantes = Math.round(
    (validade.getTime() - hoje.getTime()) / 86_400_000
  );
  if (diasRestantes < 0) return { status: "exp", diasRestantes };
  if (diasRestantes <= 30) return { status: "warn", diasRestantes };
  return { status: "ok", diasRestantes };
}
```

Diferente do protótipo (que estima "vida restante" como `dias / 365`, fixo), a barra de vida restante usa o intervalo real entre calibração e validade de cada instrumento (`validade - dataCalibracao`), já que instrumentos diferentes podem ter intervalos de calibração diferentes — mais correto que assumir sempre 1 ano.

**Registro append-only:** um certificado não é editado nem excluído — uma recalibração vira um **novo** registro (novo `dataCalibracao`/`validade`), preservando o histórico. Sem ações de update/delete neste módulo.

## Testing Strategy

- **Unit (Vitest):** `certificateStatus` — vencido (diasRestantes < 0), vencendo (0-30 dias, incluindo os limites exatos 0 e 30), válido (>30 dias).
- **E2E (Playwright):**
  - Qualidade (ou Aprovador) cadastra um certificado; ele aparece na lista com o status correto pra validade escolhida.
  - Campo não vê nem consegue acionar o cadastro (checagem no servidor, não só UI escondida).
  - KPIs (válidos/vencendo/vencidos) refletem exatamente a contagem da lista após um cadastro novo.

## Boundaries

- **Sempre:** validar `can(role, "certificates.manage")` no servidor ao cadastrar, mesmo que a UI já esconda o formulário pra Campo; calcular o status a partir da validade em toda leitura, nunca gravar um status "congelado" no banco.
- **Perguntar antes:** vincular um certificado a uma etapa/documento específico do roadmap (bloqueio real de uso vencido); implementar o agendamento de verdade dos alertas por e-mail/notificação (o protótipo só simula isso — fica pra quando `daily-report` existir, mesma lógica adotada pro prazo de punch em `SPEC-punch-list.md`); permitir editar ou excluir um certificado já cadastrado.
- **Nunca:** deixar a checagem de permissão só no client; gravar/confiar num status de certificado armazenado que possa ficar desatualizado.

## Success Criteria

- [ ] `/certificados` lista todos os certificados cadastrados, com status (válido/vencendo/vencido) calculado a partir da validade de cada um.
- [ ] KPIs (válidos, vencendo em 30 dias, vencidos) no topo da página batem exatamente com a contagem da tabela abaixo.
- [ ] Qualidade ou Aprovador cadastra um certificado novo (instrumento, nº de série, nº do certificado, laboratório, data de calibração, validade, uso) e ele aparece na lista com o status certo.
- [ ] Campo não vê nem consegue acionar o cadastro de certificado — checagem no servidor.
- [ ] Todos os itens de "Testing Strategy" implementados e passando.

## Open Questions

- **Campo só consulta, não cadastra:** assumi isso por analogia com o resto do sistema (quem lida com o instrumento fisicamente em campo não é necessariamente quem administra o registro de calibração — papel mais próximo de Qualidade). Confirmar se faz sentido, ou se Campo também devia poder cadastrar um certificado que acabou de receber.
- **Sem bloqueio real de uso vencido no MVP** (decisão já confirmada 2026-08-30) — deixo registrado aqui de novo pra não ser esquecido quando `daily-report`/relatório entrar em cena, já que o protótipo menciona "relatório com instrumento vencido é recusado" como uma regra futura.
- **Registro append-only (sem editar/excluir):** assumi que uma recalibração sempre vira um novo registro. Confirmar se isso é aceitável ou se existe um caso real de precisar corrigir um certificado cadastrado errado (nesse caso, a solução mais simples seria permitir exclusão só de registros criados por engano, não uma edição de dado histórico).
