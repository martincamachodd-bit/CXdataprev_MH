import { describe, expect, it } from "vitest";
import {
  matchIntent,
  formatAssetStatusReply,
  formatDocumentsReply,
  formatReadyL4Reply,
  formatCertificatesExpiringReply,
  formatUnknownReply,
} from "../../src/lib/assistant";

const KNOWN_TAGS = ["UPS-2.1", "MSB-1A", "XFM-01"];

describe("matchIntent", () => {
  it("TAG conhecida + palavra de documento → documents (prioridade sobre asset_status)", () => {
    expect(matchIntent("documentos do MSB-1A", KNOWN_TAGS)).toEqual({
      kind: "documents",
      tag: "MSB-1A",
    });
    expect(matchIntent("cadê o relatório da UPS-2.1?", KNOWN_TAGS)).toEqual({
      kind: "documents",
      tag: "UPS-2.1",
    });
  });

  it("só TAG conhecida → asset_status", () => {
    expect(matchIntent("status da UPS-2.1?", KNOWN_TAGS)).toEqual({
      kind: "asset_status",
      tag: "UPS-2.1",
    });
  });

  it("'certificados vencendo'/'calibração' → certificates_expiring", () => {
    expect(matchIntent("certificados vencendo esse mês", KNOWN_TAGS)).toEqual({
      kind: "certificates_expiring",
    });
    expect(matchIntent("algo sobre calibração pendente", KNOWN_TAGS)).toEqual({
      kind: "certificates_expiring",
    });
  });

  it("'prontos pro L4' → ready_l4", () => {
    expect(matchIntent("quais ativos estão prontos pro L4?", KNOWN_TAGS)).toEqual({
      kind: "ready_l4",
    });
  });

  it("nada casa → unknown", () => {
    expect(matchIntent("qual a previsão do tempo amanhã?", KNOWN_TAGS)).toEqual({
      kind: "unknown",
    });
  });
});

describe("formatAssetStatusReply", () => {
  it("ativo real formatado corretamente", () => {
    const reply = formatAssetStatusReply({
      tag: "UPS-2.1",
      nome: "UPS Célula 2",
      nivelAtual: "L3",
      progressPct: 80,
      punchACount: 0,
      energizationStatus: "lb",
    });
    expect(reply.text).toContain("UPS-2.1");
    expect(reply.text).toContain("L3");
    expect(reply.text).toContain("80%");
    expect(reply.text).toContain("liberado p/ energizar");
  });

  it("TAG inexistente (null) retorna mensagem clara de não encontrado", () => {
    const reply = formatAssetStatusReply(null);
    expect(reply.text).toMatch(/não encontrei/i);
  });
});

describe("formatDocumentsReply", () => {
  it("lista vazia retorna 'nenhum documento'", () => {
    const reply = formatDocumentsReply("MSB-1A", []);
    expect(reply.text).toMatch(/não encontrei nenhum documento/i);
  });

  it("lista com itens formata cada um", () => {
    const reply = formatDocumentsReply("MSB-1A", [
      { filename: "MEG-MSB-1A.pdf", stepLabel: "Megger", uploadedByName: "Carla F." },
      { filename: "TRQ-MSB-1A.pdf", stepLabel: "Torque", uploadedByName: null },
    ]);
    expect(reply.text).toContain("MEG-MSB-1A.pdf");
    expect(reply.text).toContain("enviado por Carla F.");
    expect(reply.text).toContain("TRQ-MSB-1A.pdf");
  });
});

describe("formatReadyL4Reply", () => {
  it("lista vazia retorna 'nenhum ativo pronto'", () => {
    const reply = formatReadyL4Reply([]);
    expect(reply.text).toMatch(/nenhum ativo está pronto/i);
  });

  it("lista com itens formata a contagem certa", () => {
    const reply = formatReadyL4Reply([
      { tag: "UPS-2.1", nome: "UPS Célula 2" },
      { tag: "ATS-01", nome: "ATS Célula 1" },
    ]);
    expect(reply.text).toContain("2 ativo(s)");
    expect(reply.text).toContain("UPS-2.1");
    expect(reply.text).toContain("ATS-01");
  });
});

describe("formatCertificatesExpiringReply", () => {
  it("lista vazia retorna 'nenhum certificado vencendo'", () => {
    const reply = formatCertificatesExpiringReply([]);
    expect(reply.text).toMatch(/nenhum certificado vencendo/i);
  });

  it("warn e exp formatados diferente", () => {
    const reply = formatCertificatesExpiringReply([
      { instrumento: "Megôhmetro MI-3201", status: "warn", diasRestantes: 12 },
      { instrumento: "Terrômetro MTD-20KWe", status: "exp", diasRestantes: -5 },
    ]);
    expect(reply.text).toContain("📄 Megôhmetro MI-3201 — vence em 12 dia(s)");
    expect(reply.text).toContain("⛔ Terrômetro MTD-20KWe — vencido há 5 dia(s)");
  });
});

describe("formatUnknownReply", () => {
  it("sempre menciona que é um mock e lista os 4 exemplos", () => {
    const reply = formatUnknownReply();
    expect(reply.text).toMatch(/mock/i);
    expect(reply.text).toMatch(/status/i);
    expect(reply.text).toMatch(/l4/i);
    expect(reply.text).toMatch(/documentos/i);
    expect(reply.text).toMatch(/certificados/i);
  });
});
