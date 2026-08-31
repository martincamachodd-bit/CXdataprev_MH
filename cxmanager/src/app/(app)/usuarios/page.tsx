import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { CreateUserForm } from "./CreateUserForm";
import { ResetPasswordButton } from "./ResetPasswordButton";

const ROLE_LABEL = {
  campo: "Campo",
  qualidade: "Qualidade",
  aprovador: "Aprovador",
} as const;

export default async function UsuariosPage() {
  const session = await auth();

  if (!session?.user || !can(session.user.role, "users.manage")) {
    redirect("/dashboard");
  }

  const users = await db.user.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, email: true, role: true },
  });

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Usuários</h1>
        <p className="text-sm text-zinc-500">
          Gestão de contas da equipe da obra.
        </p>
      </div>

      <CreateUserForm />

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">E-mail</th>
              <th className="px-4 py-2 font-medium">Perfil</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2 text-zinc-900">{user.nome}</td>
                <td className="px-4 py-2 text-zinc-600">{user.email}</td>
                <td className="px-4 py-2 text-zinc-600">
                  {ROLE_LABEL[user.role]}
                </td>
                <td className="px-4 py-2">
                  <ResetPasswordButton userId={user.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
