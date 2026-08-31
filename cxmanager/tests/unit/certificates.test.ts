import { describe, expect, it } from "vitest";
import { certificateStatus } from "../../src/lib/certificates";

const HOJE = new Date("2026-08-30T00:00:00.000Z");

function daysFromToday(days: number): Date {
  return new Date(HOJE.getTime() + days * 86_400_000);
}

describe("certificateStatus", () => {
  it("validade no passado (1 dia vencido) → exp", () => {
    const result = certificateStatus(daysFromToday(-1), HOJE);
    expect(result.status).toBe("exp");
    expect(result.diasRestantes).toBe(-1);
  });

  it("validade bem no passado → exp", () => {
    expect(certificateStatus(daysFromToday(-365), HOJE).status).toBe("exp");
  });

  it("validade é hoje (0 dias restantes) → warn", () => {
    const result = certificateStatus(daysFromToday(0), HOJE);
    expect(result.status).toBe("warn");
    expect(result.diasRestantes).toBe(0);
  });

  it("29 dias restantes → warn", () => {
    expect(certificateStatus(daysFromToday(29), HOJE).status).toBe("warn");
  });

  it("exatamente 30 dias restantes (limite superior de warn) → warn", () => {
    const result = certificateStatus(daysFromToday(30), HOJE);
    expect(result.status).toBe("warn");
    expect(result.diasRestantes).toBe(30);
  });

  it("exatamente 31 dias restantes (primeiro dia de ok) → ok", () => {
    const result = certificateStatus(daysFromToday(31), HOJE);
    expect(result.status).toBe("ok");
    expect(result.diasRestantes).toBe(31);
  });

  it("validade bem no futuro → ok", () => {
    expect(certificateStatus(daysFromToday(365), HOJE).status).toBe("ok");
  });

  it("usa a data atual como padrão quando `hoje` não é informado", () => {
    const farFuture = new Date(Date.now() + 365 * 86_400_000);
    expect(certificateStatus(farFuture).status).toBe("ok");
  });
});
