import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const APROVADOR_EMAIL = "aprovador@dataprev.local";
const CAMPO_EMAIL = "campo@dataprev.local";
const QUALIDADE_EMAIL = "qualidade@dataprev.local";
const SEED_PASSWORD = "TrocarSenha123!";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function login(page: Page, email = APROVADOR_EMAIL, senha = SEED_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/dashboard");
}

async function createAsset() {
  const tag = `TEST-PUNCH-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const asset = await prisma.asset.create({
    data: {
      tag,
      nome: "Ativo de Teste — Punch",
      tipo: "MSB",
      celula: 1,
      nivelAtual: "L2",
    },
  });
  return { tag, assetId: asset.id };
}

async function createPunch(
  assetId: string,
  categoria: "A" | "B" | "C",
  titulo: string
) {
  const aprovador = await prisma.user.findUniqueOrThrow({
    where: { email: APROVADOR_EMAIL },
  });
  return prisma.punch.create({
    data: {
      assetId,
      categoria,
      titulo,
      descricao: `descrição do punch ${titulo}`,
      responsavel: "Resp Teste",
      createdById: aprovador.id,
    },
  });
}

test("Campo abre um punch A a partir do drawer de um ativo", async ({
  page,
}) => {
  const { tag, assetId } = await createAsset();

  await login(page, CAMPO_EMAIL);
  await page.goto("/ativos");
  await page.getByPlaceholder("Buscar por TAG ou nome…").fill(tag);
  await page.getByText(tag, { exact: true }).click();

  await page.getByRole("button", { name: "📌 Abrir punch" }).click();
  await page.getByLabel("Categoria").selectOption("A");
  await page.getByLabel("Título").fill("Alarme de bypass intermitente");
  await page
    .getByLabel("Descrição")
    .fill("Reproduzido no teste funcional, aguarda firmware do fabricante.");
  await page.getByLabel("Responsável").fill("Eng. Elétrica");
  await page.getByRole("button", { name: "Abrir punch" }).click();

  await expect(page.getByText("Punch aberto com sucesso.")).toBeVisible();

  const punch = await prisma.punch.findFirstOrThrow({ where: { assetId } });
  expect(punch.categoria).toBe("A");
  expect(punch.titulo).toBe("Alarme de bypass intermitente");
  expect(punch.responsavel).toBe("Eng. Elétrica");
  expect(punch.status).toBe("aberto");

  const createdBy = await prisma.user.findUniqueOrThrow({
    where: { id: punch.createdById },
  });
  expect(createdBy.email).toBe(CAMPO_EMAIL);

  // o punch aberto pelo drawer aparece na página /punch
  await page.goto("/punch");
  await expect(page.locator(`[data-punch-id="${punch.id}"]`)).toBeVisible();
});

test("/punch lista os punches e cada filtro reduz a lista", async ({
  page,
}) => {
  const aprovador = await prisma.user.findUniqueOrThrow({
    where: { email: APROVADOR_EMAIL },
  });
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { assetId: assetAberto } = await createAsset();
  const { assetId: assetFechado } = await createAsset();

  const tituloAberto = `Punch aberto A ${suffix}`;
  const tituloFechado = `Punch fechado B ${suffix}`;

  const punchAberto = await prisma.punch.create({
    data: {
      assetId: assetAberto,
      categoria: "A",
      titulo: tituloAberto,
      descricao: "descrição do punch aberto",
      responsavel: "Resp A",
      createdById: aprovador.id,
    },
  });
  const punchFechado = await prisma.punch.create({
    data: {
      assetId: assetFechado,
      categoria: "B",
      titulo: tituloFechado,
      descricao: "descrição do punch fechado",
      responsavel: "Resp B",
      createdById: aprovador.id,
      status: "fechado",
      closedAt: new Date(),
      closedById: aprovador.id,
    },
  });

  await login(page);
  await page.goto("/punch");

  const rowAberto = page.locator(`[data-punch-id="${punchAberto.id}"]`);
  const rowFechado = page.locator(`[data-punch-id="${punchFechado.id}"]`);

  await expect(rowAberto).toBeVisible();
  await expect(rowFechado).toBeVisible();

  // filtro por categoria
  await page.getByLabel("Filtrar por categoria").selectOption("A");
  await expect(rowAberto).toBeVisible();
  await expect(rowFechado).not.toBeVisible();
  await page.getByLabel("Filtrar por categoria").selectOption("");

  // filtro por status
  await page.getByLabel("Filtrar por status").selectOption("fechado");
  await expect(rowAberto).not.toBeVisible();
  await expect(rowFechado).toBeVisible();
  await expect(rowFechado.getByText(/Fechado por/)).toBeVisible();
  await page.getByLabel("Filtrar por status").selectOption("");

  // busca por ativo combinada com categoria
  await page.getByPlaceholder("Buscar por TAG ou nome do ativo…").fill("TEST-PUNCH");
  await page.getByLabel("Filtrar por categoria").selectOption("C");
  await expect(
    page.getByText("Nenhum punch encontrado para esses filtros.")
  ).toBeVisible();
});

test("Campo fecha um punch B", async ({ page }) => {
  const { assetId } = await createAsset();
  const punch = await createPunch(assetId, "B", `Fechar B ${Date.now()}`);

  await login(page, CAMPO_EMAIL);
  await page.goto("/punch");

  const row = page.locator(`[data-punch-id="${punch.id}"]`);
  await row.getByRole("button", { name: "Encerrar" }).click();
  await expect(row.getByText("Fechado", { exact: true })).toBeVisible();

  const updated = await prisma.punch.findUniqueOrThrow({
    where: { id: punch.id },
  });
  expect(updated.status).toBe("fechado");
  const closedBy = await prisma.user.findUniqueOrThrow({
    where: { id: updated.closedById! },
  });
  expect(closedBy.email).toBe(CAMPO_EMAIL);
});

for (const email of [CAMPO_EMAIL, QUALIDADE_EMAIL]) {
  test(`${email} não vê botão de encerrar num punch categoria A`, async ({
    page,
  }) => {
    const { assetId } = await createAsset();
    const punch = await createPunch(assetId, "A", `Sem acesso A ${Date.now()}`);

    await login(page, email);
    await page.goto("/punch");

    const row = page.locator(`[data-punch-id="${punch.id}"]`);
    await expect(row).toBeVisible();
    await expect(row.getByRole("button", { name: "Encerrar" })).toHaveCount(0);
  });
}

test("Aprovador fecha um punch categoria A", async ({ page }) => {
  const { assetId } = await createAsset();
  const punch = await createPunch(assetId, "A", `Fechar A ${Date.now()}`);

  await login(page, APROVADOR_EMAIL);
  await page.goto("/punch");

  const row = page.locator(`[data-punch-id="${punch.id}"]`);
  await row.getByRole("button", { name: "Encerrar" }).click();
  await expect(row.getByText("Fechado", { exact: true })).toBeVisible();

  const updated = await prisma.punch.findUniqueOrThrow({
    where: { id: punch.id },
  });
  expect(updated.status).toBe("fechado");
  expect(updated.closedAt).not.toBeNull();
});
