# Implementation Plan: auth-permissions

Módulo 1/7 do [CAPABILITY-MAP.md](../CAPABILITY-MAP.md). Spec: [SPEC-auth-permissions.md](../SPEC-auth-permissions.md).

## Overview

Scaffold do projeto Next.js/TypeScript, banco Postgres via Docker, e o fluxo completo de autenticação e permissões: login por e-mail/senha, sessão, 3 perfis (Campo, Qualidade, Aprovador), matriz de permissões aplicada no servidor, e uma tela de administração de usuários restrita ao Aprovador.

## Architecture Decisions

- **Next.js 15 App Router + TypeScript strict** — decidido com o usuário; permite server actions para as mutações sensíveis (criar usuário, resetar senha) sem precisar de uma API REST separada.
- **Auth.js v5 (Credentials provider) + Prisma adapter, sessão JWT em cookie httpOnly** — padrão maduro para Next.js, evita implementar sessão na mão.
- **Postgres via Docker Compose** — decidido com o usuário (ambiente Windows sem Postgres/Docker instalados ainda). Requer instalar Docker Desktop (WSL2) como parte da Tarefa 1.
- **Permissões centralizadas em `lib/permissions.ts`** — uma função pura `can(role, action)`, nunca checagens espalhadas pelo código. Ver exemplo na spec.
- **Sem serviço de e-mail no MVP** — reset de senha é feito pelo Aprovador gerando uma senha temporária (decisão já tomada na spec).

## Task List

### Phase 1: Fundação

- [ ] **Tarefa 1: Scaffold do projeto + Postgres via Docker**
  - **Descrição:** Instalar Docker Desktop, criar o projeto Next.js (TypeScript, App Router, ESLint), configurar Prisma apontando para um `docker-compose.yml` com serviço Postgres, e confirmar que `npx prisma migrate dev` roda contra o container.
  - **Aceitação:**
    - [ ] `docker compose up -d` sobe um Postgres acessível em `localhost`
    - [ ] `npm run dev` serve a página inicial padrão do Next.js sem erros
    - [ ] `npx prisma migrate dev` roda com sucesso contra o banco do container (mesmo com schema vazio/inicial)
  - **Verificação:** build (`npm run build`) sem erros; `docker compose ps` mostra o container saudável.
  - **Dependências:** Nenhuma.
  - **Arquivos:** `docker-compose.yml`, `package.json`, `tsconfig.json`, `prisma/schema.prisma`, `.env`
  - **Escopo estimado:** M

- [ ] **Tarefa 2: Schema do banco (User/Role) + seed**
  - **Descrição:** Modelar `User` no Prisma (id, nome, e-mail, senha hasheada, papel, timestamps) e um enum `Role` (`campo`, `qualidade`, `aprovador`). Escrever script de seed que cria um usuário Aprovador inicial com credenciais conhecidas (para dev/testes).
  - **Aceitação:**
    - [ ] `npx prisma migrate dev` cria a tabela `User`
    - [ ] `npx prisma db seed` cria o usuário Aprovador inicial
    - [ ] Senha do seed está hasheada no banco (verificável via `prisma studio`), nunca texto puro
  - **Verificação:** `npx prisma studio` mostra o usuário criado com senha hasheada; teste unit do hash (`lib/hash.ts`) passa.
  - **Dependências:** Tarefa 1.
  - **Arquivos:** `prisma/schema.prisma`, `prisma/seed.ts`, `lib/hash.ts`, `tests/unit/hash.test.ts`
  - **Escopo estimado:** S

### Checkpoint: Fundação
- [ ] `docker compose up -d` + `npm run dev` funcionam sem erro
- [ ] Banco populado com o usuário seed
- [ ] Revisar com o usuário antes de seguir para o fluxo de login

### Phase 2: Login e sessão

- [ ] **Tarefa 3: Fluxo de login (Auth.js Credentials)**
  - **Descrição:** Configurar Auth.js v5 com Credentials provider validando contra `User` via Prisma. Criar página `/login` com formulário e-mail/senha. Login bem-sucedido redireciona para uma página protegida placeholder (`/dashboard` vazio por ora); falha mostra mensagem de erro sem revelar se o e-mail existe.
  - **Aceitação:**
    - [ ] Login com credenciais do usuário seed funciona e cria sessão
    - [ ] Login com senha errada mostra erro genérico ("e-mail ou senha inválidos")
    - [ ] Sessão expõe `user.id`, `user.nome`, `user.role`
  - **Verificação:** teste e2e Playwright cobrindo login válido e inválido.
  - **Dependências:** Tarefa 2.
  - **Arquivos:** `app/api/auth/[...nextauth]/route.ts`, `lib/auth.ts`, `app/(auth)/login/page.tsx`, `tests/e2e/login.spec.ts`
  - **Escopo estimado:** M

- [ ] **Tarefa 4: Proteção de rotas + logout**
  - **Descrição:** Proxy (`proxy.ts` — renomeado de `middleware.ts` no Next.js 16, ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`) que redireciona qualquer acesso não autenticado a rotas de `(app)/` para `/login`. Botão de logout funcional (encerra sessão e redireciona ao login).
  - **Aceitação:**
    - [ ] Acessar `/dashboard` sem sessão redireciona para `/login`
    - [ ] Logout encerra a sessão (cookie removido/invalidado) e um acesso subsequente a `/dashboard` volta a redirecionar
  - **Verificação:** teste e2e cobrindo acesso não autenticado + logout.
  - **Dependências:** Tarefa 3.
  - **Arquivos:** `proxy.ts`, `app/(app)/layout.tsx`, `tests/e2e/route-protection.spec.ts`
  - **Escopo estimado:** S

### Checkpoint: Login e sessão
- [ ] Fluxo completo login → área protegida → logout funciona ponta a ponta
- [ ] Revisar com o usuário antes de seguir para permissões

### Phase 3: Permissões e administração

- [ ] **Tarefa 5: Matriz de permissões + enforcement no servidor**
  - **Descrição:** Implementar `lib/permissions.ts` (matriz papel→ação e `can()`) conforme exemplo da spec. Aplicar em pelo menos uma rota real como prova de conceito: a futura tela `/usuarios` só é acessível (server-side) para quem tem `users.manage`.
  - **Aceitação:**
    - [ ] Teste unit cobre todo papel × toda ação da matriz (positivo e negativo)
    - [ ] Usuário Campo acessando `/usuarios` recebe redirecionamento/erro de permissão vindo do servidor, não só da UI
  - **Verificação:** `npm run test` (unit) cobrindo 100% da matriz; teste e2e de acesso negado.
  - **Dependências:** Tarefa 4.
  - **Arquivos:** `lib/permissions.ts`, `tests/unit/permissions.test.ts`
  - **Escopo estimado:** S

- [ ] **Tarefa 6: Tela de usuários — criar usuário (Aprovador)**
  - **Descrição:** Página `/usuarios` (protegida por `users.manage`) com lista de usuários existentes e formulário para criar um novo (nome, e-mail, perfil, senha temporária gerada ou definida pelo Aprovador).
  - **Aceitação:**
    - [ ] Aprovador cria um usuário Campo ou Qualidade pela UI
    - [ ] O usuário criado consegue logar com a senha temporária definida
    - [ ] Tentativa de criar usuário com e-mail já existente mostra erro claro
  - **Verificação:** teste e2e cobrindo criação de usuário + login subsequente com a nova conta.
  - **Dependências:** Tarefa 5.
  - **Arquivos:** `app/(app)/usuarios/page.tsx`, `app/(app)/usuarios/actions.ts`, `tests/e2e/create-user.spec.ts`
  - **Escopo estimado:** M

- [ ] **Tarefa 7: Reset de senha (Aprovador)**
  - **Descrição:** Na tela de usuários, ação "resetar senha" que gera uma nova senha temporária para um usuário existente e a exibe uma única vez ao Aprovador (para ele repassar manualmente).
  - **Aceitação:**
    - [ ] Aprovador reseta a senha de um usuário Campo/Qualidade
    - [ ] O usuário consegue logar com a nova senha temporária; a senha antiga deixa de funcionar
  - **Verificação:** teste e2e cobrindo reset + login com a nova senha + falha com a senha antiga.
  - **Dependências:** Tarefa 6.
  - **Arquivos:** `app/(app)/usuarios/actions.ts`, `tests/e2e/reset-password.spec.ts`
  - **Escopo estimado:** S

### Checkpoint: Permissões e administração
- [ ] Toda a matriz de permissões testada (unit)
- [ ] Aprovador consegue criar e resetar senha de usuários ponta a ponta
- [ ] Nenhuma ação sensível depende só de checagem no client

### Phase 4: Verificação cruzada de perfis

- [ ] **Tarefa 8: Testes e2e por perfil**
  - **Descrição:** Suite Playwright cobrindo os 3 perfis logando e confirmando o que cada um vê/pode fazer, incluindo tentativa de burlar via chamada direta a server actions.
  - **Aceitação:**
    - [ ] Campo: não vê nem consegue acionar "usuários", "resetar senha"
    - [ ] Qualidade: idem Campo, mais especificamente não acessa `/usuarios`
    - [ ] Aprovador: acessa tudo listado na spec
  - **Verificação:** `npm run test:e2e` passando para os 3 perfis.
  - **Dependências:** Tarefa 7.
  - **Arquivos:** `tests/e2e/permissions-by-role.spec.ts`
  - **Escopo estimado:** M

### Checkpoint: Módulo completo
- [ ] Todos os critérios de sucesso da spec atendidos
- [ ] `npm run build`, `npm run test`, `npm run test:e2e` passando
- [ ] Pronto para revisão humana antes de iniciar `asset-commissioning`

## Risks and Mitigations

| Risco | Impacto | Mitigação |
|---|---|---|
| Docker Desktop no Windows exige WSL2 — pode falhar/exigir reboot na instalação | Médio | Validar WSL2 logo na Tarefa 1; se travar, cair para Postgres nativo via winget como plano B |
| Auth.js v5 ainda evolui rápido (breaking changes entre versões) | Médio | Fixar versão exata no `package.json`; seguir `source-driven-development` e checar a doc oficial antes de implementar |
| Senha temporária "na mão" (sem e-mail) pode vazar se exibida em log/print | Baixo | Exibir só uma vez na UI, nunca logar senha em texto puro |
| Task 8 (e2e por perfil) pode ficar grande se a matriz crescer | Baixo | Se ultrapassar ~5 arquivos, quebrar por perfil (3 arquivos separados) |

## Open Questions

- Nenhuma pendente para este módulo — spec e plano aprovados pelo usuário até aqui.
