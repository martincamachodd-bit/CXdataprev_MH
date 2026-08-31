import type { ReactNode } from "react";
import { logoutAction } from "./actions";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <span className="text-sm font-semibold text-zinc-900">
          CxManager
        </span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Sair
          </button>
        </form>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
