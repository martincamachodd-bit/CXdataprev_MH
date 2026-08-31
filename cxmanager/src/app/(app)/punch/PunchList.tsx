"use client";

import { useMemo, useState, useTransition } from "react";
import type { PunchCategoria, PunchStatus, Role } from "@prisma/client";
import { can } from "@/lib/permissions";
import { closePunchAction } from "./actions";

export type PunchListItem = {
  id: string;
  assetTag: string;
  assetNome: string;
  categoria: PunchCategoria;
  titulo: string;
  descricao: string;
  responsavel: string;
  prazo: string | null;
  status: PunchStatus;
  createdByName: string;
  createdAt: string;
  closedByName?: string;
  closedAt: string | null;
  resolutionNote: string | null;
};

const CATEGORIAS: PunchCategoria[] = ["A", "B", "C"];
const STATUSES: PunchStatus[] = ["aberto", "fechado"];

const CATEGORIA_BADGE: Record<PunchCategoria, string> = {
  A: "bg-red-50 text-red-700 border-red-300",
  B: "bg-amber-50 text-amber-700 border-amber-300",
  C: "bg-blue-50 text-blue-700 border-blue-300",
};

const STATUS_BADGE: Record<PunchStatus, string> = {
  aberto: "bg-red-50 text-red-700",
  fechado: "bg-emerald-50 text-emerald-700",
};

const STATUS_LABEL: Record<PunchStatus, string> = {
  aberto: "Aberto",
  fechado: "Fechado",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function CloseButton({ punchId }: { punchId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setError(null);
    startTransition(async () => {
      const result = await closePunchAction(punchId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClose}
        disabled={pending}
        className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:border-zinc-500 hover:text-zinc-900 disabled:opacity-50"
      >
        {pending ? "Encerrando..." : "Encerrar"}
      </button>
      {error && <p className="max-w-[10rem] text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function PunchList({
  items,
  role,
}: {
  items: PunchListItem[];
  role: Role | null;
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return items.filter(
      (p) =>
        (!b ||
          p.assetTag.toLowerCase().includes(b) ||
          p.assetNome.toLowerCase().includes(b)) &&
        (!categoria || p.categoria === categoria) &&
        (!status || p.status === status)
    );
  }, [items, busca, categoria, status]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por TAG ou nome do ativo…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-64 rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <select
          aria-label="Filtrar por categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Categoria: todas</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
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
          {filtered.length} de {items.length} punches
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((p) => (
          <div
            key={p.id}
            data-punch-id={p.id}
            className="flex items-start gap-4 rounded-lg border border-zinc-200 bg-white p-4"
          >
            <span
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border font-mono text-base font-bold ${CATEGORIA_BADGE[p.categoria]}`}
            >
              {p.categoria}
            </span>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-zinc-900">
                <span className="font-mono text-amber-700">{p.assetTag}</span>{" "}
                — {p.titulo}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">{p.descricao}</div>
              {p.status === "fechado" && (
                <div className="mt-1 text-xs text-emerald-600">
                  Fechado por {p.closedByName} em {fmtDate(p.closedAt)}
                  {p.resolutionNote ? ` — ${p.resolutionNote}` : ""}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 text-right font-mono text-xs text-zinc-400">
              <div>{p.responsavel}</div>
              <div>prazo {fmtDate(p.prazo)}</div>
            </div>

            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[p.status]}`}
            >
              {STATUS_LABEL[p.status]}
            </span>

            {p.status === "aberto" &&
              role &&
              can(role, p.categoria === "A" ? "punch.close_a" : "punch.close_bc") && (
                <CloseButton punchId={p.id} />
              )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400">
            Nenhum punch encontrado para esses filtros.
          </div>
        )}
      </div>
    </>
  );
}
