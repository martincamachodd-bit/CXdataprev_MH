import { test, expect, type Page } from "@playwright/test";
import { PrismaClient, type AssetType, type Level } from "@prisma/client";
import { ROADMAP } from "../../src/lib/roadmap";

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

// Cria um ativo e, opcionalmente, já deixa 100% das etapas aplicáveis do
// nível atual validadas via Prisma — evita reexercitar a UI de checklist
// (já coberta em asset-drawer-checklist.spec.ts) só pra chegar num estado
// "pronto pra avançar".
async function createAsset(opts: {
  nivelAtual: Level;
  tipo?: AssetType;
  openPunchA?: boolean;
  fullyValidated?: boolean;
}) {
  const aprovador = await prisma.user.findUniqueOrThrow({
    where: { email: APROVADOR_EMAIL },
  });
  const tag = `TEST-GATE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const asset = await prisma.asset.create({
    data: {
      tag,
      nome: "Ativo de Teste — Gate",
      tipo: opts.tipo ?? "MSB",
      celula: 1,
      nivelAtual: opts.nivelAtual,
    },
  });

  if (opts.openPunchA) {
    await prisma.punch.create({
      data: {
        assetId: asset.id,
        categoria: "A",
        titulo: "Punch A de teste (bloqueio de gate)",
        descricao: "Criado via Prisma pra simular pendência crítica aberta.",
        responsavel: "Resp Teste",
        createdById: aprovador.id,
      },
    });
  }

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

async function openDrawer(page: Page, tag: string) {
  await page.goto("/ativos");
  await page.getByPlaceholder("Buscar por TAG ou nome…").fill(tag);
  await page.getByText(tag, { exact: true }).click();
}

test("Aprovador avança um ativo 100% validado e sem punch A — sucesso, transição registrada", async ({
  page,
}) => {
  const { tag, assetId } = await createAsset({
    nivelAtual: "L1",
    fullyValidated: true,
  });

  await login(page);
  await openDrawer(page, tag);

  await page.getByRole("button", { name: "Avançar para L2" }).click();
  await expect(page.getByText("Nível atual: L2")).toBeVisible();

  const updated = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  expect(updated.nivelAtual).toBe("L2");

  const transition = await prisma.levelTransition.findFirst({
    where: { assetId },
  });
  expect(transition?.fromLevel).toBe("L1");
  expect(transition?.toLevel).toBe("L2");
  expect(transition?.byId).toBeTruthy();
});

test("avanço sem 100% validado é recusado com mensagem clara", async ({
  page,
}) => {
  const { tag, assetId } = await createAsset({
    nivelAtual: "L1",
    fullyValidated: false,
  });

  await login(page);
  await openDrawer(page, tag);

  await page.getByRole("button", { name: "Avançar para L2" }).click();
  await expect(page.getByText("validado", { exact: false })).toBeVisible();
  await expect(page.getByText("Nível atual: L1")).toBeVisible();

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  expect(asset.nivelAtual).toBe("L1");
});

test("ativo com punch A aberto não avança pro L4", async ({ page }) => {
  const { tag, assetId } = await createAsset({
    nivelAtual: "L3",
    openPunchA: true,
    fullyValidated: true,
  });

  await login(page);
  await openDrawer(page, tag);

  await page.getByRole("button", { name: "Avançar para L4" }).click();
  await expect(page.getByText("punch A", { exact: false })).toBeVisible();
  await expect(page.getByText("Nível atual: L3")).toBeVisible();

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  expect(asset.nivelAtual).toBe("L3");
});

for (const email of [CAMPO_EMAIL, QUALIDADE_EMAIL]) {
  test(`${email} não vê nem consegue acionar o avanço de nível`, async ({
    page,
  }) => {
    const { tag } = await createAsset({ nivelAtual: "L1", fullyValidated: true });

    await login(page, email);
    await openDrawer(page, tag);

    await expect(
      page.getByRole("button", { name: /^Avançar para/ })
    ).toHaveCount(0);
  });
}
