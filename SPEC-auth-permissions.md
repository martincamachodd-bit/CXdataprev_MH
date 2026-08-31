# Spec: auth-permissions

Módulo 1/7 do [CAPABILITY-MAP.md](./CAPABILITY-MAP.md) — CxManager.

## Objective

Fornecer login e controle de acesso para o CxManager. Todo o resto do sistema (ativos, punch list, certificados, relatórios) depende de saber quem é o usuário logado e o que ele pode fazer.

Usuários: equipe da obra DATAPREV — perfis **Campo** (executa e anexa documentos), **Qualidade** (valida etapas e documentos) e **Aprovador** (aprova gates, encerra punch A, assina RFO, edita base de ativos, administra usuários). Perfil **Cliente** (somente leitura) fica fora do MVP.

Sucesso = um Aprovador consegue criar contas para o time, cada pessoa loga com e-mail/senha, e as ações sensíveis (fechar punch A, assinar RFO, avançar gate) só funcionam para quem tem permissão — inclusive se alguém tentar chamar a API direto.

## Tech Stack

- Next.js 15 (App Router), TypeScript (strict)
- Auth.js (NextAuth v5) — Credentials provider, sessão JWT em cookie httpOnly
- Prisma ORM + PostgreSQL
- bcrypt para hash de senha
- Vitest (unit) + Playwright (e2e)

## Commands

```
Dev:    npm run dev
Build:  npm run build
Test:   npm run test              (Vitest — unit)
E2E:    npm run test:e2e          (Playwright)
Lint:   npm run lint
DB:     npx prisma migrate dev    (aplica migrations em dev)
        npx prisma studio         (inspecionar dados)
```

## Project Structure

```
src/
  app/
    (auth)/
      login/page.tsx        → tela de login
    (app)/
      usuarios/page.tsx     → gestão de usuários (só Aprovador)
      perfil/page.tsx       → perfil do usuário logado
    api/
      auth/[...nextauth]/route.ts   → handler do Auth.js
  lib/
    auth.ts                  → config do Auth.js, helper auth() p/ server components
    permissions.ts           → matriz papel → permissão + can(user, action)
    db.ts                    → singleton do Prisma Client
    hash.ts                  → wrappers de bcrypt
prisma/
  schema.prisma              → models User, Role
tests/
  unit/permissions.test.ts   → matriz de permissões
  e2e/login.spec.ts          → fluxo de login + bloqueio por perfil
```

## Code Style

Permissões centralizadas em uma função pura, nunca checadas "no olho" espalhadas pelo código:

```ts
// lib/permissions.ts
export type Role = "campo" | "qualidade" | "aprovador";
export type Action =
  | "checklist.edit"
  | "checklist.validate"
  | "punch.close_a"
  | "punch.close_bc"
  | "gate.approve_transition"
  | "rfo.sign"
  | "assets.edit_base"
  | "certificates.manage"
  | "users.manage";

const MATRIX: Record<Role, Action[]> = {
  campo: ["checklist.edit", "punch.close_bc"],
  qualidade: ["checklist.validate", "punch.close_bc", "certificates.manage"],
  aprovador: [
    "checklist.edit", "checklist.validate", "punch.close_a", "punch.close_bc",
    "gate.approve_transition", "rfo.sign", "assets.edit_base",
    "certificates.manage", "users.manage",
  ],
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role].includes(action);
}
```

Toda rota/server action sensível chama `can(session.user.role, "...")` no servidor — a UI pode esconder botões, mas a checagem que importa é sempre no backend.

## Testing Strategy

- **Unit (Vitest):** matriz de permissões — cada papel × cada ação, tabela de casos.
- **E2E (Playwright):** login com credenciais válidas/inválidas; usuário Campo tentando acessar ação de Aprovador via UI (botão ausente) e via chamada direta à API (deve retornar 403).
- Cobertura mínima: toda `Action` da matriz tem pelo menos um teste unit e toda rota protegida tem um teste e2e de acesso negado.

## Boundaries

- **Sempre:** hash de senha com bcrypt (nunca texto puro); validar permissão no servidor em toda action/rota sensível, mesmo que a UI já esconda o botão; expirar sessão por inatividade (7 dias); logar eventos de login/criação de usuário/reset de senha.
- **Perguntar antes:** mudar o tempo de expiração de sessão; adicionar um novo perfil (ex.: Cliente); trocar Auth.js por outra lib; adicionar SSO/OAuth corporativo.
- **Nunca:** expor hash de senha em qualquer resposta de API; permitir autocadastro público; deixar a checagem de permissão só no client.

## Success Criteria

- [ ] Um usuário Aprovador consegue criar uma conta (e-mail, nome, perfil, senha temporária) pela tela de usuários.
- [ ] O novo usuário loga com e-mail/senha e recebe uma sessão válida.
- [ ] Um Aprovador consegue resetar a senha de outro usuário (gera nova senha temporária).
- [ ] Requisição não autenticada a qualquer rota de `(app)/` redireciona para `/login`.
- [ ] Usuário perfil Campo: UI não mostra "encerrar punch A", "assinar RFO", "aprovar gate"; e uma chamada direta à API/server action para essas ações retorna erro de permissão (403), mesmo forjando a requisição.
- [ ] Usuário perfil Qualidade consegue validar uma etapa de checklist, mas não consegue assinar RFO.
- [ ] Senhas no banco de dados estão hasheadas (nunca texto puro), verificável via `prisma studio`.
- [ ] Todos os itens de "Testing Strategy" implementados e passando.

## Open Questions

- Tempo de expiração de sessão: assumi 7 dias de inatividade — confirmar se faz sentido para uso em campo (obra) ou se deve ser mais curto por segurança.
- Perfil Cliente (somente leitura) e recuperação de senha por e-mail ficam para uma fase futura — deve virar um módulo/spec próprio quando chegar a hora, ou entra como extensão deste mesmo módulo?
