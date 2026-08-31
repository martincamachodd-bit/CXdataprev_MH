import { test, expect, type Page } from "@playwright/test";
import { PrismaClient, type AssetType, type Level } from "@prisma/client";
import { ROADMAP } from "../../src/lib/roadmap";

const APROVADOR_EMAIL = "aprovador@dataprev.local";
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

async function createAsset(opts: { nivelAtual: Level; tipo?: AssetType }) {
  const tag = `TEST-RFO-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const asset = await prisma.asset.create({
    data: {
      tag,
      nome: "Ativo de Teste — RFO",
      tipo: opts.tipo ?? "MSB",
      celula: 1,
      nivelAtual: opts.nivelAtual,
    },
  });
  return { tag, assetId: asset.id };
}

async function fullyValidateLevel(assetId: string, level: Level, tipo: AssetType) {
  const aprovador = await prisma.user.findUniqueOrThrow({
    where: { email: APROVADOR_EMAIL },
  });
  for (const step of ROADMAP[level]) {
    if (step.skipFor?.includes(tipo)) continue;
    await prisma.assetStepCompletion.create({
      data: {
        assetId,
        level,
        stepId: step.id,
        executedAt: new Date(),
        executedById: aprovador.id,
        validatedAt: new Date(),
        validatedById: aprovador.id,
      },
    });
  }
}

async function openPunchB(assetId: string, titulo: string) {
  const aprovador = await prisma.user.findUniqueOrThrow({
    where: { email: APROVADOR_EMAIL },
  });
  return prisma.punch.create({
    data: {
      assetId,
      categoria: "B",
      titulo,
      descricao: "descrição do punch B de teste",
      responsavel: "Resp Teste",
      createdById: aprovador.id,
    },
  });
}

async function openDrawer(page: Page, tag: string) {
  await page.goto("/ativos");
  await page.getByPlaceholder("Buscar por TAG ou nome…").fill(tag);
  await page.getByText(tag, { exact: true }).click();
}

test("ativo com punch B aberto (zero punch A) consegue entrar no L4", async ({
  page,
}) => {
  const { tag, assetId } = await createAsset({ nivelAtual: "L3" });
  await fullyValidateLevel(assetId, "L3", "MSB");
  await openPunchB(assetId, `Punch B não bloqueia L4 ${Date.now()}`);

  await login(page);
  await openDrawer(page, tag);

  await page.getByRole("button", { name: "Avançar para L4" }).click();
  await expect(page.getByText("Nível atual: L4")).toBeVisible();

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  expect(asset.nivelAtual).toBe("L4");
});

test("ativo com punch B aberto (zero punch A) não avança pro L5 — fecha o punch e aí sim avança", async ({
  page,
}) => {
  const { tag, assetId } = await createAsset({ nivelAtual: "L4" });
  await fullyValidateLevel(assetId, "L4", "MSB");
  const punch = await openPunchB(assetId, `Punch B bloqueia RFO ${Date.now()}`);

  await login(page);
  await openDrawer(page, tag);

  // bloqueado: L4 100%, zero punch A, mas ainda tem punch B aberto
  await page.getByRole("button", { name: "Avançar para L5" }).click();
  await expect(page.getByText("RFO bloqueado", { exact: false })).toBeVisible();
  await expect(page.getByText("Nível atual: L4")).toBeVisible();

  let asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  expect(asset.nivelAtual).toBe("L4");

  // fecha o punch B pela página /punch
  await page.getByRole("button", { name: "Fechar" }).click();
  await page.goto("/punch");
  const row = page.locator(`[data-punch-id="${punch.id}"]`);
  await row.getByRole("button", { name: "Encerrar" }).click();
  await expect(row.getByText("Fechado", { exact: true })).toBeVisible();

  // agora sim avança pro L5 (RFO)
  await openDrawer(page, tag);
  await page.getByRole("button", { name: "Avançar para L5" }).click();
  await expect(page.getByText("Nível atual: L5")).toBeVisible();

  asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  expect(asset.nivelAtual).toBe("L5");
});
