"use client";

import { useMemo, useState } from "react";
import type { Role } from "@prisma/client";
import type { AssetSummary } from "@/lib/assets";
import type { EnergizationStatus } from "@/lib/energization";
import { AssetDrawer } from "../ativos/AssetDrawer";

const STATUS_LABEL: Record<EnergizationStatus, string> = {
  en: "Energizado",
  lb: "Liberado p/ energizar",
  ag: "Aguardando fonte",
  bl: "Bloqueado (punch A)",
};

const STATUS_BADGE: Record<EnergizationStatus, string> = {
  en: "text-emerald-700 border-emerald-300 bg-emerald-50",
  lb: "text-blue-700 border-blue-300 bg-blue-50",
  ag: "text-zinc-600 border-zinc-300 bg-zinc-100",
  bl: "text-red-700 border-red-300 bg-red-50",
};

const STATUS_DOT: Record<EnergizationStatus, string> = {
  en: "bg-emerald-500",
  lb: "bg-blue-500",
  ag: "bg-zinc-400",
  bl: "bg-red-500",
};

const LEGEND: EnergizationStatus[] = ["en", "lb", "ag", "bl"];

export function EnergizationTree({
  items,
  statuses,
  depths,
  role,
}: {
  items: AssetSummary[];
  statuses: Record<string, EnergizationStatus>;
  depths: Record<string, number>;
  role: Role | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const celulas = useMemo(
    () => Array.from(new Set(items.map((i) => i.celula))).sort((a, b) => a - b),
    [items]
  );

  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        {LEGEND.map((status) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`} />
            {STATUS_LABEL[status]}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {celulas.map((celula) => {
          const assets = items
            .filter((i) => i.celula === celula)
            .sort((a, b) => (depths[a.id] ?? 0) - (depths[b.id] ?? 0));

          return (
            <div
              key={celula}
              data-celula={celula}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">
                Célula {celula}
              </h2>
              <div className="flex flex-col gap-1">
                {assets.map((asset) => {
                  const status = statuses[asset.id] ?? "ag";
                  const depth = depths[asset.id] ?? 0;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      data-asset-tag={asset.tag}
                      data-energization-status={status}
                      onClick={() => setSelectedId(asset.id)}
                      style={{ paddingLeft: `${8 + depth * 20}px` }}
                      className="flex items-center gap-2 rounded border border-transparent py-1.5 pr-2 text-left text-sm hover:border-amber-300 hover:bg-amber-50"
                    >
                      {depth > 0 && (
                        <span className="font-mono text-xs text-zinc-300">└─</span>
                      )}
                      <span className="font-mono text-xs font-semibold text-amber-700">
                        {asset.tag}
                      </span>
                      <span className="truncate text-xs text-zinc-500">
                        {asset.nome}
                      </span>
                      <span
                        className={`ml-auto flex-shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${STATUS_BADGE[status]}`}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-zinc-400">
          Regra do sistema
        </div>
        O sistema conhece a fonte principal de cada ativo (fonte A). Um ativo
        só aparece como <strong>liberado para energizar</strong> quando sua
        fonte a montante está energizada (ou é uma fonte externa não
        rastreada, como a concessionária) e ele próprio não tem punch A
        aberto. Um ativo está <strong>energizado</strong> quando a etapa
        &ldquo;Energização inicial pela fonte principal&rdquo; do L3 está
        validada — punch A aberto sempre volta o status para{" "}
        <strong>bloqueado</strong>, mesmo já energizado.
      </div>

      {selected && (
        <AssetDrawer
          key={selected.id}
          asset={selected}
          role={role}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
