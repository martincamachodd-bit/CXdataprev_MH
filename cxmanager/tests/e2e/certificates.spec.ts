import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const APROVADOR_EMAIL = "aprovador@dataprev.local";
const QUALIDADE_EMAIL = "qualidade@dataprev.local";
const CAMPO_EMAIL = "campo@dataprev.local";
const SEED_PASSWORD = "TrocarSenha123!";

function isoDate(daysFromToday: number): string {
  return new Date(Date.now() + daysFromToday * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

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

test("lista mostra o certificado com o status certo e o KPI de vencidos reflete a tabela", async ({
  page,
}) => {
  const aprovador = await prisma.user.findUniqueOrThrow({
    where: { email: APROVADOR_EMAIL },
  });

  await login(page);
  await page.goto("/certificados");

  const baselineExp = Number(await page.getByTestId("kpi-exp").textContent());

  const suffix = `${Date.now()}`;
  const cert = await prisma.certificate.create({
    data: {
      instrumento: `Instrumento Teste ${suffix}`,
      numeroSerie: `SN-${suffix}`,
      numeroCertificado: `CERT-${suffix}`,
      laboratorio: "Lab Teste",
      dataCalibracao: new Date(Date.now() - 400 * 86_400_000),
      validade: new Date(Date.now() - 5 * 86_400_000), // vencido há 5 dias
      uso: "Uso de teste",
      createdById: aprovador.id,
    },
  });

  await page.reload();

  const row = page.locator(`[data-certificate-id="${cert.id}"]`);
  await expect(row).toBeVisible();
  await expect(row.getByText("Vencido há 5 d")).toBeVisible();

  const afterExp = Number(await page.getByTestId("kpi-exp").textContent());
  expect(afterExp).toBe(baselineExp + 1);
});

test("Qualidade cadastra um certificado pela UI e ele aparece na lista com o status certo", async ({
  page,
}) => {
  await login(page, QUALIDADE_EMAIL);
  await page.goto("/certificados");

  const baselineOk = Number(await page.getByTestId("kpi-ok").textContent());

  const suffix = `${Date.now()}`;
  await page.getByLabel("Instrumento").fill(`Torquímetro Teste ${suffix}`);
  await page.getByLabel("Nº de série").fill(`SN-${suffix}`);
  await page.getByLabel("Nº do certificado").fill(`CERT-${suffix}`);
  await page.getByLabel("Laboratório").fill("Instemaq");
  await page.getByLabel("Data de calibração").fill(isoDate(-30));
  await page.getByLabel("Validade").fill(isoDate(200));
  await page.getByLabel("Uso").fill("Torque de conexões L2");
  await page.getByRole("button", { name: "Cadastrar certificado" }).click();

  await expect(
    page.getByText("Certificado cadastrado com sucesso.")
  ).toBeVisible();

  const cert = await prisma.certificate.findFirstOrThrow({
    where: { numeroSerie: `SN-${suffix}` },
  });
  expect(cert.instrumento).toBe(`Torquímetro Teste ${suffix}`);

  const row = page.locator(`[data-certificate-id="${cert.id}"]`);
  await expect(row).toBeVisible();
  await expect(row.getByText("Válido", { exact: true })).toBeVisible();

  const afterOk = Number(await page.getByTestId("kpi-ok").textContent());
  expect(afterOk).toBe(baselineOk + 1);
});

test("Campo não vê nem consegue acionar o cadastro de certificado", async ({
  page,
}) => {
  await login(page, CAMPO_EMAIL);
  await page.goto("/certificados");

  await expect(
    page.getByText("Cadastrar certificado", { exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cadastrar certificado" })
  ).toHaveCount(0);
});
