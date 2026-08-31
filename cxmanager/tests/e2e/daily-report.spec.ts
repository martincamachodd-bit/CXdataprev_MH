import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
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

test("relatório reflete dado real cadastrado em cada uma das 5 seções", async ({
  page,
}) => {
  const aprovador = await prisma.user.findUniqueOrThrow({
    where: { email: APROVADOR_EMAIL },
  });
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Ativo A: etapa FAT (L1, docPattern) executada+validada hoje, sem
  // documento anexado — cobre "Hoje" e "Documentos faltando" de uma vez —
  // mais um punch B com prazo (cobre "Punchs com prazo"), e por não ter a
  // etapa 'ene' validada, também conta como "energização pendente".
  const tagA = `TEST-REL-A-${suffix}`;
  const assetA = await prisma.asset.create({
    data: { tag: tagA, nome: "Ativo de teste — Relatório A", tipo: "MSB", celula: 1 },
  });
  await prisma.assetStepCompletion.create({
    data: {
      assetId: assetA.id,
      level: "L1",
      stepId: "fat",
      executedAt: new Date(),
      executedById: aprovador.id,
      validatedAt: new Date(),
      validatedById: aprovador.id,
    },
  });
  await prisma.punch.create({
    data: {
      assetId: assetA.id,
      categoria: "B",
      titulo: `Punch com prazo ${suffix}`,
      descricao: "Criado via Prisma pra testar a seção de prazos.",
      responsavel: "Resp Teste",
      prazo: new Date(Date.now() + 5 * 86_400_000),
      createdById: aprovador.id,
    },
  });

  // Ativo B: 100% validado no L2, mas há 30h (>24h) — cobre "ativo parado".
  const tagB = `TEST-REL-B-${suffix}`;
  const assetB = await prisma.asset.create({
    data: { tag: tagB, nome: "Ativo de teste — Relatório B", tipo: "MSB", celula: 1, nivelAtual: "L2" },
  });
  const trintaHorasAtras = new Date(Date.now() - 30 * 3_600_000);
  for (const step of ROADMAP.L2) {
    await prisma.assetStepCompletion.create({
      data: {
        assetId: assetB.id,
        level: "L2",
        stepId: step.id,
        executedAt: trintaHorasAtras,
        executedById: aprovador.id,
        validatedAt: trintaHorasAtras,
        validatedById: aprovador.id,
      },
    });
  }

  // Certificado vencendo em 10 dias — cobre "Avisos do sistema".
  const instrumento = `Instrumento Relatório ${suffix}`;
  await prisma.certificate.create({
    data: {
      instrumento,
      numeroSerie: `SN-${suffix}`,
      numeroCertificado: `CERT-${suffix}`,
      laboratorio: "Lab Teste",
      dataCalibracao: new Date(Date.now() - 300 * 86_400_000),
      validade: new Date(Date.now() + 10 * 86_400_000),
      uso: "Uso de teste",
      createdById: aprovador.id,
    },
  });

  await login(page);
  await page.goto("/relatorio");

  // ① Hoje
  await expect(
    page.locator(`[data-step-today-tag="${tagA}"]`).first()
  ).toBeVisible();
  await expect(page.locator(`[data-stalled-tag="${tagB}"]`)).toBeVisible();
  await expect(page.locator(`[data-stalled-tag="${tagB}"]`)).toContainText(
    "parado desde"
  );

  // ② Punchs com prazo
  await expect(page.locator(`[data-punch-tag="${tagA}"]`)).toBeVisible();

  // ③ Energizações pendentes
  await expect(page.locator(`[data-energization-tag="${tagA}"]`)).toBeVisible();

  // ④ Documentos faltando
  const missingDoc = page.locator(`[data-missing-doc-tag="${tagA}"]`);
  await expect(missingDoc).toBeVisible();
  await expect(missingDoc).toContainText(`FAT-${tagA}.pdf`);

  // ⑤ Avisos do sistema
  await expect(
    page.locator(`[data-warning-instrumento="${instrumento}"]`)
  ).toBeVisible();
});

test("Exportar PDF aciona a impressão do navegador sem quebrar a página", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as unknown as { __printCalled: boolean }).__printCalled = false;
    window.print = () => {
      (window as unknown as { __printCalled: boolean }).__printCalled = true;
    };
  });

  await login(page);
  await page.goto("/relatorio");

  await page.getByRole("button", { name: "Exportar PDF" }).click();

  const printCalled = await page.evaluate(
    () => (window as unknown as { __printCalled: boolean }).__printCalled
  );
  expect(printCalled).toBe(true);
  await expect(page.getByText("Relatório Diário de Comissionamento")).toBeVisible();
});

test("Enviar pro time mostra a confirmação mockada, sem chamada real", async ({
  page,
}) => {
  await login(page);
  await page.goto("/relatorio");

  await page.getByRole("button", { name: "Enviar pro time" }).click();

  await expect(
    page.getByText("Seria enviado por e-mail/WhatsApp", { exact: false })
  ).toBeVisible();
});
