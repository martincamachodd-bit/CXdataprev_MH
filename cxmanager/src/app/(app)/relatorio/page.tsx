import { db } from "@/lib/db";
import { getAssetSummaries } from "@/lib/assets";
import { certificateStatus } from "@/lib/certificates";
import {
  computeEnergizationStatuses,
  type AssetEnergizationInput,
} from "@/lib/energization";
import { LEVELS_ORDER, ROADMAP, applicableSteps } from "@/lib/roadmap";
import {
  getStepsToday,
  getStalledReadyAssets,
  getCriticalPunches,
  getPendingEnergizations,
  getMissingDocuments,
  getSystemWarnings,
} from "@/lib/dailyReport";
import { DailyReportView } from "./DailyReportView";

// Mesma razão de /ativos, /kanban, /energizacao: o relatório é montado ao
// vivo a cada acesso, sem isso o Next pré-renderiza como estático no build.
export const dynamic = "force-dynamic";

function completionKey(assetId: string, level: string, stepId: string) {
  return `${assetId}:${level}:${stepId}`;
}

export default async function RelatorioPage() {
  const [items, allCompletions, openPunches, certificates, docCounts] =
    await Promise.all([
      getAssetSummaries(),
      db.assetStepCompletion.findMany({
        select: {
          assetId: true,
          level: true,
          stepId: true,
          executedAt: true,
          executedBy: { select: { nome: true } },
          validatedAt: true,
          validatedBy: { select: { nome: true } },
          asset: { select: { tag: true } },
        },
      }),
      db.punch.findMany({
        where: { status: "aberto" },
        include: { asset: { select: { tag: true } } },
      }),
      db.certificate.findMany(),
      db.assetDocument.groupBy({
        by: ["assetId", "level", "stepId"],
        _count: { _all: true },
      }),
    ]);

  // ── ① Hoje: etapas executadas/validadas no dia ──────────────────────
  const stepsToday = getStepsToday(
    allCompletions.map((c) => ({
      assetTag: c.asset.tag,
      stepLabel: ROADMAP[c.level].find((s) => s.id === c.stepId)?.label ?? c.stepId,
      executedAt: c.executedAt,
      executedByName: c.executedBy?.nome ?? null,
      validatedAt: c.validatedAt,
      validatedByName: c.validatedBy?.nome ?? null,
    }))
  );

  // ── ① Hoje: ativos prontos parados há mais de 24h ────────────────────
  // Proxy de "desde quando está pronto": o validatedAt mais recente entre
  // as etapas do nível atual do ativo — sem novo campo (ver SPEC).
  const lastValidatedByAssetLevel = new Map<string, Date>();
  for (const c of allCompletions) {
    if (!c.validatedAt) continue;
    const key = `${c.assetId}:${c.level}`;
    const current = lastValidatedByAssetLevel.get(key);
    if (!current || c.validatedAt > current) {
      lastValidatedByAssetLevel.set(key, c.validatedAt);
    }
  }
  const stalledAssets = getStalledReadyAssets(
    items.map((a) => ({
      tag: a.tag,
      nome: a.nome,
      nivelAtual: a.nivelAtual,
      progressPct: a.progressPct,
      lastValidatedAt: lastValidatedByAssetLevel.get(`${a.id}:${a.nivelAtual}`) ?? null,
    }))
  );

  // ── ② Punchs com prazo crítico ───────────────────────────────────────
  const criticalPunches = getCriticalPunches(
    openPunches.map((p) => ({
      assetTag: p.asset.tag,
      categoria: p.categoria,
      titulo: p.titulo,
      prazo: p.prazo,
      status: p.status,
    }))
  );

  // ── ③ Energizações pendentes ─────────────────────────────────────────
  // Mesmo cálculo de /energizacao — reaproveitado sem alteração.
  const eneValidatedIds = new Set(
    allCompletions
      .filter((c) => c.level === "L3" && c.stepId === "ene" && c.validatedAt)
      .map((c) => c.assetId)
  );
  const energizationInputs: AssetEnergizationInput[] = items.map((a) => ({
    id: a.id,
    tag: a.tag,
    fonteA: a.fonteA,
    openPunchACount: a.punchACount,
    eneValidated: eneValidatedIds.has(a.id),
  }));
  const energizationStatuses = computeEnergizationStatuses(energizationInputs);
  const pendingEnergizations = getPendingEnergizations(
    items.map((a) => ({
      tag: a.tag,
      nome: a.nome,
      status: energizationStatuses.get(a.tag) ?? "ag",
    }))
  );

  // ── ④ Documentos faltando ────────────────────────────────────────────
  // Cruza TODOS os níveis (não só o atual) — um documento que falta num
  // nível já concluído continua faltando depois do ativo avançar.
  const executedAtMap = new Map(
    allCompletions
      .filter((c) => c.executedAt)
      .map((c) => [completionKey(c.assetId, c.level, c.stepId), c.executedAt as Date])
  );
  const docCountMap = new Map(
    docCounts.map((d) => [completionKey(d.assetId, d.level, d.stepId), d._count._all])
  );

  const docSteps: {
    assetTag: string;
    stepLabel: string;
    docPattern: string;
    executedAt: Date | null;
    documentCount: number;
  }[] = [];
  for (const asset of items) {
    for (const level of LEVELS_ORDER) {
      for (const step of applicableSteps(level, asset.tipo)) {
        if (!step.docPattern) continue;
        const key = completionKey(asset.id, level, step.id);
        docSteps.push({
          assetTag: asset.tag,
          stepLabel: step.label,
          docPattern: step.docPattern,
          executedAt: executedAtMap.get(key) ?? null,
          documentCount: docCountMap.get(key) ?? 0,
        });
      }
    }
  }
  const missingDocuments = getMissingDocuments(docSteps);

  // ── ⑤ Avisos do sistema ──────────────────────────────────────────────
  const certificateStatuses = certificates.map((c) => {
    const { status, diasRestantes } = certificateStatus(c.validade);
    return { instrumento: c.instrumento, status, diasRestantes };
  });
  const systemWarnings = getSystemWarnings(certificateStatuses);

  // Formatado no servidor (não em new Date() dentro do client component) pra
  // não divergir entre a renderização do servidor e a hidratação no cliente.
  const hojeLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Relatório Diário
        </h1>
        <p className="text-sm text-zinc-500">
          Montado ao vivo a cada acesso — nada fica salvo, sempre reflete o
          estado atual do sistema.
        </p>
      </div>

      <DailyReportView
        hojeLabel={hojeLabel}
        stepsToday={stepsToday}
        stalledAssets={stalledAssets}
        criticalPunches={criticalPunches}
        pendingEnergizations={pendingEnergizations}
        missingDocuments={missingDocuments}
        systemWarnings={systemWarnings}
      />
    </div>
  );
}
