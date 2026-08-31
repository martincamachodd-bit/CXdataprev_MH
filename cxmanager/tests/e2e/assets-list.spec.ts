import { test, expect } from "@playwright/test";

const APROVADOR_EMAIL = "aprovador@dataprev.local";
const SEED_PASSWORD = "TrocarSenha123!";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(APROVADOR_EMAIL);
  await page.getByLabel("Senha").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/dashboard");
}

test("lista mostra os ativos e cada filtro reduz a lista", async ({ page }) => {
  await login(page);
  await page.goto("/ativos");

  // lista inicial mostra os ativos do seed
  await expect(page.getByText("XFM-01", { exact: true })).toBeVisible();
  await expect(page.getByText("CRAC-01", { exact: true })).toBeVisible();

  // busca por tag
  await page.getByPlaceholder("Buscar por TAG ou nome…").fill("crac");
  await expect(page.getByText("CRAC-01", { exact: true })).toBeVisible();
  await expect(page.getByText("XFM-01", { exact: true })).not.toBeVisible();
  await page.getByPlaceholder("Buscar por TAG ou nome…").fill("");

  // filtro por tipo
  await page.getByLabel("Filtrar por tipo").selectOption("XFM");
  await expect(page.getByText("XFM-01", { exact: true })).toBeVisible();
  await expect(page.getByText("CRAC-01", { exact: true })).not.toBeVisible();
  await page.getByLabel("Filtrar por tipo").selectOption("");

  // filtro por nível
  await page.getByLabel("Filtrar por nível").selectOption("L1");
  await expect(page.getByText("QDL-01", { exact: true })).toBeVisible();
  await expect(page.getByText("XFM-01", { exact: true })).not.toBeVisible();
  await page.getByLabel("Filtrar por nível").selectOption("");

  // combinando busca + célula não encontra nada inexistente
  await page.getByPlaceholder("Buscar por TAG ou nome…").fill("xfm");
  await page.getByLabel("Filtrar por célula").selectOption("2");
  await expect(
    page.getByText("Nenhum ativo encontrado para esses filtros.")
  ).toBeVisible();
});

test("clicar numa linha abre o painel de detalhe do ativo", async ({
  page,
}) => {
  await login(page);
  await page.goto("/ativos");

  await page.getByText("XFM-01", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Transformador Principal 2,5 MVA" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Fechar" }).click();
  await expect(
    page.getByRole("heading", { name: "Transformador Principal 2,5 MVA" })
  ).not.toBeVisible();
});
