import { test, expect } from "@playwright/test";

const APROVADOR_EMAIL = "aprovador@dataprev.local";
const SEED_PASSWORD = "TrocarSenha123!";

async function login(
  page: import("@playwright/test").Page,
  email: string,
  senha: string
) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("aprovador reseta a senha de um usuário; senha antiga para de funcionar e a nova funciona", async ({
  page,
}) => {
  const targetEmail = `reset-alvo-${Date.now()}@dataprev.local`;
  const initialPassword = "SenhaInicial123!";

  await login(page, APROVADOR_EMAIL, SEED_PASSWORD);
  await expect(page).toHaveURL("/dashboard");

  // cria o usuário que vai ter a senha resetada, de forma isolada por teste
  await page.goto("/usuarios");
  await page.getByLabel("Nome").fill("Alvo do Reset");
  await page.getByLabel("E-mail").fill(targetEmail);
  await page.getByLabel("Perfil").selectOption("campo");
  await page.getByLabel("Senha temporária").fill(initialPassword);
  await page.getByRole("button", { name: "Criar usuário" }).click();
  await expect(page.getByText("Usuário criado com sucesso.")).toBeVisible();

  const row = page.locator("tr", { hasText: targetEmail });
  await row.getByRole("button", { name: "Resetar senha" }).click();

  const tempPasswordLocator = row.locator("code");
  await expect(tempPasswordLocator).toBeVisible();
  const newPassword = await tempPasswordLocator.textContent();
  expect(newPassword).toBeTruthy();
  expect(newPassword).not.toBe(initialPassword);

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");

  // senha antiga não funciona mais
  await login(page, targetEmail, initialPassword);
  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
  await expect(page).toHaveURL("/login");

  // senha nova funciona
  await login(page, targetEmail, newPassword!);
  await expect(page).toHaveURL("/dashboard");
});
