"use client";

import { useActionState, useRef, useEffect } from "react";
import { createCertificateAction } from "./actions";

export function NewCertificateForm() {
  const [state, action, pending] = useActionState(createCertificateAction, undefined);
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
      <h2 className="text-sm font-semibold text-zinc-900">Cadastrar certificado</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="instrumento" className="block text-sm text-zinc-700">
            Instrumento
          </label>
          <input
            id="instrumento"
            name="instrumento"
            required
            placeholder="Ex.: Megôhmetro Megabras MI-3201"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="numeroSerie" className="block text-sm text-zinc-700">
            Nº de série
          </label>
          <input
            id="numeroSerie"
            name="numeroSerie"
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="numeroCertificado" className="block text-sm text-zinc-700">
            Nº do certificado
          </label>
          <input
            id="numeroCertificado"
            name="numeroCertificado"
            required
            placeholder="Ex.: RBC 44.821"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="laboratorio" className="block text-sm text-zinc-700">
            Laboratório
          </label>
          <input
            id="laboratorio"
            name="laboratorio"
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="dataCalibracao" className="block text-sm text-zinc-700">
            Data de calibração
          </label>
          <input
            id="dataCalibracao"
            name="dataCalibracao"
            type="date"
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="validade" className="block text-sm text-zinc-700">
            Validade
          </label>
          <input
            id="validade"
            name="validade"
            type="date"
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1 sm:col-span-3">
          <label htmlFor="uso" className="block text-sm text-zinc-700">
            Uso
          </label>
          <input
            id="uso"
            name="uso"
            required
            placeholder="Ex.: Meggers L2 — todas as células"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-emerald-600">Certificado cadastrado com sucesso.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Cadastrando..." : "Cadastrar certificado"}
      </button>
    </form>
  );
}
