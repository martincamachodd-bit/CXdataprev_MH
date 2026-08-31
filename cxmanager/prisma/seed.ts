import { PrismaClient, type AssetType, type Level } from "@prisma/client";
import { hashPassword } from "../src/lib/hash";

const db = new PrismaClient();

const SEED_PASSWORD = "TrocarSenha123!";

const SEED_USERS = [
  { nome: "Mário R.", email: "aprovador@dataprev.local", role: "aprovador" as const },
  { nome: "Carla F.", email: "campo@dataprev.local", role: "campo" as const },
  { nome: "Beatriz Q.", email: "qualidade@dataprev.local", role: "qualidade" as const },
];

// Cobre tipos variados (inclusive CRAC, que tem regras de skip no roadmap)
// e níveis diferentes. UPS-1.1 e ADP-1A ganham um punch A real logo abaixo
// (seedPunches) pra testar o bloqueio do gate do L4.
const SEED_ASSETS: {
  tag: string;
  nome: string;
  tipo: AssetType;
  celula: number;
  fonteA?: string;
  fonteB?: string;
  nivelAtual: Level;
}[] = [
  { tag: "XFM-01", nome: "Transformador Principal 2,5 MVA", tipo: "XFM", celula: 1, fonteA: "Concessionária", nivelAtual: "L4" },
  { tag: "MSB-1A", nome: "Main Switchboard — Célula 1 Ramo A", tipo: "MSB", celula: 1, fonteA: "XFM-01", fonteB: "GER-01", nivelAtual: "L4" },
  { tag: "UPS-1.1", nome: "UPS 500 kVA — Célula 1", tipo: "UPS", celula: 1, fonteA: "MSB-1A", fonteB: "MSB-1B", nivelAtual: "L3" },
  { tag: "UPS-2.1", nome: "UPS 500 kVA — Célula 2", tipo: "UPS", celula: 2, fonteA: "MSB-2A", fonteB: "MSB-2B", nivelAtual: "L3" },
  { tag: "CRAC-01", nome: "Ar-Condicionado de Precisão 01", tipo: "CRAC", celula: 1, fonteA: "ADP-1A", nivelAtual: "L2" },
  { tag: "ADP-1A", nome: "Quadro de Distribuição Auxiliar 1A", tipo: "ADP", celula: 1, fonteA: "MSB-1A", nivelAtual: "L2" },
  { tag: "QDL-01", nome: "Painel de Iluminação — Célula 1", tipo: "QDL", celula: 1, fonteA: "ADP-1A", nivelAtual: "L1" },
  { tag: "PDU-1.1", nome: "Power Distribution Unit — Rack Row A", tipo: "PDU", celula: 1, fonteA: "UPS-1.1", fonteB: "UPS-1.2", nivelAtual: "L1" },
];

const SEED_PUNCHES: {
  assetTag: string;
  titulo: string;
  descricao: string;
  responsavel: string;
}[] = [
  {
    assetTag: "UPS-1.1",
    titulo: "Alarme de bypass intermitente durante transferência",
    descricao: "Reproduzido no teste funcional. Fabricante acionado — aguarda firmware.",
    responsavel: "Eng. Elétrica",
  },
  {
    assetTag: "ADP-1A",
    titulo: "Disjuntor de saída Q13 sem curva de seletividade aprovada",
    descricao: "Estudo de seletividade divergente do projeto executivo.",
    responsavel: "Projetista",
  },
];

async function seedUsers() {
  for (const user of SEED_USERS) {
    const existing = await db.user.findUnique({ where: { email: user.email } });
    if (existing) {
      console.log(`Usuário seed já existe: ${user.email}`);
      continue;
    }

    await db.user.create({
      data: {
        nome: user.nome,
        email: user.email,
        passwordHash: await hashPassword(SEED_PASSWORD),
        role: user.role,
      },
    });

    console.log(`Usuário ${user.role} inicial criado:`);
    console.log(`  e-mail: ${user.email}`);
    console.log(`  senha temporária: ${SEED_PASSWORD}`);
    console.log("  troque essa senha em produção.");
  }
}

async function seedAssets() {
  for (const asset of SEED_ASSETS) {
    const existing = await db.asset.findUnique({ where: { tag: asset.tag } });
    if (existing) {
      console.log(`Ativo seed já existe: ${asset.tag}`);
      continue;
    }

    await db.asset.create({ data: asset });
    console.log(`Ativo seed criado: ${asset.tag} (${asset.tipo}, ${asset.nivelAtual})`);
  }
}

async function seedPunches() {
  const aprovador = await db.user.findUnique({
    where: { email: "aprovador@dataprev.local" },
  });
  if (!aprovador) {
    console.log("Usuário aprovador não encontrado — pulando seed de punches.");
    return;
  }

  for (const punch of SEED_PUNCHES) {
    const asset = await db.asset.findUnique({ where: { tag: punch.assetTag } });
    if (!asset) continue;

    const existing = await db.punch.findFirst({
      where: { assetId: asset.id, titulo: punch.titulo },
    });
    if (existing) {
      console.log(`Punch seed já existe: ${punch.assetTag} — ${punch.titulo}`);
      continue;
    }

    await db.punch.create({
      data: {
        assetId: asset.id,
        categoria: "A",
        titulo: punch.titulo,
        descricao: punch.descricao,
        responsavel: punch.responsavel,
        createdById: aprovador.id,
      },
    });
    console.log(`Punch seed criado: ${punch.assetTag} — ${punch.titulo}`);
  }
}

async function main() {
  await seedUsers();
  await seedAssets();
  await seedPunches();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
