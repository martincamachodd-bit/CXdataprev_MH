import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PunchList, type PunchListItem } from "./PunchList";

// Mesma razão de /ativos e /kanban: sem isso o Next pré-renderiza a lista
// como estática no build, congelando os punches no estado do momento do build.
export const dynamic = "force-dynamic";

export default async function PunchPage() {
  const [session, punches] = await Promise.all([
    auth(),
    db.punch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        asset: { select: { tag: true, nome: true } },
        createdBy: { select: { nome: true } },
        closedBy: { select: { nome: true } },
      },
    }),
  ]);

  const items: PunchListItem[] = punches.map((p) => ({
    id: p.id,
    assetTag: p.asset.tag,
    assetNome: p.asset.nome,
    categoria: p.categoria,
    titulo: p.titulo,
    descricao: p.descricao,
    responsavel: p.responsavel,
    prazo: p.prazo?.toISOString() ?? null,
    status: p.status,
    createdByName: p.createdBy.nome,
    createdAt: p.createdAt.toISOString(),
    closedByName: p.closedBy?.nome,
    closedAt: p.closedAt?.toISOString() ?? null,
    resolutionNote: p.resolutionNote,
  }));

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Punch List</h1>
        <p className="text-sm text-zinc-500">
          A = crítico (bloqueia L4) · B = corrigir antes do RFO · C =
          observação
        </p>
      </div>

      <PunchList items={items} role={session?.user?.role ?? null} />
    </div>
  );
}
