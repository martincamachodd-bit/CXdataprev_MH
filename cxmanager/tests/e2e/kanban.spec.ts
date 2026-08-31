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

async function createAsset(opts: {
  nivelAtual: Level;
  tipo?: AssetType;
  fullyValidated?: boolean;
}) {
  const aprovador = await prisma.user.findUniqueOrThrow({
    where: { email: APROVADOR_EMAIL },
  });
  const tag = `TEST-KB-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const asset = await prisma.asset.create({
    data: {
      tag,
      nome: "Ativo de Teste — Kanban",
      tipo: opts.tipo ?? "MSB",
      celula: 1,
      nivelAtual: opts.nivelAtual,
    },
  });

  if (opts.fullyValidated) {
    for (const step of ROADMAP[opts.nivelAtual]) {
      if (step.skipFor?.includes(asset.tipo)) continue;
      await prisma.assetStepCompletion.create({
        data: {
          assetId: asset.id,
          level: opts.nivelAtual,
          stepId: step.id,
          executedAt: new Date(),
          executedById: aprovador.id,
          validatedAt: new Date(),
          validatedById: aprovador.id,
        },
      });
    }
  }

  return { tag, assetId: asset.id };
}

test("arrastar um card pra uma coluna válida avança o ativo", async ({
  page,
}) => {
  const { tag, assetId } = await createAsset({
    nivelAtual: "L1",
    fullyValidated: true,
  });

  await login(page);
  await page.goto("/kanban");

  const card = page.locator(`[data-asset-tag="${tag}"]`);
  const targetColumn = page.locator('[data-level="L2"]');
  await card.dragTo(targetColumn);

  await expect(page.getByTestId("toast")).toContainText("avançou para o L2");
  await expect(page.locator('[data-level="L2"] [data-asset-tag="' + tag + '"]')).toBeVisible();

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  expect(asset.nivelAtual).toBe("L2");
});

test("arrastar pra uma coluna com progresso incompleto mostra toast de erro e o card não se move", async ({
  page,
}) => {
  const { tag, assetId } = await createAsset({
    nivelAtual: "L1",
    fullyValidated: false,
  });

  await login(page);
  await page.goto("/kanban");

  const card = page.locator(`[data-asset-tag="${tag}"]`);
  const targetColumn = page.locator('[data-level="L2"]');
  await card.dragTo(targetColumn);

  const toast = page.getByTestId("toast");
  await expect(toast).toContainText(tag);
  await expect(toast).toContainText("validado");
  await expect(page.locator('[data-level="L1"] [data-asset-tag="' + tag + '"]')).toBeVisible();

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  expect(asset.nivelAtual).toBe("L1");
});

test("arrastar pulando gate (L1 direto pro L3) é recusado mesmo com 100%", async ({
  page,
}) => {
  const { tag, assetId } = await createAsset({
    nivelAtual: "L1",
    fullyValidated: true,
  });

  await login(page);
  await page.goto("/kanban");

  const card = page.locator(`[data-asset-tag="${tag}"]`);
  const targetColumn = page.locator('[data-level="L3"]');
  await card.dragTo(targetColumn);

  const toast = page.getByTestId("toast");
  await expect(toast).toContainText(tag);
  await expect(toast).toContainText(/gate|sequência/i);

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  expect(asset.nivelAtual).toBe("L1");
});
