"use client";

import { useActionState, useRef, useEffect } from "react";
import { createAssetAction } from "./actions";

const TIPOS = ["XFM", "MSB", "UPS", "ATS", "ADP", "PDU", "CRAC", "QDL"] as const;

export function NewAssetForm() {
  const [state, action, pending] = useActionState(createAssetAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <h2 className="text-sm font-semibold text-zinc-900">Novo ativo</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="tag" className="block text-sm text-zinc-700">
            TAG
          </label>
          <input
            id="tag"
            name="tag"
            required
            placeholder="Ex.: XFM-02"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="nome" className="block text-sm text-zinc-700">
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="tipo" className="block text-sm text-zinc-700">
            Tipo
          </label>
          <select
            id="tipo"
            name="tipo"
            required
            defaultValue="XFM"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="celula" className="block text-sm text-zinc-700">
            Célula
          </label>
          <input
            id="celula"
            name="celula"
            type="number"
            min={1}
            required
            defaultValue={1}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="fonteA" className="block text-sm text-zinc-700">
            Fonte A
          </label>
          <input
            id="fonteA"
            name="fonteA"
            placeholder="TAG da fonte (opcional)"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="fonteB" className="block text-sm text-zinc-700">
            Fonte B
          </label>
          <input
            id="fonteB"
            name="fonteB"
            placeholder="TAG da fonte (opcional)"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-emerald-600">Ativo cadastrado com sucesso.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Cadastrando..." : "Cadastrar ativo"}
      </button>
    </form>
  );
}
