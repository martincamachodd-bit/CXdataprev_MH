import { describe, expect, it } from "vitest";
import {
  getStepsToday,
  getStalledReadyAssets,
  getCriticalPunches,
  getPendingEnergizations,
  getMissingDocuments,
  getSystemWarnings,
} from "../../src/lib/dailyReport";

const HOJE = new Date("2026-08-30T12:00:00Z");
const ONTEM = new Date("2026-08-29T12:00:00Z");

describe("getStepsToday", () => {
  it("evento de ontem não aparece", () => {
    const events = getStepsToday(
      [
        {
          assetTag: "XFM-01",
          stepLabel: "FAT aprovado",
          executedAt: ONTEM,
          executedByName: "Mário R.",
          validatedAt: null,
          validatedByName: null,
        },
      ],
      HOJE
    );
    expect(events).toHaveLength(0);
  });

  it("evento de hoje aparece", () => {
    const events = getStepsToday(
      [
        {
          assetTag: "XFM-01",
          stepLabel: "FAT aprovado",
          executedAt: new Date("2026-08-30T08:00:00Z"),
          executedByName: "Mário R.",
          validatedAt: null,
          validatedByName: null,
        },
      ],
      HOJE
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ assetTag: "XFM-01", action: "executado" });
  });

  it("executado e validado no mesmo dia geram duas entradas", () => {
    const events = getStepsToday(
      [
        {
          assetTag: "MSB-1A",
          stepLabel: "Torque de conexões",
          executedAt: new Date("2026-08-30T08:00:00Z"),
          executedByName: "Campo",
          validatedAt: new Date("2026-08-30T15:00:00Z"),
          validatedByName: "Qualidade",
        },
      ],
      HOJE
    );
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.action).sort()).toEqual(["executado", "validado"]);
  });
});

describe("getStalledReadyAssets", () => {
  it("100% + 23h não aparece", () => {
    const assets = getStalledReadyAssets(
      [
        {
          tag: "UPS-2.1",
          nome: "UPS Célula 2",
          nivelAtual: "L4",
          progressPct: 100,
          lastValidatedAt: new Date(HOJE.getTime() - 23 * 3_600_000),
        },
      ],
      HOJE
    );
    expect(assets).toHaveLength(0);
  });

  it("100% + 25h aparece", () => {
    const assets = getStalledReadyAssets(
      [
        {
          tag: "UPS-2.1",
          nome: "UPS Célula 2",
          nivelAtual: "L4",
          progressPct: 100,
          lastValidatedAt: new Date(HOJE.getTime() - 25 * 3_600_000),
        },
      ],
      HOJE
    );
    expect(assets).toHaveLength(1);
    expect(assets[0].tag).toBe("UPS-2.1");
  });

  it("<100% não aparece mesmo há dias parado", () => {
    const assets = getStalledReadyAssets(
      [
        {
          tag: "CRAC-01",
          nome: "CRAC Sala Segura",
          nivelAtual: "L3",
          progressPct: 80,
          lastValidatedAt: new Date(HOJE.getTime() - 10 * 86_400_000),
        },
      ],
      HOJE
    );
    expect(assets).toHaveLength(0);
  });

  it("L5 nunca aparece (nada a avançar)", () => {
    const assets = getStalledReadyAssets(
      [
        {
          tag: "ATS-01",
          nome: "ATS Célula 1",
          nivelAtual: "L5",
          progressPct: 100,
          lastValidatedAt: new Date(HOJE.getTime() - 10 * 86_400_000),
        },
      ],
      HOJE
    );
    expect(assets).toHaveLength(0);
  });

  it("sem lastValidatedAt (nenhuma etapa aplicável) não aparece — não dá pra saber desde quando", () => {
    const assets = getStalledReadyAssets(
      [
        {
          tag: "XFM-01",
          nome: "Transformador",
          nivelAtual: "L2",
          progressPct: 100,
          lastValidatedAt: null,
        },
      ],
      HOJE
    );
    expect(assets).toHaveLength(0);
  });
});

describe("getCriticalPunches", () => {
  it("sem prazo não aparece", () => {
    const punches = getCriticalPunches(
      [
        {
          assetTag: "MSB-2A",
          categoria: "B",
          titulo: "Observação sem prazo",
          prazo: null,
          status: "aberto",
        },
      ],
      HOJE
    );
    expect(punches).toHaveLength(0);
  });

  it("prazo futuro aparece não-vencido", () => {
    const punches = getCriticalPunches(
      [
        {
          assetTag: "MSB-2A",
          categoria: "A",
          titulo: "Intertravamento",
          prazo: new Date(HOJE.getTime() + 5 * 86_400_000),
          status: "aberto",
        },
      ],
      HOJE
    );
    expect(punches).toHaveLength(1);
    expect(punches[0].overdue).toBe(false);
  });

  it("prazo passado aparece vencido", () => {
    const punches = getCriticalPunches(
      [
        {
          assetTag: "ADP-1A",
          categoria: "A",
          titulo: "Seletividade",
          prazo: new Date(HOJE.getTime() - 2 * 86_400_000),
          status: "aberto",
        },
      ],
      HOJE
    );
    expect(punches).toHaveLength(1);
    expect(punches[0].overdue).toBe(true);
  });

  it("punch fechado não aparece mesmo com prazo", () => {
    const punches = getCriticalPunches(
      [
        {
          assetTag: "ADP-1A",
          categoria: "A",
          titulo: "Já resolvido",
          prazo: new Date(HOJE.getTime() - 2 * 86_400_000),
          status: "fechado",
        },
      ],
      HOJE
    );
    expect(punches).toHaveLength(0);
  });

  it("ordena por prazo crescente", () => {
    const punches = getCriticalPunches(
      [
        {
          assetTag: "C",
          categoria: "B",
          titulo: "Mais distante",
          prazo: new Date(HOJE.getTime() + 10 * 86_400_000),
          status: "aberto",
        },
        {
          assetTag: "A",
          categoria: "A",
          titulo: "Mais urgente",
          prazo: new Date(HOJE.getTime() - 1 * 86_400_000),
          status: "aberto",
        },
        {
          assetTag: "B",
          categoria: "B",
          titulo: "No meio",
          prazo: new Date(HOJE.getTime() + 2 * 86_400_000),
          status: "aberto",
        },
      ],
      HOJE
    );
    expect(punches.map((p) => p.assetTag)).toEqual(["A", "B", "C"]);
  });
});

describe("getPendingEnergizations", () => {
  it("'en' é filtrado fora", () => {
    const items = getPendingEnergizations([
      { tag: "XFM-01", nome: "Transformador", status: "en" },
    ]);
    expect(items).toHaveLength(0);
  });

  it("'lb'/'ag'/'bl' aparecem", () => {
    const items = getPendingEnergizations([
      { tag: "MSB-1A", nome: "Painel A", status: "lb" },
      { tag: "CRAC-01", nome: "CRAC", status: "ag" },
      { tag: "UPS-1.1", nome: "UPS", status: "bl" },
    ]);
    expect(items.map((i) => i.status).sort()).toEqual(["ag", "bl", "lb"]);
  });
});

describe("getMissingDocuments", () => {
  it("etapa sem docPattern nunca aparece", () => {
    // (docPattern é obrigatório no tipo — página já filtra antes de chamar;
    // aqui testamos que uma etapa não-executada com doc pattern não aparece)
    const missing = getMissingDocuments([
      {
        assetTag: "PDU-2.1",
        stepLabel: "Posicionamento",
        docPattern: "POS-{tag}.pdf",
        executedAt: null,
        documentCount: 0,
      },
    ]);
    expect(missing).toHaveLength(0);
  });

  it("executada sem doc aparece, com o nome do documento resolvido", () => {
    const missing = getMissingDocuments([
      {
        assetTag: "PDU-2.1",
        stepLabel: "Torque de conexões",
        docPattern: "TRQ-{tag}.pdf",
        executedAt: new Date("2026-07-24T10:00:00Z"),
        documentCount: 0,
      },
    ]);
    expect(missing).toHaveLength(1);
    expect(missing[0].docName).toBe("TRQ-PDU-2.1.pdf");
  });

  it("executada com doc não aparece", () => {
    const missing = getMissingDocuments([
      {
        assetTag: "PDU-2.1",
        stepLabel: "Torque de conexões",
        docPattern: "TRQ-{tag}.pdf",
        executedAt: new Date("2026-07-24T10:00:00Z"),
        documentCount: 1,
      },
    ]);
    expect(missing).toHaveLength(0);
  });

  it("não-executada não aparece mesmo sem doc", () => {
    const missing = getMissingDocuments([
      {
        assetTag: "PDU-2.1",
        stepLabel: "Torque de conexões",
        docPattern: "TRQ-{tag}.pdf",
        executedAt: null,
        documentCount: 0,
      },
    ]);
    expect(missing).toHaveLength(0);
  });
});

describe("getSystemWarnings", () => {
  it("'ok' é filtrado fora", () => {
    const warnings = getSystemWarnings([
      { instrumento: "Megôhmetro MI-3201", status: "ok", diasRestantes: 200 },
    ]);
    expect(warnings).toHaveLength(0);
  });

  it("'warn'/'exp' aparecem", () => {
    const warnings = getSystemWarnings([
      { instrumento: "Megôhmetro MI-3201", status: "warn", diasRestantes: 12 },
      { instrumento: "Terrômetro MTD-20KWe", status: "exp", diasRestantes: -5 },
    ]);
    expect(warnings.map((w) => w.status).sort()).toEqual(["exp", "warn"]);
  });
});
