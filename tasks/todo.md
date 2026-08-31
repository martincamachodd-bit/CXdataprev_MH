# Todo: auth-permissions

Plano completo: [tasks/plan.md](./plan.md). Spec: [SPEC-auth-permissions.md](../SPEC-auth-permissions.md).

**Nota (2026-08-20):** Docker Desktop nunca recuperou do socket órfão `sailor-ingest.sock` (nem com admin, nem reconstruindo a distro WSL, nem com reboot completo — erro 1920/reparse point não suportado). Resolvido indo de plano B: Postgres nativo via `winget install PostgreSQL.PostgreSQL.16`, role/db `cxmanager` criados manualmente para bater com o `.env` existente sem precisar mudar nada. Ver seção "Database" do [README](../cxmanager/README.md). Todas as tarefas abaixo já verificadas ponta a ponta contra esse banco real.

## Phase 1: Fundação

- [x] Tarefa 1: Scaffold do projeto + Postgres via Docker
- [x] Tarefa 2: Schema do banco (User/Role) + seed

### Checkpoint: Fundação
- [x] `docker compose up -d` + `npm run dev` funcionam sem erro
- [x] Banco populado com o usuário seed
- [x] Revisar com o usuário antes de seguir

## Phase 2: Login e sessão

- [x] Tarefa 3: Fluxo de login (Auth.js Credentials) — e2e `login.spec.ts` (3 casos) passando contra o Postgres real
- [x] Tarefa 4: Proteção de rotas + logout — e2e `route-protection.spec.ts` (2 casos) passando

### Checkpoint: Login e sessão
- [x] Fluxo completo login → área protegida → logout funciona ponta a ponta
- [x] Revisar com o usuário antes de seguir

## Phase 3: Permissões e administração

- [x] Tarefa 5: Matriz de permissões + enforcement no servidor — `lib/permissions.ts` (27 casos unit) + e2e `usuarios-access.spec.ts` (Campo negado / Aprovador permitido) passando
- [x] Tarefa 6: Tela de usuários — criar usuário (Aprovador) — `usuarios/actions.ts` + `CreateUserForm.tsx`; e2e `create-user.spec.ts` (cria usuário + login com a conta nova; e-mail duplicado mostra erro) passando
- [x] Tarefa 7: Reset de senha (Aprovador) — `resetPasswordAction` + `ResetPasswordButton.tsx`, senha temporária gerada (`generateTempPassword`) e exibida uma única vez; e2e `reset-password.spec.ts` (senha antiga passa a falhar, nova funciona) passando

### Checkpoint: Permissões e administração
- [x] Toda a matriz de permissões testada (unit)
- [x] Aprovador consegue criar e resetar senha de usuários ponta a ponta
- [x] Nenhuma ação sensível depende só de checagem no client

## Phase 4: Verificação cruzada de perfis

- [x] Tarefa 8: Testes e2e por perfil — `permissions-by-role.spec.ts` (Campo e Qualidade: acesso direto por URL a `/usuarios` barrado no servidor + nenhuma ação de admin vaza na página; Aprovador: acesso completo)

### Checkpoint: Módulo completo
- [x] Critérios de sucesso da spec cobertos pelo que já existe no sistema — **ressalva:** dois critérios da spec citam ações de módulos futuros (`punch.close_a`/`rfo.sign`/`gate.approve_transition` do `punch-list`/`energization`, `checklist.validate` do `asset-commissioning`); a matriz já os codifica e tem 100% de cobertura unit, mas não há UI real ainda para testar e2e — só existirá quando esses módulos forem construídos
- [x] `npm run build`, `npm run test` (30 unit), `npm run test:e2e` (13 e2e) passando
- [x] Pronto para revisão humana antes de iniciar `asset-commissioning`
