import type { AssetType, Level } from "@prisma/client";
import { db } from "./db";
import { applicableSteps } from "./roadmap";

export type AssetSummary = {
  id: string;
  tag: string;
  nome: string;
  tipo: AssetType;
  celula: number;
  fonteA: string | null;
  fonteB: string | null;
  nivelAtual: Level;
  punchACount: number;
  // progresso validado do nível atual — reaproveitado por /ativos e /kanban,
  // única fonte de verdade pra não haver duas contas divergentes do mesmo número.
  progressPct: number;
};

export async function getAssetSummaries(): Promise<AssetSummary[]> {
  const [assets, completions, openPunchACounts] = await Promise.all([
    db.asset.findMany({ orderBy: { tag: "asc" } }),
    db.assetStepCompletion.findMany({
      where: { validatedAt: { not: null } },
      select: { assetId: true, level: true, stepId: true },
    }),
    // Fonte real de "quantos punch A abertos" — o campo Asset.punchACount
    // era um stub deixado de propósito em asset-commissioning até
    // punch-list existir (ver SPEC-punch-list.md); agora é isso.
    db.punch.groupBy({
      by: ["assetId"],
      where: { categoria: "A", status: "aberto" },
      _count: { _all: true },
    }),
  ]);

  const validatedByAssetLevel = new Map<string, Set<string>>();
  for (const c of completions) {
    const key = `${c.assetId}:${c.level}`;
    const set = validatedByAssetLevel.get(key) ?? new Set<string>();
    set.add(c.stepId);
    validatedByAssetLevel.set(key, set);
  }

  const punchACountByAsset = new Map(
    openPunchACounts.map((p) => [p.assetId, p._count._all])
  );

  return assets.map((asset) => {
    const applicable = applicableSteps(asset.nivelAtual, asset.tipo);
    const validated = validatedByAssetLevel.get(`${asset.id}:${asset.nivelAtual}`);
    const validatedCount = applicable.filter((s) => validated?.has(s.id)).length;
    const progressPct =
      applicable.length === 0
        ? 100
        : Math.round((validatedCount / applicable.length) * 100);

    return {
      id: asset.id,
      tag: asset.tag,
      nome: asset.nome,
      tipo: asset.tipo,
      celula: asset.celula,
      fonteA: asset.fonteA,
      fonteB: asset.fonteB,
      nivelAtual: asset.nivelAtual,
      punchACount: punchACountByAsset.get(asset.id) ?? 0,
      progressPct,
    };
  });
}
