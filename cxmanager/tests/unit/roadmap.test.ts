import { describe, expect, it } from "vitest";
import type { AssetType, Level } from "@prisma/client";
import { applicableSteps, LEVELS_ORDER, NIVEIS, ROADMAP } from "../../src/lib/roadmap";

const ALL_TYPES: AssetType[] = ["XFM", "MSB", "UPS", "ATS", "ADP", "PDU", "CRAC", "QDL"];

describe("applicableSteps", () => {
  it("L1: nenhuma etapa é N/A pra nenhum tipo", () => {
    for (const tipo of ALL_TYPES) {
      expect(applicableSteps("L1", tipo)).toHaveLength(ROADMAP.L1.length);
    }
  });

  it("L2: CRAC pula megger (meg); os demais tipos têm as 5 etapas", () => {
    const cracIds = applicableSteps("L2", "CRAC").map((s) => s.id);
    expect(cracIds).not.toContain("meg");
    expect(cracIds).toHaveLength(4);

    for (const tipo of ALL_TYPES.filter((t) => t !== "CRAC")) {
      expect(applicableSteps("L2", tipo)).toHaveLength(5);
    }
  });

  it("L3: regras de skip por tipo batem com o protótipo", () => {
    const cases: [AssetType, string[]][] = [
      ["CRAC", ["ene", "fun"]], // pula ter, prt, trf
      ["QDL", ["ene", "fun", "ter"]], // pula prt, trf
      ["PDU", ["ene", "fun", "ter", "trf"]], // pula prt
      ["XFM", ["ene", "fun", "ter", "prt"]], // pula trf
      ["MSB", ["ene", "fun", "ter", "prt", "trf"]], // nenhuma
      ["UPS", ["ene", "fun", "ter", "prt", "trf"]],
      ["ATS", ["ene", "fun", "ter", "prt", "trf"]],
      ["ADP", ["ene", "fun", "ter", "prt", "trf"]],
    ];
    for (const [tipo, expectedIds] of cases) {
      expect(applicableSteps("L3", tipo).map((s) => s.id)).toEqual(expectedIds);
    }
  });

  it("L4 e L5: nenhuma etapa é N/A pra nenhum tipo", () => {
    for (const level of ["L4", "L5"] as Level[]) {
      for (const tipo of ALL_TYPES) {
        expect(applicableSteps(level, tipo)).toHaveLength(ROADMAP[level].length);
      }
    }
  });

  it("etapa skipFor nunca aparece como aplicável pro tipo listado (invariante geral)", () => {
    for (const level of LEVELS_ORDER) {
      for (const step of ROADMAP[level]) {
        for (const tipo of step.skipFor ?? []) {
          const ids = applicableSteps(level, tipo).map((s) => s.id);
          expect(ids).not.toContain(step.id);
        }
      }
    }
  });
});

describe("NIVEIS", () => {
  it("tem nome e descrição para os 5 níveis", () => {
    for (const level of LEVELS_ORDER) {
      expect(NIVEIS[level].nome).toBeTruthy();
      expect(NIVEIS[level].desc).toBeTruthy();
    }
  });
});
