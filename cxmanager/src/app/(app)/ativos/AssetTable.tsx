"use client";

import { useMemo, useState } from "react";
import type { Level, Role } from "@prisma/client";
import type { AssetSummary } from "@/lib/assets";
import { AssetDrawer } from "./AssetDrawer";

export type AssetStatus = "and" | "blk" | "esp" | "con";

export type AssetListItem = AssetSummary & { status: AssetStatus };

export const LEVEL_BADGE: Record<Level, string> = {
  L1: "text-zinc-600 border-zinc-300 bg-zinc-100",
  L2: "text-blue-700 border-blue-300 bg-blue-50",
  L3: "text-cyan-700 border-cyan-300 bg-cyan-50",
  L4: "text-amber-700 border-amber-300 bg-amber-50",
  L5: "text-emerald-700 border-emerald-300 bg-emerald-50",
};

const STATUS_LABEL: Record<AssetStatus, string> = {
  and: "Em andamento",
  blk: "Bloqueado",
  esp: "Em espera",
  con: "Concluído",
};

const STATUS_BADGE: Record<AssetStatus, string> = {
  and: "text-blue-700 bg-blue-50",
  blk: "text-red-700 bg-red-50",
  esp: "text-zinc-600 bg-zinc-100",
  con: "text-emerald-700 bg-emerald-50",
};

const LEVELS: Level[] = ["L1", "L2", "L3", "L4", "L5"];
const STATUSES: AssetStatus[] = ["and", "blk", "esp", "con"];

export function AssetTable({
  items,
  role,
}: {
  items: AssetListItem[];
  role: Role | null;
}) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [celula, setCelula] = useState("");
  const [nivel, setNivel] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tipos = useMemo(
    () => Array.from(new Set(items.map((i) => i.tipo))).sort(),
    [items]
  );
  const celulas = useMemo(
    () => Array.from(new Set(items.map((i) => i.celula))).sort((a, b) => a - b),
    [items]
  );

  const filtered = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!b || i.tag.toLowerCase().includes(b) || i.nome.toLowerCase().includes(b)) &&
        (!tipo || i.tipo === tipo) &&
        (!celula || i.celula === Number(celula)) &&
        (!nivel || i.nivelAtual === nivel) &&
        (!status || i.status === status)
    );
  }, [items, busca, tipo, celula, nivel, status]);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por TAG ou nome…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-64 rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
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
        <select
          aria-label="Filtrar por nível"
          value={nivel}
          onChange={(e) => setNivel(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Nível: todos</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Status: todos</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <span className="ml-auto font-mono text-xs text-zinc-400">
          {filtered.length} de {items.length} ativos
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="px-4 py-2 font-medium">TAG / Ativo</th>
              <th className="px-4 py-2 font-medium">Célula</th>
              <th className="px-4 py-2 font-medium">Fonte A / B</th>
              <th className="px-4 py-2 font-medium">Nível</th>
              <th className="px-4 py-2 font-medium">Progresso do nível</th>
              <th className="px-4 py-2 font-medium">Punch</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
              >
                <td className="px-4 py-2">
                  <div className="font-mono font-semibold text-amber-700">
                    {item.tag}
                  </div>
                  <div className="text-xs text-zinc-500">{item.nome}</div>
                </td>
                <td className="px-4 py-2 font-mono text-zinc-600">
                  C{item.celula}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-zinc-600">
                  {item.fonteA ?? "—"}
                  {item.fonteB ? ` / ${item.fonteB}` : ""}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block rounded border px-2 py-0.5 font-mono text-xs font-semibold ${LEVEL_BADGE[item.nivelAtual]}`}
                  >
                    {item.nivelAtual}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded bg-zinc-100">
                      <div
                        className="h-full rounded bg-zinc-500"
                        style={{ width: `${item.progressPct}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-zinc-500">
                      {item.progressPct}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-zinc-500">
                  {item.punchACount > 0 ? (
                    <b className="text-red-600">{item.punchACount}A</b>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                  Nenhum ativo encontrado para esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
