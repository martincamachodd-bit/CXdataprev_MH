"use server";

import { revalidatePath } from "next/cache";
import type { AssetType, Level } from "@prisma/client";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { applicableSteps, LEVELS_ORDER, ROADMAP } from "@/lib/roadmap";
import { canAdvance } from "@/lib/gate";
import { saveUploadedFile } from "@/lib/uploads";

export type StepState = "na" | "pending" | "executed" | "validated";

export type AssetDetailDocument = {
  id: string;
  filename: string;
  uploadedAt: string;
  uploadedByName?: string;
};

export type AssetDetailStep = {
  id: string;
  label: string;
  docPattern?: string;
  state: StepState;
  executedByName?: string;
  executedAt?: string;
  validatedByName?: string;
  validatedAt?: string;
  documents: AssetDetailDocument[];
};

export type AssetDetailLevel = {
  level: Level;
  steps: AssetDetailStep[];
};

export type AssetDetail = {
  id: string;
  tag: string;
  nome: string;
  tipo: AssetType;
  celula: number;
  fonteA: string | null;
  fonteB: string | null;
  nivelAtual: Level;
  levels: AssetDetailLevel[];
};

export async function getAssetDetail(assetId: string): Promise<AssetDetail | null> {
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) return null;

  const [completions, documents] = await Promise.all([
    db.assetStepCompletion.findMany({
      where: { assetId },
      include: {
        executedBy: { select: { nome: true } },
        validatedBy: { select: { nome: true } },
      },
    }),
    db.assetDocument.findMany({
      where: { assetId },
      include: { uploadedBy: { select: { nome: true } } },
      orderBy: { uploadedAt: "desc" },
    }),
  ]);
  const byKey = new Map(completions.map((c) => [`${c.level}:${c.stepId}`, c]));
  const docsByKey = new Map<string, AssetDetailDocument[]>();
  for (const d of documents) {
    const key = `${d.level}:${d.stepId}`;
    const list = docsByKey.get(key) ?? [];
    list.push({
      id: d.id,
      filename: d.filename,
      uploadedAt: d.uploadedAt.toISOString(),
      uploadedByName: d.uploadedBy.nome,
    });
    docsByKey.set(key, list);
  }

  const levels: AssetDetailLevel[] = LEVELS_ORDER.map((level) => ({
    level,
    steps: ROADMAP[level].map((step) => {
      const isNA = step.skipFor?.includes(asset.tipo) ?? false;
      if (isNA) {
        return {
          id: step.id,
          label: step.label,
          docPattern: step.docPattern,
          state: "na" as const,
          documents: [],
        };
      }

      const c = byKey.get(`${level}:${step.id}`);
      const state: StepState = c?.validatedAt
        ? "validated"
        : c?.executedAt
          ? "executed"
          : "pending";

      return {
        id: step.id,
        label: step.label,
        docPattern: step.docPattern,
        state,
        executedByName: c?.executedBy?.nome,
        executedAt: c?.executedAt?.toISOString(),
        validatedByName: c?.validatedBy?.nome,
        validatedAt: c?.validatedAt?.toISOString(),
        documents: docsByKey.get(`${level}:${step.id}`) ?? [],
      };
    }),
  }));

  return {
    id: asset.id,
    tag: asset.tag,
    nome: asset.nome,
    tipo: asset.tipo,
    celula: asset.celula,
    fonteA: asset.fonteA,
    fonteB: asset.fonteB,
    nivelAtual: asset.nivelAtual,
    levels,
  };
}

export type StepActionState = { error?: string } | undefined;

function findStep(level: Level, stepId: string) {
  return ROADMAP[level].find((s) => s.id === stepId);
}

export async function executeStepAction(
  assetId: string,
  level: Level,
  stepId: string
): Promise<StepActionState> {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "checklist.edit")) {
    return { error: "Você não tem permissão para executar etapas." };
  }

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) return { error: "Ativo não encontrado." };

  const step = findStep(level, stepId);
  if (!step) return { error: "Etapa inválida." };
  if (step.skipFor?.includes(asset.tipo)) {
    return { error: "Essa etapa não se aplica a esse tipo de ativo." };
  }

  await db.assetStepCompletion.upsert({
    where: { assetId_level_stepId: { assetId, level, stepId } },
    create: { assetId, level, stepId, executedAt: new Date(), executedById: session.user.id },
    update: { executedAt: new Date(), executedById: session.user.id },
  });

  revalidatePath("/ativos");
  revalidatePath("/kanban");
  return undefined;
}

export type UploadDocumentState = { error?: string } | undefined;

export async function uploadDocumentAction(
  _prevState: UploadDocumentState,
  formData: FormData
): Promise<UploadDocumentState> {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "checklist.edit")) {
    return { error: "Você não tem permissão para anexar documentos." };
  }

  const assetId = String(formData.get("assetId") ?? "");
  const level = String(formData.get("level") ?? "") as Level;
  const stepId = String(formData.get("stepId") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) return { error: "Ativo não encontrado." };

  const step = findStep(level, stepId);
  if (!step) return { error: "Etapa inválida." };
  if (step.skipFor?.includes(asset.tipo)) {
    return { error: "Essa etapa não se aplica a esse tipo de ativo." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { storedPath, filename } = await saveUploadedFile(asset.tag, file.name, buffer);

  await db.assetDocument.create({
    data: { assetId, level, stepId, filename, storedPath, uploadedById: session.user.id },
  });

  revalidatePath("/ativos");
  revalidatePath("/kanban");
  return undefined;
}

export async function validateStepAction(
  assetId: string,
  level: Level,
  stepId: string
): Promise<StepActionState> {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "checklist.validate")) {
    return { error: "Você não tem permissão para validar etapas." };
  }

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) return { error: "Ativo não encontrado." };

  const step = findStep(level, stepId);
  if (!step) return { error: "Etapa inválida." };
  if (step.skipFor?.includes(asset.tipo)) {
    return { error: "Essa etapa não se aplica a esse tipo de ativo." };
  }

  const existing = await db.assetStepCompletion.findUnique({
    where: { assetId_level_stepId: { assetId, level, stepId } },
  });
  if (!existing?.executedAt) {
    return { error: "Etapa ainda não foi executada — não é possível validar." };
  }

  await db.assetStepCompletion.update({
    where: { assetId_level_stepId: { assetId, level, stepId } },
    data: { validatedAt: new Date(), validatedById: session.user.id },
  });

  revalidatePath("/ativos");
  revalidatePath("/kanban");
  return undefined;
}

export type AdvanceLevelState = { error?: string } | undefined;

// Única fonte de verdade do gate: reaproveitada tanto pelo botão do drawer
// quanto pelo drag-and-drop do Kanban (Tarefa 9) — nenhuma lógica duplicada.
export async function advanceLevelAction(
  assetId: string,
  toLevel: Level
): Promise<AdvanceLevelState> {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "gate.approve_transition")) {
    return { error: "Você não tem permissão para aprovar transição de gate." };
  }

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) return { error: "Ativo não encontrado." };

  const applicable = applicableSteps(asset.nivelAtual, asset.tipo);
  let validatedProgressPct = 100;
  if (applicable.length > 0) {
    const validatedCount = await db.assetStepCompletion.count({
      where: {
        assetId,
        level: asset.nivelAtual,
        validatedAt: { not: null },
        stepId: { in: applicable.map((s) => s.id) },
      },
    });
    validatedProgressPct = Math.round((validatedCount / applicable.length) * 100);
  }

  // Fonte real de pendências abertas — Asset.punchACount era o stub que
  // este cálculo substitui (ver SPEC-punch-list.md).
  const [openPunchACount, openPunchTotalCount] = await Promise.all([
    db.punch.count({ where: { assetId, categoria: "A", status: "aberto" } }),
    db.punch.count({ where: { assetId, status: "aberto" } }),
  ]);

  const gate = canAdvance(
    asset.nivelAtual,
    toLevel,
    validatedProgressPct,
    openPunchACount,
    openPunchTotalCount
  );
  if (!gate.ok) return { error: gate.reason };

  await db.$transaction([
    db.asset.update({ where: { id: assetId }, data: { nivelAtual: toLevel } }),
    db.levelTransition.create({
      data: { assetId, fromLevel: asset.nivelAtual, toLevel, byId: session.user.id },
    }),
  ]);

  revalidatePath("/ativos");
  revalidatePath("/kanban");
  return undefined;
}

export type CreateAssetState = { error?: string; success?: boolean } | undefined;

const VALID_TIPOS: AssetType[] = ["XFM", "MSB", "UPS", "ATS", "ADP", "PDU", "CRAC", "QDL"];

export async function createAssetAction(
  _prevState: CreateAssetState,
  formData: FormData
): Promise<CreateAssetState> {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "assets.edit_base")) {
    return { error: "Você não tem permissão para cadastrar ativos." };
  }

  const tag = String(formData.get("tag") ?? "").trim().toUpperCase();
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const celulaRaw = String(formData.get("celula") ?? "");
  const fonteA = String(formData.get("fonteA") ?? "").trim();
  const fonteB = String(formData.get("fonteB") ?? "").trim();

  if (tag.length < 2) {
    return { error: "TAG deve ter pelo menos 2 caracteres." };
  }
  if (nome.length < 2) {
    return { error: "Nome deve ter pelo menos 2 caracteres." };
  }
  if (!VALID_TIPOS.includes(tipo as AssetType)) {
    return { error: "Tipo inválido." };
  }
  const celula = Number(celulaRaw);
  if (!Number.isInteger(celula) || celula < 1) {
    return { error: "Célula inválida." };
  }

  const existing = await db.asset.findUnique({ where: { tag } });
  if (existing) {
    return { error: "Já existe um ativo com essa TAG." };
  }

  await db.asset.create({
    data: {
      tag,
      nome,
      tipo: tipo as AssetType,
      celula,
      fonteA: fonteA || null,
      fonteB: fonteB || null,
    },
  });

  revalidatePath("/ativos");
  revalidatePath("/kanban");
  return { success: true };
}
