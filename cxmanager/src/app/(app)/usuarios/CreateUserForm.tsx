"use client";

import { useActionState, useRef, useEffect } from "react";
import { createUserAction } from "./actions";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, undefined);
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
      <h2 className="text-sm font-semibold text-zinc-900">Novo usuário</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
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
          <label htmlFor="email" className="block text-sm text-zinc-700">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="role" className="block text-sm text-zinc-700">
            Perfil
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue="campo"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          >
            <option value="campo">Campo</option>
            <option value="qualidade">Qualidade</option>
            <option value="aprovador">Aprovador</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="senha" className="block text-sm text-zinc-700">
            Senha temporária
          </label>
          <input
            id="senha"
            name="senha"
            type="text"
            required
            minLength={8}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-emerald-600">Usuário criado com sucesso.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Criando..." : "Criar usuário"}
      </button>
    </form>
  );
}
