import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
      <p className="text-sm text-zinc-500">
        Logado como {session?.user?.name} ({session?.user?.role})
      </p>
    </div>
  );
}
