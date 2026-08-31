import { describe, expect, it } from "vitest";
import { canAdvance } from "../../src/lib/gate";

describe("canAdvance", () => {
  it("avanço sequencial válido (L1→L2) com 100% é permitido", () => {
    expect(canAdvance("L1", "L2", 100, 0)).toEqual({ ok: true });
  });

  it("pular nível (L1→L3) é sempre bloqueado, mesmo com 100%", () => {
    expect(canAdvance("L1", "L3", 100, 0).ok).toBe(false);
  });

  it("regressão (L3→L2) é sempre bloqueada", () => {
    expect(canAdvance("L3", "L2", 100, 0).ok).toBe(false);
  });

  it("mesmo nível (L2→L2) é bloqueado", () => {
    expect(canAdvance("L2", "L2", 100, 0).ok).toBe(false);
  });

  it("progresso validado < 100% no nível atual bloqueia o avanço", () => {
    expect(canAdvance("L2", "L3", 99, 0).ok).toBe(false);
  });

  it("L3→L4 com punchACount > 0 é bloqueado mesmo com 100%", () => {
    expect(canAdvance("L3", "L4", 100, 1).ok).toBe(false);
  });

  it("L3→L4 com punchACount = 0 e 100% é permitido", () => {
    expect(canAdvance("L3", "L4", 100, 0)).toEqual({ ok: true });
  });

  it("punchACount > 0 não bloqueia avanços que não sejam para o L4", () => {
    expect(canAdvance("L1", "L2", 100, 5)).toEqual({ ok: true });
    expect(canAdvance("L4", "L5", 100, 5)).toEqual({ ok: true });
  });

  it("todo bloqueio vem com uma razão explicando o motivo", () => {
    const blocked = [
      canAdvance("L1", "L3", 100, 0),
      canAdvance("L3", "L2", 100, 0),
      canAdvance("L2", "L2", 100, 0),
      canAdvance("L2", "L3", 50, 0),
      canAdvance("L3", "L4", 100, 2),
    ];
    for (const result of blocked) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason.length).toBeGreaterThan(0);
      }
    }
  });

  it("L4→L5 com pendências abertas (openPunchTotalCount > 0) é bloqueado mesmo com 100%", () => {
    const result = canAdvance("L4", "L5", 100, 0, 3);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it("L4→L5 com zero pendências abertas e 100% é permitido", () => {
    expect(canAdvance("L4", "L5", 100, 0, 0)).toEqual({ ok: true });
  });

  it("openPunchTotalCount omitido (default 0) não bloqueia o L5 — retrocompatível com chamadas antigas", () => {
    expect(canAdvance("L4", "L5", 100, 0)).toEqual({ ok: true });
  });

  it("openPunchTotalCount só é considerado na entrada do L5, não em outros níveis", () => {
    expect(canAdvance("L1", "L2", 100, 0, 5)).toEqual({ ok: true });
    expect(canAdvance("L3", "L4", 100, 0, 5)).toEqual({ ok: true });
  });
});
