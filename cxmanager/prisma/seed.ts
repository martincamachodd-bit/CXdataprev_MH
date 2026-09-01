import { PrismaClient, type AssetType, type Level } from "@prisma/client";
import { hashPassword } from "../src/lib/hash";
import { LEVELS_ORDER, applicableSteps } from "../src/lib/roadmap";

const db = new PrismaClient();

const SEED_PASSWORD = "TrocarSenha123!";

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

// Quanto tempo atrás cada nível costuma ter sido concluído, só pra dar uma
// história plausível aos ativos que já avançaram — não afeta o gate nem o
// progresso, que continuam sendo calculados ao vivo a partir disso.
const LEVEL_COMPLETED_DAYS_AGO: Record<Level, number> = {
  L1: 46,
  L2: 27,
  L3: 11,
  L4: 3,
  L5: 0,
};

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

// Instrumentos de calibração usados pelo time de campo/qualidade — um de
// cada status (válido, vencendo, vencido) pra a tela /certificados não
// nascer com os três KPIs zerados.
const SEED_CERTIFICATES: {
  instrumento: string;
  numeroSerie: string;
  numeroCertificado: string;
  laboratorio: string;
  dataCalibracaoDaysAgo: number;
  validadeDaysFromNow: number;
  uso: string;
}[] = [
  {
    instrumento: "Megôhmetro Megabras MI-3201",
    numeroSerie: "MI3201-0847",
    numeroCertificado: "RBC 44.821",
    laboratorio: "Instemaq",
    dataCalibracaoDaysAgo: 185,
    validadeDaysFromNow: 180,
    uso: "Meggers L2 — todas as células",
  },
  {
    instrumento: "Torquímetro TQ-88",
    numeroSerie: "TQ88-1523",
    numeroCertificado: "RBC 44.905",
    laboratorio: "Instemaq",
    dataCalibracaoDaysAgo: 350,
    validadeDaysFromNow: 15,
    uso: "Torque de conexões — barramentos e cabos",
  },
  {
    instrumento: "Terrômetro MTD-20KWe",
    numeroSerie: "MTD20-0392",
    numeroCertificado: "RBC 44.760",
    laboratorio: "Lab. Elétrica Sul",
    dataCalibracaoDaysAgo: 400,
    validadeDaysFromNow: -10,
    uso: "Medição de resistência de aterramento",
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

// Completa (executa + valida) todas as etapas aplicáveis dos níveis
// estritamente anteriores ao nível atual de cada ativo seed — sem isso o
// ativo aparece com 100% do trabalho de níveis já passados marcado como
// "pendente", o que não conta uma história plausível numa demonstração. O
// nível atual em si fica intocado (é o que está "em andamento agora").
async function seedStepCompletions() {
  const [campo, qualidade] = await Promise.all([
    db.user.findUnique({ where: { email: "campo@dataprev.local" } }),
    db.user.findUnique({ where: { email: "qualidade@dataprev.local" } }),
  ]);
  if (!campo || !qualidade) {
    console.log("Usuários campo/qualidade não encontrados — pulando seed de checklist.");
    return;
  }

  for (const asset of SEED_ASSETS) {
    const dbAsset = await db.asset.findUnique({ where: { tag: asset.tag } });
    if (!dbAsset) continue;

    const currentIdx = LEVELS_ORDER.indexOf(asset.nivelAtual);
    const completedLevels = LEVELS_ORDER.slice(0, currentIdx);

    for (const level of completedLevels) {
      const steps = applicableSteps(level, asset.tipo);
      const executedAt = daysAgo(LEVEL_COMPLETED_DAYS_AGO[level] + 1);
      const validatedAt = daysAgo(LEVEL_COMPLETED_DAYS_AGO[level]);

      for (const step of steps) {
        await db.assetStepCompletion.upsert({
          where: {
            assetId_level_stepId: { assetId: dbAsset.id, level, stepId: step.id },
          },
          update: {},
          create: {
            assetId: dbAsset.id,
            level,
            stepId: step.id,
            executedAt,
            executedById: campo.id,
            validatedAt,
            validatedById: qualidade.id,
          },
        });
      }
      console.log(
        `Checklist do ${level} concluído (histórico) pra ${asset.tag}: ${steps.length} etapa(s).`
      );
    }
  }
}

async function seedCertificates() {
  const qualidade = await db.user.findUnique({
    where: { email: "qualidade@dataprev.local" },
  });
  if (!qualidade) {
    console.log("Usuário qualidade não encontrado — pulando seed de certificados.");
    return;
  }

  for (const cert of SEED_CERTIFICATES) {
    const existing = await db.certificate.findFirst({
      where: { numeroSerie: cert.numeroSerie },
    });
    if (existing) {
      console.log(`Certificado seed já existe: ${cert.instrumento}`);
      continue;
    }

    await db.certificate.create({
      data: {
        instrumento: cert.instrumento,
        numeroSerie: cert.numeroSerie,
        numeroCertificado: cert.numeroCertificado,
        laboratorio: cert.laboratorio,
        dataCalibracao: daysAgo(cert.dataCalibracaoDaysAgo),
        // validadeDaysFromNow negativo = já vencido; daysAgo(-N) vira futuro.
        validade: daysAgo(-cert.validadeDaysFromNow),
        uso: cert.uso,
        createdById: qualidade.id,
      },
    });
    console.log(`Certificado seed criado: ${cert.instrumento}`);
  }
}

async function main() {
  await seedUsers();
  await seedAssets();
  await seedPunches();
  await seedStepCompletions();
  await seedCertificates();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
