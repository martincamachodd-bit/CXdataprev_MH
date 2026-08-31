import path from "path";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const FIXTURE_FILE = path.join(__dirname, "fixtures", "documento-teste.pdf");

const APROVADOR_EMAIL = "aprovador@dataprev.local";
const CAMPO_EMAIL = "campo@dataprev.local";
const QUALIDADE_EMAIL = "qualidade@dataprev.local";
const SEED_PASSWORD = "TrocarSenha123!";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function login(
  page: import("@playwright/test").Page,
  email = APROVADOR_EMAIL,
  senha = SEED_PASSWORD
) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/dashboard");
}

async function logout(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");
}

test("drawer mostra o stepper e o checklist do nível atual, com N/A pras etapas que não se aplicam ao tipo", async ({
  page,
}) => {
  await login(page);
  await page.goto("/ativos");

  // CRAC-01 está no L2 no seed e pula a etapa "meg" (megger) nesse nível
  await page.getByText("CRAC-01", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ar-Condicionado de Precisão 01" })
  ).toBeVisible();

  // o bloco do nível atual (L2) já vem expandido
  const meggerRow = page.locator("div", {
    hasText: "Megger (resistência de isolamento)",
  }).last();
  await expect(meggerRow.getByText("N/A", { exact: true })).toBeVisible();

  // uma etapa que se aplica normalmente aparece como pendente, não N/A
  const posRow = page.locator("div", {
    hasText: "Posicionamento e fixação conforme projeto",
  }).last();
  await expect(posRow.getByText("Pendente", { exact: true })).toBeVisible();
});

test("stepper destaca o nível atual do ativo", async ({ page }) => {
  await login(page);
  await page.goto("/ativos");

  // XFM-01 está no L4 no seed
  await page.getByText("XFM-01", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Transformador Principal 2,5 MVA" })
  ).toBeVisible();
  await expect(page.getByText("Nível atual: L4")).toBeVisible();
});

test("Campo executa, Qualidade valida — e só o progresso validado conta pro nível", async ({
  page,
}) => {
  const tag = `TEST-${Date.now()}`;
  await prisma.asset.create({
    data: {
      tag,
      nome: "Ativo de Teste — Checklist",
      tipo: "MSB",
      celula: 1,
      nivelAtual: "L1",
    },
  });

  // Campo executa a etapa "fat" e não vê botão de validar em lugar nenhum
  await login(page, CAMPO_EMAIL);
  await page.goto("/ativos");
  await page.getByPlaceholder("Buscar por TAG ou nome…").fill(tag);
  await page.getByText(tag, { exact: true }).click();

  await expect(page.getByRole("button", { name: "Validar" })).toHaveCount(0);
  const fatRow = page
    .locator("div", { hasText: "FAT aprovado (relatório de fábrica)" })
    .last();
  await fatRow.getByRole("button", { name: "Marcar executado" }).click();
  await expect(fatRow.getByText("Executado", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Fechar" }).click();

  // progresso ainda em 0% — execução isolada não conta pro nível
  await page.getByPlaceholder("Buscar por TAG ou nome…").fill(tag);
  await expect(page.getByText("0%", { exact: true })).toBeVisible();

  await logout(page);

  // Qualidade não vê botão de executar; valida "fat" e não consegue validar
  // "de", que ainda está pendente (botão fica desabilitado)
  await login(page, QUALIDADE_EMAIL);
  await page.goto("/ativos");
  await page.getByPlaceholder("Buscar por TAG ou nome…").fill(tag);
  await page.getByText(tag, { exact: true }).click();

  await expect(
    page.getByRole("button", { name: "Marcar executado" })
  ).toHaveCount(0);

  const deRow = page
    .locator("div", { hasText: "Documento de embarque / packing list" })
    .last();
  await expect(
    deRow.getByRole("button", { name: "Validar" })
  ).toBeDisabled();

  const fatRowQualidade = page
    .locator("div", { hasText: "FAT aprovado (relatório de fábrica)" })
    .last();
  await fatRowQualidade.getByRole("button", { name: "Validar" }).click();
  await expect(
    fatRowQualidade.getByText("Validado", { exact: false })
  ).toBeVisible();
  await page.getByRole("button", { name: "Fechar" }).click();

  // agora sim o progresso reflete a etapa validada: 1 de 5 etapas do L1 = 20%
  await page.getByPlaceholder("Buscar por TAG ou nome…").fill(tag);
  await expect(page.getByText("20%", { exact: true })).toBeVisible();
});

test("Campo anexa documento a uma etapa e ele aparece associado a quem enviou", async ({
  page,
}) => {
  const tag = `TEST-DOC-${Date.now()}`;
  await prisma.asset.create({
    data: {
      tag,
      nome: "Ativo de Teste — Upload",
      tipo: "XFM",
      celula: 1,
      nivelAtual: "L1",
    },
  });

  await login(page, CAMPO_EMAIL);
  await page.goto("/ativos");
  await page.getByPlaceholder("Buscar por TAG ou nome…").fill(tag);
  await page.getByText(tag, { exact: true }).click();

  const fatRow = page.locator('[data-step="fat"]');
  await expect(
    fatRow.getByText("pendente upload", { exact: false })
  ).toBeVisible();

  await fatRow.locator('input[type="file"]').setInputFiles(FIXTURE_FILE);
  await fatRow.getByRole("button", { name: "Anexar" }).click();

  await expect(
    fatRow.getByText("documento-teste.pdf", { exact: false })
  ).toBeVisible();
  await expect(fatRow.getByText("Carla F.", { exact: false })).toBeVisible();
  await expect(
    fatRow.getByText("pendente upload", { exact: false })
  ).not.toBeVisible();
});
