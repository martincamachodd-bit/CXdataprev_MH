import { auth } from "@/lib/auth";
import { getAssetSummaries } from "@/lib/assets";
import { KanbanBoard } from "./KanbanBoard";

// Mesma razão da página /ativos: sem isso o Next pré-renderiza o board como
// estático no build, congelando os cards no estado do momento do build.
export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const [session, items] = await Promise.all([auth(), getAssetSummaries()]);

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Kanban de Comissionamento
        </h1>
        <p className="text-sm text-zinc-500">
          Arraste o card pra avançar de nível — o sistema valida o gate na
          hora.
        </p>
      </div>

      <KanbanBoard items={items} role={session?.user?.role ?? null} />
    </div>
  );
}
