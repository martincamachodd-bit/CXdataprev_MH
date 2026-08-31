import { test, expect, type Page } from "@playwright/test";
import { PrismaClient, type Level } from "@prisma/client";

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
  tagPrefix: string;
  fonteA?: string;
  nivelAtual?: Level;
}) {
  const tag = `${opts.tagPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const asset = await prisma.asset.create({
    data: {
      tag,
      nome: `Ativo de teste — ${opts.tagPrefix}`,
      tipo: "MSB",
      celula: 1,
      fonteA: opts.fonteA,
      nivelAtual: opts.nivelAtual ?? "L3",
    },
  });
  return { tag, nome: asset.nome, assetId: asset.id };
}

async function validateEne(assetId: string) {
  const aprovador = await prisma.user.findUniqueOrThrow({
    where: { email: APROVADOR_EMAIL },
  });
  await prisma.assetStepCompletion.create({
    data: {
      assetId,
      level: "L3",
      stepId: "ene",
      executedAt: new Date(),
      executedById: aprovador.id,
      validatedAt: new Date(),
      validatedById: aprovador.id,
    },
  });
}

async function openPunchA(assetId: string, titulo: string) {
  const aprovador = await prisma.user.findUniqueOrThrow({
    where: { email: APROVADOR_EMAIL },
  });
  return prisma.punch.create({
    data: {
      assetId,
      categoria: "A",
      titulo,
      descricao: "descrição do punch A de teste",
      responsavel: "Resp Teste",
      createdById: aprovador.id,
    },
  });
}

test("ativo cuja fonte principal está energizada aparece como liberado para energizar", async ({
  page,
}) => {
  const { tag: fonteTag, assetId: fonteId } = await createAsset({
    tagPrefix: "TEST-ENE-FONTE",
  });
  await validateEne(fonteId);
  const { tag: depTag } = await createAsset({
    tagPrefix: "TEST-ENE-DEP",
    fonteA: fonteTag,
  });

  await login(page);
  await page.goto("/energizacao");

  await expect(
    page.locator(`[data-asset-tag="${fonteTag}"]`)
  ).toHaveAttribute("data-energization-status", "en");
  await expect(page.locator(`[data-asset-tag="${depTag}"]`)).toHaveAttribute(
    "data-energization-status",
    "lb"
  );
});

test("ativo com a etapa 'ene' validada aparece como energizado, e fica bloqueado assim que abre um punch A", async ({
  page,
}) => {
  const { tag, assetId } = await createAsset({ tagPrefix: "TEST-ENE-SELF" });
  await validateEne(assetId);

  await login(page);
  await page.goto("/energizacao");

  const row = page.locator(`[data-asset-tag="${tag}"]`);
  await expect(row).toHaveAttribute("data-energization-status", "en");

  await openPunchA(assetId, `Punch A bloqueia energização ${Date.now()}`);
  await page.reload();
  await expect(row).toHaveAttribute("data-energization-status", "bl");
});

test("clicar num ativo na árvore abre o drawer com o detalhe certo", async ({
  page,
}) => {
  const { tag, nome } = await createAsset({ tagPrefix: "TEST-ENE-CLICK" });

  await login(page);
  await page.goto("/energizacao");

  await page.locator(`[data-asset-tag="${tag}"]`).click();
  await expect(
    page.getByRole("heading", { level: 2, name: nome, exact: true })
  ).toBeVisible();
});
