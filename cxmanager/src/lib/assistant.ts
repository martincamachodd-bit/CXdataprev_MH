// Assistente mockado — sem chamada de IA real neste MVP (ver
// SPEC-ai-assistant.md). Casamento de intent por palavra-chave, igual ao
// protótipo, mas cada resposta é montada na hora a partir do banco real —
// nunca reproduz o texto fictício fixo do protótipo.

export type Intent =
  | { kind: "asset_status"; tag: string }
  | { kind: "documents"; tag: string }
  | { kind: "ready_l4" }
  | { kind: "certificates_expiring" }
  | { kind: "unknown" };

const DOC_WORDS = /document|relat[oó]rio|anexo|upload/;
const CERT_WORDS = /certificado|vencendo|calibra/;
const READY_WORDS = /pronto|l4/;

// Mesmo truque do protótipo pra evitar acentuação: casa por radicais sem
// acento ("calibra" cobre calibração/calibrar/recalibração). Ordem importa —
// "documentos de X" tem prioridade sobre "status de X" quando os dois casam.
export function matchIntent(query: string, knownTags: string[]): Intent {
  const q = query.toLowerCase();
  const tag = knownTags.find((t) => q.includes(t.toLowerCase()));

  if (tag && DOC_WORDS.test(q)) {
    return { kind: "documents", tag };
  }
  if (CERT_WORDS.test(q)) {
    return { kind: "certificates_expiring" };
  }
  if (READY_WORDS.test(q)) {
    return { kind: "ready_l4" };
  }
  if (tag) {
    return { kind: "asset_status", tag };
  }
  return { kind: "unknown" };
}

export type AssistantReply = { text: string; source: string };

const ENERGIZATION_LABEL: Record<"en" | "lb" | "ag" | "bl", string> = {
  en: "energizado",
  lb: "liberado p/ energizar",
  ag: "aguardando fonte",
  bl: "bloqueado (punch A)",
};

export function formatAssetStatusReply(
  asset: {
    tag: string;
    nome: string;
    nivelAtual: string;
    progressPct: number;
    punchACount: number;
    energizationStatus: "en" | "lb" | "ag" | "bl";
  } | null
): AssistantReply {
  if (!asset) {
    return {
      text: "Não encontrei nenhum ativo com essa TAG no cadastro. Confira a lista em /ativos.",
      source: "Base de ativos",
    };
  }

  return {
    text:
      `${asset.tag} — ${asset.nome}\n\n` +
      `Nível atual: ${asset.nivelAtual} (${asset.progressPct}% validado)\n` +
      `Punch A aberto: ${asset.punchACount}\n` +
      `Energização: ${ENERGIZATION_LABEL[asset.energizationStatus]}`,
    source: "Base de ativos · roadmap · energização",
  };
}

export function formatDocumentsReply(
  tag: string,
  documents: { filename: string; stepLabel: string; uploadedByName: string | null }[]
): AssistantReply {
  if (documents.length === 0) {
    return {
      text: `Não encontrei nenhum documento anexado ao ativo ${tag}.`,
      source: "Documentos do ativo",
    };
  }

  const lines = documents.map(
    (d) =>
      `📎 ${d.filename} (${d.stepLabel})` +
      (d.uploadedByName ? ` · enviado por ${d.uploadedByName}` : "")
  );

  return {
    text: `Documentos do ativo ${tag}:\n\n${lines.join("\n")}`,
    source: "Documentos do ativo",
  };
}

export function formatReadyL4Reply(
  assets: { tag: string; nome: string }[]
): AssistantReply {
  if (assets.length === 0) {
    return {
      text: "Nenhum ativo está pronto para o L4 agora.",
      source: "Base de ativos · gate L3→L4",
    };
  }

  const lines = assets.map((a) => `${a.tag} — ${a.nome}`);

  return {
    text: `${assets.length} ativo(s) pronto(s) para o L4:\n\n${lines.join("\n")}`,
    source: "Base de ativos · gate L3→L4",
  };
}

export function formatCertificatesExpiringReply(
  warnings: { instrumento: string; status: "warn" | "exp"; diasRestantes: number }[]
): AssistantReply {
  if (warnings.length === 0) {
    return {
      text: "Nenhum certificado vencendo ou vencido no momento.",
      source: "Certificados",
    };
  }

  const lines = warnings.map((w) =>
    w.status === "exp"
      ? `⛔ ${w.instrumento} — vencido há ${Math.abs(w.diasRestantes)} dia(s)`
      : `📄 ${w.instrumento} — vence em ${w.diasRestantes} dia(s)`
  );

  return {
    text: `Certificados que precisam de atenção:\n\n${lines.join("\n")}`,
    source: "Certificados",
  };
}

export function formatUnknownReply(): AssistantReply {
  return {
    text:
      "Boa pergunta — nesta versão eu só respondo alguns tipos de consulta " +
      "sobre dado real do sistema (é um mock, sem IA de verdade). Tenta:\n\n" +
      "• Status de um ativo (ex.: \"status da UPS-2.1?\")\n" +
      "• Quais ativos estão prontos pro L4\n" +
      "• Documentos de um ativo (ex.: \"documentos do MSB-1A\")\n" +
      "• Certificados vencendo",
    source: "Assistente mockado — sem IA real neste MVP",
  };
}
