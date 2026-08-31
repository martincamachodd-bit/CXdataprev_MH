"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { openPunchAction } from "../punch/actions";

export function OpenPunchForm({ assetId }: { assetId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(openPunchAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-500 hover:text-zinc-900"
      >
        📌 Abrir punch
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
    >
      <input type="hidden" name="assetId" value={assetId} />

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Novo punch
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-400 hover:text-zinc-700"
        >
          cancelar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor="categoria" className="block text-xs text-zinc-600">
            Categoria
          </label>
          <select
            id="categoria"
            name="categoria"
            required
            defaultValue="B"
            className="w-full rounded border border-zinc-300 px-2 py-1 text-xs"
          >
            <option value="A">A — crítico (trava L4)</option>
            <option value="B">B — corrigir antes do RFO</option>
            <option value="C">C — observação</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="prazo" className="block text-xs text-zinc-600">
            Prazo
          </label>
          <input
            id="prazo"
            name="prazo"
            type="date"
            className="w-full rounded border border-zinc-300 px-2 py-1 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="titulo" className="block text-xs text-zinc-600">
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          className="w-full rounded border border-zinc-300 px-2 py-1 text-xs"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="descricao" className="block text-xs text-zinc-600">
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          required
          rows={2}
          className="w-full rounded border border-zinc-300 px-2 py-1 text-xs"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="responsavel" className="block text-xs text-zinc-600">
          Responsável
        </label>
        <input
          id="responsavel"
          name="responsavel"
          required
          placeholder="Ex.: Eng. Elétrica, Montadora…"
          className="w-full rounded border border-zinc-300 px-2 py-1 text-xs"
        />
      </div>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-xs text-emerald-600">Punch aberto com sucesso.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Abrindo..." : "Abrir punch"}
      </button>
    </form>
  );
}
