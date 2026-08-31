import { test, expect } from "@playwright/test";

const CAMPO_EMAIL = "campo@dataprev.local";
const APROVADOR_EMAIL = "aprovador@dataprev.local";
const SEED_PASSWORD = "TrocarSenha123!";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/dashboard");
}

test("usuário Campo é redirecionado ao tentar acessar /usuarios", async ({
  page,
}) => {
  await login(page, CAMPO_EMAIL);
  await page.goto("/usuarios");
  await expect(page).toHaveURL("/dashboard");
});

test("usuário Aprovador acessa /usuarios normalmente", async ({ page }) => {
  await login(page, APROVADOR_EMAIL);
  await page.goto("/usuarios");
  await expect(page).toHaveURL("/usuarios");
  await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();
});
