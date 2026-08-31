"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "./actions";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(
    resetPasswordAction,
    undefined
  );

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={action}>
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          disabled={pending}
          className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
        >
          {pending ? "Resetando..." : "Resetar senha"}
        </button>
      </form>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.tempPassword && (
        <p className="text-xs text-emerald-700">
          Nova senha temporária:{" "}
          <code className="font-mono">{state.tempPassword}</code>
        </p>
      )}
    </div>
  );
}
