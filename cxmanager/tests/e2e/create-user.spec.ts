import { test, expect } from "@playwright/test";

const APROVADOR_EMAIL = "aprovador@dataprev.local";
const SEED_PASSWORD = "TrocarSenha123!";

async function login(page: import("@playwright/test").Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/dashboard");
}

test("aprovador cria um usuário e o novo usuário consegue logar", async ({
  page,
}) => {
  const newEmail = `qualidade-${Date.now()}@dataprev.local`;
  const newPassword = "SenhaTemp123!";

  await login(page, APROVADOR_EMAIL, SEED_PASSWORD);

  await page.goto("/usuarios");
  await page.getByLabel("Nome").fill("Usuária Teste");
  await page.getByLabel("E-mail").fill(newEmail);
  await page.getByLabel("Perfil").selectOption("qualidade");
  await page.getByLabel("Senha temporária").fill(newPassword);
  await page.getByRole("button", { name: "Criar usuário" }).click();

  await expect(page.getByText("Usuário criado com sucesso.")).toBeVisible();
  await expect(page.getByText(newEmail)).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");

  await login(page, newEmail, newPassword);
});

test("criar usuário com e-mail já existente mostra erro claro", async ({
  page,
}) => {
  await login(page, APROVADOR_EMAIL, SEED_PASSWORD);
  await page.goto("/usuarios");

  await page.getByLabel("Nome").fill("Duplicado");
  await page.getByLabel("E-mail").fill(APROVADOR_EMAIL);
  await page.getByLabel("Perfil").selectOption("campo");
  await page.getByLabel("Senha temporária").fill("SenhaTemp123!");
  await page.getByRole("button", { name: "Criar usuário" }).click();

  await expect(
    page.getByText("Já existe um usuário com esse e-mail.")
  ).toBeVisible();
});
