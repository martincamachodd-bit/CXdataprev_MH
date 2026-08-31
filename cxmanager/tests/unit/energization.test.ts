import { describe, expect, it } from "vitest";
import {
  computeEnergizationStatuses,
  computeSourceDepth,
  type AssetEnergizationInput,
} from "../../src/lib/energization";

function asset(
  overrides: Partial<AssetEnergizationInput> & { id: string; tag: string }
): AssetEnergizationInput {
  return {
    fonteA: null,
    openPunchACount: 0,
    eneValidated: false,
    ...overrides,
  };
}

describe("computeEnergizationStatuses", () => {
  it("sem fonteA e sem 'ene' validada → liberado (nada bloqueando o início)", () => {
    const statuses = computeEnergizationStatuses([
      asset({ id: "1", tag: "XFM-01" }),
    ]);
    expect(statuses.get("XFM-01")).toBe("lb");
  });

  it("fonteA que não bate com nenhuma TAG cadastrada (fonte externa) → liberado", () => {
    const statuses = computeEnergizationStatuses([
      asset({ id: "1", tag: "XFM-01", fonteA: "Concessionária" }),
    ]);
    expect(statuses.get("XFM-01")).toBe("lb");
  });

  it("fonte interna já energizada ('ene' validada), ativo sem punch A → liberado", () => {
    const statuses = computeEnergizationStatuses([
      asset({ id: "1", tag: "XFM-01", eneValidated: true }),
      asset({ id: "2", tag: "MSB-1A", fonteA: "XFM-01" }),
    ]);
    expect(statuses.get("XFM-01")).toBe("en");
    expect(statuses.get("MSB-1A")).toBe("lb");
  });

  it("fonte interna ainda não energizada (nem validada, nem bloqueada) → aguardando fonte", () => {
    // XFM-01 sem fonteA própria e sem 'ene' validada resolve "lb" (nada o
    // impede de começar) — mas isso não é "en", então quem depende dele
    // ainda não pode ser "liberado": fica "aguardando fonte".
    const statuses = computeEnergizationStatuses([
      asset({ id: "1", tag: "XFM-01" }),
      asset({ id: "2", tag: "MSB-1A", fonteA: "XFM-01" }),
    ]);
    expect(statuses.get("XFM-01")).toBe("lb");
    expect(statuses.get("MSB-1A")).toBe("ag");
  });

  it("fonte com punch A aberto bloqueia quem depende dela também para aguardando", () => {
    const statuses = computeEnergizationStatuses([
      asset({ id: "1", tag: "XFM-01", openPunchACount: 1 }),
      asset({ id: "2", tag: "MSB-1A", fonteA: "XFM-01" }),
    ]);
    expect(statuses.get("XFM-01")).toBe("bl");
    expect(statuses.get("MSB-1A")).toBe("ag");
  });

  it("'ene' validada → energizado", () => {
    const statuses = computeEnergizationStatuses([
      asset({ id: "1", tag: "XFM-01", eneValidated: true }),
    ]);
    expect(statuses.get("XFM-01")).toBe("en");
  });

  it("'ene' validada e punch A aberto → bloqueado (punch A sempre prevalece)", () => {
    const statuses = computeEnergizationStatuses([
      asset({
        id: "1",
        tag: "XFM-01",
        eneValidated: true,
        openPunchACount: 2,
      }),
    ]);
    expect(statuses.get("XFM-01")).toBe("bl");
  });

  it("cadeia de 3 níveis propaga o status corretamente", () => {
    const statuses = computeEnergizationStatuses([
      asset({ id: "1", tag: "XFM-01", eneValidated: true }),
      asset({ id: "2", tag: "MSB-1A", fonteA: "XFM-01", eneValidated: true }),
      asset({ id: "3", tag: "UPS-1.1", fonteA: "MSB-1A" }),
    ]);
    expect(statuses.get("XFM-01")).toBe("en");
    expect(statuses.get("MSB-1A")).toBe("en");
    expect(statuses.get("UPS-1.1")).toBe("lb");
  });

  it("ciclo de fontes (A depende de B, B depende de A) não trava — cai em 'ag' pros dois", () => {
    const statuses = computeEnergizationStatuses([
      asset({ id: "1", tag: "A", fonteA: "B" }),
      asset({ id: "2", tag: "B", fonteA: "A" }),
    ]);
    expect(statuses.get("A")).toBe("ag");
    expect(statuses.get("B")).toBe("ag");
  });
});

describe("computeSourceDepth", () => {
  it("sem fonteA (ou fonte externa não cadastrada) → profundidade 0", () => {
    const depths = computeSourceDepth([
      { tag: "XFM-01", fonteA: null },
      { tag: "GER-01", fonteA: "Concessionária" },
    ]);
    expect(depths.get("XFM-01")).toBe(0);
    expect(depths.get("GER-01")).toBe(0);
  });

  it("cadeia de 3 níveis tem profundidades 0, 1, 2", () => {
    const depths = computeSourceDepth([
      { tag: "XFM-01", fonteA: null },
      { tag: "MSB-1A", fonteA: "XFM-01" },
      { tag: "UPS-1.1", fonteA: "MSB-1A" },
    ]);
    expect(depths.get("XFM-01")).toBe(0);
    expect(depths.get("MSB-1A")).toBe(1);
    expect(depths.get("UPS-1.1")).toBe(2);
  });

  it("ciclo de fontes não trava e retorna profundidades finitas e limitadas", () => {
    // Dado de ciclo é sempre inválido (não deveria existir num cadastro
    // real); a única garantia que importa aqui é que o cálculo termina e
    // não produz um valor absurdo — a indentação é só cosmética, quem
    // realmente trava o gate é o status calculado em computeEnergizationStatuses.
    const depths = computeSourceDepth([
      { tag: "A", fonteA: "B" },
      { tag: "B", fonteA: "A" },
    ]);
    expect(depths.get("A")).toBeGreaterThanOrEqual(0);
    expect(depths.get("B")).toBeGreaterThanOrEqual(0);
    expect(depths.get("A")).toBeLessThanOrEqual(2);
    expect(depths.get("B")).toBeLessThanOrEqual(2);
  });
});
