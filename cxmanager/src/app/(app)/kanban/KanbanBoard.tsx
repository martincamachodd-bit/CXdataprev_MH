"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Level, Role } from "@prisma/client";
import type { AssetSummary } from "@/lib/assets";
import { LEVELS_ORDER, NIVEIS } from "@/lib/roadmap";
import { can } from "@/lib/permissions";
import { advanceLevelAction } from "../ativos/actions";
import { AssetDrawer } from "../ativos/AssetDrawer";
import { LEVEL_BADGE } from "../ativos/AssetTable";

const LEVEL_DOT: Record<Level, string> = {
  L1: "bg-zinc-400",
  L2: "bg-blue-500",
  L3: "bg-cyan-500",
  L4: "bg-amber-500",
  L5: "bg-emerald-500",
};

const LEVEL_HEADER_BORDER: Record<Level, string> = {
  L1: "border-zinc-300",
  L2: "border-blue-300",
  L3: "border-cyan-300",
  L4: "border-amber-300",
  L5: "border-emerald-300",
};

function Toast({ message, ok }: { message: string; ok: boolean }) {
  return (
    <div
      data-testid="toast"
      className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
        ok
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-red-300 bg-red-50 text-red-800"
      }`}
    >
      {message}
    </div>
  );
}

export function KanbanBoard({
  items,
  role,
}: {
  items: AssetSummary[];
  role: Role | null;
}) {
  const [tipo, setTipo] = useState("");
  const [celula, setCelula] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOverLevel, setDragOverLevel] = useState<Level | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(
    null
  );
  const [, startTransition] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string, ok: boolean) {
    setToast({ message, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  const canApprove = role ? can(role, "gate.approve_transition") : false;

  const tipos = useMemo(
    () => Array.from(new Set(items.map((i) => i.tipo))).sort(),
    [items]
  );
  const celulas = useMemo(
    () => Array.from(new Set(items.map((i) => i.celula))).sort((a, b) => a - b),
    [items]
  );

  const filtered = useMemo(
    () =>
      items.filter(
        (i) => (!tipo || i.tipo === tipo) && (!celula || i.celula === Number(celula))
      ),
    [items, tipo, celula]
  );

  const selected = items.find((i) => i.id === selectedId) ?? null;

  function handleDrop(level: Level, assetId: string) {
    const asset = items.find((i) => i.id === assetId);
    if (!asset || asset.nivelAtual === level) return;

    startTransition(async () => {
      const result = await advanceLevelAction(assetId, level);
      if (result?.error) showToast(`⛔ ${asset.tag}: ${result.error}`, false);
      else showToast(`✅ ${asset.tag} avançou para o ${level}.`, true);
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filtrar por tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Tipo: todos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por célula"
          value={celula}
          onChange={(e) => setCelula(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Célula: todas</option>
          {celulas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-zinc-400">
          punch A bloqueia avanço p/ L4 · arraste um card pra outra coluna
          pra tentar avançar
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {LEVELS_ORDER.map((level) => {
          const cards = filtered.filter((i) => i.nivelAtual === level);
          const isDragOver = dragOverLevel === level;
          return (
            <div
              key={level}
              data-level={level}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverLevel(level);
              }}
              onDragLeave={() => setDragOverLevel((cur) => (cur === level ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverLevel(null);
                const assetId = e.dataTransfer.getData("text/plain");
                if (assetId) handleDrop(level, assetId);
              }}
              className={`min-h-[200px] rounded-xl border p-2.5 transition-colors ${
                isDragOver
                  ? "border-amber-400 bg-amber-50"
                  : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <div
                className={`mb-2.5 flex items-center gap-2 border-b-2 px-1 pb-2.5 ${LEVEL_HEADER_BORDER[level]}`}
              >
                <span
                  className={`rounded border px-2 py-0.5 font-mono text-xs font-semibold ${LEVEL_BADGE[level]}`}
                >
                  {level}
                </span>
                <span className="text-xs font-semibold text-zinc-600">
                  {NIVEIS[level].nome}
                </span>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                  {cards.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {cards.map((asset) => (
                  <div
                    key={asset.id}
                    data-asset-tag={asset.tag}
                    draggable={canApprove}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", asset.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => setSelectedId(asset.id)}
                    className={`rounded-lg border border-zinc-200 bg-white p-2.5 transition-transform ${
                      canApprove ? "cursor-grab hover:-translate-y-0.5" : "cursor-pointer"
                    } hover:border-amber-300`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-amber-700">
                        {asset.tag}
                      </span>
                      <span
                        className={`ml-auto h-1.5 w-1.5 rounded-full ${
                          asset.punchACount > 0 ? "bg-red-500" : LEVEL_DOT[level]
                        }`}
                        title={
                          asset.punchACount > 0
                            ? `${asset.punchACount} punch A aberto`
                            : undefined
                        }
                      />
                    </div>
                    <div className="mt-1 mb-1.5 text-[11px] text-zinc-500">
                      C{asset.celula} · {asset.nome}
                    </div>
                    <div className="h-1 overflow-hidden rounded bg-zinc-100">
                      <div
                        className="h-full rounded bg-zinc-500"
                        style={{ width: `${asset.progressPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <AssetDrawer
          key={selected.id}
          asset={selected}
          role={role}
          onClose={() => setSelectedId(null)}
        />
      )}

      {toast && <Toast message={toast.message} ok={toast.ok} />}
    </>
  );
}
