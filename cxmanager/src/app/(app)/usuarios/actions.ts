"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { generateTempPassword, hashPassword } from "@/lib/hash";

export type CreateUserState = { error?: string; success?: boolean } | undefined;

const VALID_ROLES: Role[] = ["campo", "qualidade", "aprovador"];

export async function createUserAction(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "users.manage")) {
    return { error: "Você não tem permissão para essa ação." };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "");
  const senha = String(formData.get("senha") ?? "");

  if (nome.length < 2) {
    return { error: "Nome deve ter pelo menos 2 caracteres." };
  }
  if (!email.includes("@")) {
    return { error: "E-mail inválido." };
  }
  if (!VALID_ROLES.includes(role as Role)) {
    return { error: "Perfil inválido." };
  }
  if (senha.length < 8) {
    return { error: "Senha temporária deve ter pelo menos 8 caracteres." };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe um usuário com esse e-mail." };
  }

  await db.user.create({
    data: {
      nome,
      email,
      role: role as Role,
      passwordHash: await hashPassword(senha),
    },
  });

  revalidatePath("/usuarios");
  return { success: true };
}

export type ResetPasswordState =
  | { error?: string; tempPassword?: string }
  | undefined;

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "users.manage")) {
    return { error: "Você não tem permissão para essa ação." };
  }

  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: "Usuário não encontrado." };
  }

  const tempPassword = generateTempPassword();
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(tempPassword) },
  });

  revalidatePath("/usuarios");
  return { tempPassword };
}
