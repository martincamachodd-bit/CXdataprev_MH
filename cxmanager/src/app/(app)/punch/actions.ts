"use server";

import { revalidatePath } from "next/cache";
import type { PunchCategoria } from "@prisma/client";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";

export type OpenPunchState = { error?: string; success?: boolean } | undefined;

const VALID_CATEGORIAS: PunchCategoria[] = ["A", "B", "C"];

export async function openPunchAction(
  _prevState: OpenPunchState,
  formData: FormData
): Promise<OpenPunchState> {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "punch.create")) {
    return { error: "Você não tem permissão para abrir punch." };
  }

  const assetId = String(formData.get("assetId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const responsavel = String(formData.get("responsavel") ?? "").trim();
  const prazoRaw = String(formData.get("prazo") ?? "").trim();

  if (!VALID_CATEGORIAS.includes(categoria as PunchCategoria)) {
    return { error: "Categoria inválida." };
  }
  if (titulo.length < 3) {
    return { error: "Título deve ter pelo menos 3 caracteres." };
  }
  if (descricao.length < 3) {
    return { error: "Descrição deve ter pelo menos 3 caracteres." };
  }
  if (responsavel.length < 2) {
    return { error: "Responsável deve ter pelo menos 2 caracteres." };
  }

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return { error: "Ativo não encontrado." };
  }

  let prazo: Date | undefined;
  if (prazoRaw) {
    const parsed = new Date(prazoRaw);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "Prazo inválido." };
    }
    prazo = parsed;
  }

  await db.punch.create({
    data: {
      assetId,
      categoria: categoria as PunchCategoria,
      titulo,
      descricao,
      responsavel,
      prazo,
      createdById: session.user.id,
    },
  });

  revalidatePath("/ativos");
  revalidatePath("/kanban");
  revalidatePath("/punch");
  return { success: true };
}

export type ClosePunchState = { error?: string } | undefined;

export async function closePunchAction(
  punchId: string,
  resolutionNote?: string
): Promise<ClosePunchState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Sessão inválida." };
  }

  const punch = await db.punch.findUnique({ where: { id: punchId } });
  if (!punch) {
    return { error: "Punch não encontrado." };
  }
  if (punch.status === "fechado") {
    return { error: "Esse punch já está fechado." };
  }

  // Categoria A é a mais crítica — só Aprovador pode encerrar. B/C podem
  // ser encerrados por Campo, Qualidade ou Aprovador.
  const requiredAction = punch.categoria === "A" ? "punch.close_a" : "punch.close_bc";
  if (!can(session.user.role, requiredAction)) {
    return { error: "Você não tem permissão para encerrar esse punch." };
  }

  await db.punch.update({
    where: { id: punchId },
    data: {
      status: "fechado",
      closedAt: new Date(),
      closedById: session.user.id,
      resolutionNote: resolutionNote?.trim() || null,
    },
  });

  revalidatePath("/ativos");
  revalidatePath("/kanban");
  revalidatePath("/punch");
  return undefined;
}
