import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

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

async function ask(page: Page, question: string) {
  await page.getByLabel("Pergunta pro assistente").fill(question);
  await page.getByRole("button", { name: "Enviar" }).click();
}

function lastBotMessage(page: Page) {
  return page.locator('[data-role="bot"]').last();
}

test("as 4 perguntas de exemplo respondem com dado real cadastrado", async ({
  page,
}) => {
  const aprovador = await prisma.user.findUniqueOrThrow({
    where: { email: APROVADOR_EMAIL },
  });
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const tag = `TEST-IA-${suffix}`;
  const asset = await prisma.asset.create({
    data: { tag, nome: `Ativo de teste — Assistente ${suffix}`, tipo: "MSB", celula: 1 },
  });
  await prisma.punch.create({
    data: {
      assetId: asset.id,
      categoria: "A",
      titulo: `Punch A de teste ${suffix}`,
      descricao: "Criado via Prisma pra testar o assistente.",
      responsavel: "Resp Teste",
      createdById: aprovador.id,
    },
  });
  await prisma.assetDocument.create({
    data: {
      assetId: asset.id,
      level: "L1",
      stepId: "fat",
      filename: `FAT-${tag}.pdf`,
      storedPath: `/uploads/FAT-${tag}.pdf`,
      uploadedById: aprovador.id,
    },
  });

  // Ativo pronto pro L4: L3, 100% validado, zero punch A.
  const readyTag = `TEST-IA-READY-${suffix}`;
  const readyAsset = await prisma.asset.create({
    data: { tag: readyTag, nome: `Ativo pronto — Assistente ${suffix}`, tipo: "MSB", celula: 1, nivelAtual: "L3" },
  });
  const roadmapL3Steps = ["ene", "fun", "ter", "prt", "trf"];
  for (const stepId of roadmapL3Steps) {
    await prisma.assetStepCompletion.create({
      data: {
        assetId: readyAsset.id,
        level: "L3",
        stepId,
        executedAt: new Date(),
        executedById: aprovador.id,
        validatedAt: new Date(),
        validatedById: aprovador.id,
      },
    });
  }

  const instrumento = `Instrumento Assistente ${suffix}`;
  await prisma.certificate.create({
    data: {
      instrumento,
      numeroSerie: `SN-${suffix}`,
      numeroCertificado: `CERT-${suffix}`,
      laboratorio: "Lab Teste",
      dataCalibracao: new Date(Date.now() - 300 * 86_400_000),
      validade: new Date(Date.now() + 8 * 86_400_000),
      uso: "Uso de teste",
      createdById: aprovador.id,
    },
  });

  await login(page);
  await page.goto("/assistente");

  // ① Status de ativo
  await ask(page, `Status da ${tag}?`);
  await expect(lastBotMessage(page)).toContainText(tag);
  await expect(lastBotMessage(page)).toContainText("Punch A aberto: 1");

  // ② Prontos pro L4
  await ask(page, "Quais ativos estão prontos pro L4?");
  await expect(lastBotMessage(page)).toContainText(readyTag);

  // ③ Documentos do ativo
  await ask(page, `Documentos do ${tag}`);
  await expect(lastBotMessage(page)).toContainText(`FAT-${tag}.pdf`);

  // ④ Certificados vencendo
  await ask(page, "Certificados vencendo esse mês");
  await expect(lastBotMessage(page)).toContainText(instrumento);
});

test("pergunta sem nenhum casamento de intent cai na mensagem genérica de mock", async ({
  page,
}) => {
  await login(page);
  await page.goto("/assistente");

  await ask(page, "qual a previsão do tempo amanhã?");
  await expect(lastBotMessage(page)).toContainText("mock", { ignoreCase: true });
});

test("recarregar a página limpa a conversa — nada é persistido", async ({
  page,
}) => {
  await login(page);
  await page.goto("/assistente");

  await ask(page, "Certificados vencendo esse mês");
  await expect(page.locator('[data-role="user"]')).toHaveCount(1);

  await page.reload();

  await expect(page.locator('[data-role="user"]')).toHaveCount(0);
  await expect(page.locator('[data-role="bot"]')).toHaveCount(1); // só a mensagem inicial
});
