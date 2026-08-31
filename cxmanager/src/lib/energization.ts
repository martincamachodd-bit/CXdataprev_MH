// Status de energização em cascata — nunca armazenado, sempre calculado a
// partir do que já existe: Asset.fonteA (texto livre, pode referenciar a TAG
// de outro ativo ou ser uma fonte externa como "Concessionária"), a etapa
// `ene` do L3 (AssetStepCompletion) e a contagem de punch A aberto. Ver
// SPEC-energization.md.

export type EnergizationStatus = "en" | "lb" | "ag" | "bl";

export type AssetEnergizationInput = {
  id: string;
  tag: string;
  fonteA: string | null;
  openPunchACount: number;
  eneValidated: boolean; // etapa 'ene' do L3 validada?
};

const MAX_DEPTH = 64; // teto defensivo — nenhuma instalação real chega perto disso

// Resolve o status de cada ativo subindo a cadeia de fonteA até uma fonte
// externa/raiz. Punch A sempre prevalece, mesmo sobre um 'ene' já validado.
// Fonte que não bate com nenhuma TAG cadastrada é tratada como sempre
// disponível (fonte externa, ex.: concessionária). Ciclo nunca trava a
// página — cai em "ag" pros ativos envolvidos.
export function computeEnergizationStatuses(
  assets: AssetEnergizationInput[]
): Map<string, EnergizationStatus> {
  const byTag = new Map(assets.map((a) => [a.tag, a]));
  const cache = new Map<string, EnergizationStatus>();
  const resolving = new Set<string>();

  function resolve(tag: string): EnergizationStatus {
    if (cache.has(tag)) return cache.get(tag)!;
    const asset = byTag.get(tag);
    if (!asset || resolving.has(tag)) return "ag";
    resolving.add(tag);

    let status: EnergizationStatus;
    if (asset.openPunchACount > 0) {
      status = "bl";
    } else if (asset.eneValidated) {
      status = "en";
    } else {
      const fonteResolvida =
        !asset.fonteA || !byTag.has(asset.fonteA)
          ? true
          : resolve(asset.fonteA) === "en";
      status = fonteResolvida ? "lb" : "ag";
    }

    resolving.delete(tag);
    cache.set(tag, status);
    return status;
  }

  for (const asset of assets) resolve(asset.tag);
  return cache;
}

// Profundidade = número de saltos até uma fonte externa/raiz — só para
// indentação visual da árvore, não influencia o status calculado acima.
export function computeSourceDepth(
  assets: Pick<AssetEnergizationInput, "tag" | "fonteA">[]
): Map<string, number> {
  const byTag = new Map(assets.map((a) => [a.tag, a]));
  const cache = new Map<string, number>();
  const resolving = new Set<string>();

  function resolve(tag: string, hops: number): number {
    if (cache.has(tag)) return cache.get(tag)!;
    const asset = byTag.get(tag);
    if (!asset || resolving.has(tag) || hops >= MAX_DEPTH) return 0;
    resolving.add(tag);

    const depth =
      !asset.fonteA || !byTag.has(asset.fonteA)
        ? 0
        : resolve(asset.fonteA, hops + 1) + 1;

    resolving.delete(tag);
    cache.set(tag, depth);
    return depth;
  }

  for (const asset of assets) resolve(asset.tag, 0);
  return cache;
}
