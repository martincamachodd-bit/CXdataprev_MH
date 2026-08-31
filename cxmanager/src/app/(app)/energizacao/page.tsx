import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAssetSummaries } from "@/lib/assets";
import {
  computeEnergizationStatuses,
  computeSourceDepth,
  type AssetEnergizationInput,
} from "@/lib/energization";
import { EnergizationTree } from "./EnergizationTree";

// Mesma razão de /ativos e /kanban: os dados mudam a cada validação de
// etapa/punch, sem isso o Next pré-renderiza a árvore como estática no build.
export const dynamic = "force-dynamic";

export default async function EnergizacaoPage() {
  const [session, items, eneCompletions] = await Promise.all([
    auth(),
    getAssetSummaries(),
    db.assetStepCompletion.findMany({
      where: { level: "L3", stepId: "ene", validatedAt: { not: null } },
      select: { assetId: true },
    }),
  ]);

  const eneValidatedIds = new Set(eneCompletions.map((c) => c.assetId));

  const inputs: AssetEnergizationInput[] = items.map((asset) => ({
    id: asset.id,
    tag: asset.tag,
    fonteA: asset.fonteA,
    openPunchACount: asset.punchACount,
    eneValidated: eneValidatedIds.has(asset.id),
  }));

  // As duas funções resolvem a cascata por TAG (é assim que fonteA
  // referencia outro ativo), mas o client component indexa por id — reindexa
  // aqui, no único lugar que tem as duas chaves ao mesmo tempo.
  const statusesByTag = computeEnergizationStatuses(inputs);
  const depthsByTag = computeSourceDepth(inputs);
  const statuses = Object.fromEntries(
    items.map((asset) => [asset.id, statusesByTag.get(asset.tag) ?? "ag"])
  );
  const depths = Object.fromEntries(
    items.map((asset) => [asset.id, depthsByTag.get(asset.tag) ?? 0])
  );

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Hierarquia de Energização
        </h1>
        <p className="text-sm text-zinc-500">
          Status calculado a partir da fonte principal (fonte A) de cada
          ativo e da etapa &ldquo;Energização inicial&rdquo; do L3.
        </p>
      </div>

      <EnergizationTree
        items={items}
        statuses={statuses}
        depths={depths}
        role={session?.user?.role ?? null}
      />
    </div>
  );
}
