import { test, expect, type Page } from "@playwright/test";

const APROVADOR_EMAIL = "aprovador@dataprev.local";
const CAMPO_EMAIL = "campo@dataprev.local";
const QUALIDADE_EMAIL = "qualidade@dataprev.local";
const SEED_PASSWORD = "TrocarSenha123!";

async function login(page: Page, email = APROVADOR_EMAIL, senha = SEED_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/dashboard");
}

test("Aprovador cadastra um ativo novo e ele aparece na lista", async ({
  page,
}) => {
  const tag = `NOVO-${Date.now()}`;

  await login(page);
  await page.goto("/ativos");

  await page.getByLabel("TAG", { exact: true }).fill(tag);
  await page.getByLabel("Nome", { exact: true }).fill("Ativo Cadastrado no Teste");
  await page.getByLabel("Tipo", { exact: true }).selectOption("UPS");
  await page.getByLabel("Célula", { exact: true }).fill("3");
  await page.getByLabel("Fonte A", { exact: true }).fill("MSB-3A");
  await page.getByRole("button", { name: "Cadastrar ativo" }).click();

  await expect(page.getByText("Ativo cadastrado com sucesso.")).toBeVisible();

  await page.getByPlaceholder("Buscar por TAG ou nome…").fill(tag);
  await expect(page.getByText(tag, { exact: true })).toBeVisible();
});

test("TAG duplicada mostra erro claro", async ({ page }) => {
  await login(page);
  await page.goto("/ativos");

  await page.getByLabel("TAG", { exact: true }).fill("XFM-01"); // já existe no seed
  await page.getByLabel("Nome", { exact: true }).fill("Duplicado");
  await page.getByLabel("Tipo", { exact: true }).selectOption("XFM");
  await page.getByLabel("Célula", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Cadastrar ativo" }).click();

  await expect(
    page.getByText("Já existe um ativo com essa TAG.")
  ).toBeVisible();
});

for (const email of [CAMPO_EMAIL, QUALIDADE_EMAIL]) {
  test(`${email} não vê nem consegue acionar o cadastro de ativo`, async ({
    page,
  }) => {
    await login(page, email);
    await page.goto("/ativos");

    await expect(page.getByText("Novo ativo", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Cadastrar ativo" })
    ).toHaveCount(0);
  });
}
