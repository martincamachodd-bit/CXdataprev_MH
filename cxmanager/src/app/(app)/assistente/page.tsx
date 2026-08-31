import { db } from "@/lib/db";
import { AssistantChat } from "./AssistantChat";

// Mesma razão de todas as outras páginas de consulta: sem isso o Next
// pré-renderiza como estático no build, congelando a TAG de exemplo.
export const dynamic = "force-dynamic";

export default async function AssistentePage() {
  // TAG real (primeira em ordem alfabética) pra fundamentar as sugestões de
  // exemplo — nunca uma TAG fictícia fixa como no protótipo.
  const firstAsset = await db.asset.findFirst({
    orderBy: { tag: "asc" },
    select: { tag: true },
  });

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Assistente</h1>
        <p className="text-sm text-zinc-500">
          Consulta em linguagem natural — mock sem IA real, mas toda resposta
          vem do banco ao vivo.
        </p>
      </div>

      <AssistantChat exampleTag={firstAsset?.tag ?? null} />
    </div>
  );
}
