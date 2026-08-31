import { test, expect } from "@playwright/test";

const SEED_EMAIL = "aprovador@dataprev.local";
const SEED_PASSWORD = "TrocarSenha123!";

test("login com credenciais válidas redireciona para o dashboard", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(SEED_EMAIL);
  await page.getByLabel("Senha").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByText("Logado como Mário R.")).toBeVisible();
});

test("login com senha errada mostra erro genérico", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(SEED_EMAIL);
  await page.getByLabel("Senha").fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
  await expect(page).toHaveURL("/login");
});

test("login com e-mail inexistente mostra o mesmo erro genérico", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("nao-existe@dataprev.local");
  await page.getByLabel("Senha").fill("qualquer-coisa");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
});
