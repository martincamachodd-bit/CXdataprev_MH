import { test, expect } from "@playwright/test";

const SEED_EMAIL = "aprovador@dataprev.local";
const SEED_PASSWORD = "TrocarSenha123!";

test("acesso não autenticado a /dashboard redireciona para /login", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
});

test("logout encerra a sessão e bloqueia acesso subsequente ao dashboard", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(SEED_EMAIL);
  await page.getByLabel("Senha").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/dashboard");

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
});
