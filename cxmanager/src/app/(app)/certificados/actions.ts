"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";

export type CreateCertificateState = { error?: string; success?: boolean } | undefined;

export async function createCertificateAction(
  _prevState: CreateCertificateState,
  formData: FormData
): Promise<CreateCertificateState> {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "certificates.manage")) {
    return { error: "Você não tem permissão para cadastrar certificados." };
  }

  const instrumento = String(formData.get("instrumento") ?? "").trim();
  const numeroSerie = String(formData.get("numeroSerie") ?? "").trim();
  const numeroCertificado = String(formData.get("numeroCertificado") ?? "").trim();
  const laboratorio = String(formData.get("laboratorio") ?? "").trim();
  const dataCalibracaoRaw = String(formData.get("dataCalibracao") ?? "").trim();
  const validadeRaw = String(formData.get("validade") ?? "").trim();
  const uso = String(formData.get("uso") ?? "").trim();

  if (instrumento.length < 2) {
    return { error: "Instrumento deve ter pelo menos 2 caracteres." };
  }
  if (numeroSerie.length < 1) {
    return { error: "Nº de série é obrigatório." };
  }
  if (numeroCertificado.length < 1) {
    return { error: "Nº do certificado é obrigatório." };
  }
  if (laboratorio.length < 2) {
    return { error: "Laboratório deve ter pelo menos 2 caracteres." };
  }
  if (uso.length < 2) {
    return { error: "Uso deve ter pelo menos 2 caracteres." };
  }

  const dataCalibracao = new Date(dataCalibracaoRaw);
  if (Number.isNaN(dataCalibracao.getTime())) {
    return { error: "Data de calibração inválida." };
  }

  const validade = new Date(validadeRaw);
  if (Number.isNaN(validade.getTime())) {
    return { error: "Validade inválida." };
  }

  if (validade.getTime() <= dataCalibracao.getTime()) {
    return { error: "A validade deve ser posterior à data de calibração." };
  }

  await db.certificate.create({
    data: {
      instrumento,
      numeroSerie,
      numeroCertificado,
      laboratorio,
      dataCalibracao,
      validade,
      uso,
      createdById: session.user.id,
    },
  });

  revalidatePath("/certificados");
  return { success: true };
}
