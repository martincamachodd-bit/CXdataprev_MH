import { test, expect, type Page } from "@playwright/test";

const SEED_PASSWORD = "TrocarSenha123!";

const ROLES = [
  { role: "campo", email: "campo@dataprev.local" },
  { role: "qualidade", email: "qualidade@dataprev.local" },
] as const;

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/dashboard");
}

for (const { role, email } of ROLES) {
  test(`${role}: não acessa /usuarios e não vê ações de administração`, async ({
    page,
  }) => {
    await login(page, email, SEED_PASSWORD);

    // acesso direto por URL, ignorando qualquer navegação da UI — prova que
    // a checagem é no servidor, não apenas um botão/link escondido
    await page.goto("/usuarios");
    await expect(page).toHaveURL("/dashboard");

    const body = await page.textContent("body");
    expect(body).not.toContain("Novo usuário");
    expect(body).not.toContain("Resetar senha");
  });
}

test("aprovador acessa /usuarios e todas as ações de administração", async ({
  page,
}) => {
  await login(page, "aprovador@dataprev.local", SEED_PASSWORD);

  await page.goto("/usuarios");
  await expect(page).toHaveURL("/usuarios");
  await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar usuário" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resetar senha" }).first()
  ).toBeVisible();
});
