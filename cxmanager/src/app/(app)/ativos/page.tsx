import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getAssetSummaries } from "@/lib/assets";
import { AssetTable, type AssetListItem, type AssetStatus } from "./AssetTable";
import { NewAssetForm } from "./NewAssetForm";

// A página não usa nenhuma API de request (cookies/auth) que force
// dinamismo implicitamente, mas os dados mudam a cada mutação de ativo —
// sem isso o Next pré-renderiza a lista como estática no build.
export const dynamic = "force-dynamic";

export default async function AtivosPage() {
  const [session, summaries] = await Promise.all([auth(), getAssetSummaries()]);

  const items: AssetListItem[] = summaries.map((asset) => {
    const status: AssetStatus =
      asset.punchACount > 0
        ? "blk"
        : asset.progressPct === 100
          ? asset.nivelAtual === "L5"
            ? "con"
            : "esp"
          : "and";

    return { ...asset, status };
  });

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Base de Ativos</h1>
        <p className="text-sm text-zinc-500">
          Cada ativo carrega seu roadmap L1 → L5 — etapas não aplicáveis são
          puladas automaticamente.
        </p>
      </div>

      {session?.user?.role && can(session.user.role, "assets.edit_base") && (
        <NewAssetForm />
      )}

      <AssetTable items={items} role={session?.user?.role ?? null} />
    </div>
  );
}
