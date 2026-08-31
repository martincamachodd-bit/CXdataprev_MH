"use server";

import { db } from "@/lib/db";
import { getAssetSummaries } from "@/lib/assets";
import {
  computeEnergizationStatuses,
  type AssetEnergizationInput,
} from "@/lib/energization";
import { certificateStatus } from "@/lib/certificates";
import { getSystemWarnings } from "@/lib/dailyReport";
import { ROADMAP } from "@/lib/roadmap";
import {
  matchIntent,
  formatAssetStatusReply,
  formatDocumentsReply,
  formatReadyL4Reply,
  formatCertificatesExpiringReply,
  formatUnknownReply,
  type AssistantReply,
} from "@/lib/assistant";

// Mockado — sem chamada de IA real (ver SPEC-ai-assistant.md). Busca só o
// mínimo que cada intent precisa; nada é persistido (nenhuma tabela de
// histórico de conversa).
export async function askAssistant(query: string): Promise<AssistantReply> {
  const items = await getAssetSummaries();
  const intent = matchIntent(
    query,
    items.map((a) => a.tag)
  );

  switch (intent.kind) {
    case "asset_status": {
      const asset = items.find((a) => a.tag === intent.tag);
      if (!asset) return formatAssetStatusReply(null);

      const eneCompletions = await db.assetStepCompletion.findMany({
        where: { level: "L3", stepId: "ene", validatedAt: { not: null } },
        select: { assetId: true },
      });
      const eneValidatedIds = new Set(eneCompletions.map((c) => c.assetId));
      const inputs: AssetEnergizationInput[] = items.map((a) => ({
        id: a.id,
        tag: a.tag,
        fonteA: a.fonteA,
        openPunchACount: a.punchACount,
        eneValidated: eneValidatedIds.has(a.id),
      }));
      const statuses = computeEnergizationStatuses(inputs);

      return formatAssetStatusReply({
        tag: asset.tag,
        nome: asset.nome,
        nivelAtual: asset.nivelAtual,
        progressPct: asset.progressPct,
        punchACount: asset.punchACount,
        energizationStatus: statuses.get(asset.tag) ?? "ag",
      });
    }

    case "documents": {
      const asset = items.find((a) => a.tag === intent.tag);
      if (!asset) return formatDocumentsReply(intent.tag, []);

      const docs = await db.assetDocument.findMany({
        where: { assetId: asset.id },
        include: { uploadedBy: { select: { nome: true } } },
        orderBy: { uploadedAt: "desc" },
      });

      return formatDocumentsReply(
        asset.tag,
        docs.map((d) => ({
          filename: d.filename,
          stepLabel: ROADMAP[d.level].find((s) => s.id === d.stepId)?.label ?? d.stepId,
          uploadedByName: d.uploadedBy.nome,
        }))
      );
    }

    case "ready_l4": {
      const ready = items.filter(
        (a) => a.nivelAtual === "L3" && a.progressPct === 100 && a.punchACount === 0
      );
      return formatReadyL4Reply(ready.map((a) => ({ tag: a.tag, nome: a.nome })));
    }

    case "certificates_expiring": {
      const certificates = await db.certificate.findMany();
      const statuses = certificates.map((c) => {
        const { status, diasRestantes } = certificateStatus(c.validade);
        return { instrumento: c.instrumento, status, diasRestantes };
      });
      return formatCertificatesExpiringReply(getSystemWarnings(statuses));
    }

    default:
      return formatUnknownReply();
  }
}
