import type { Level } from "@prisma/client";
import { LEVELS_ORDER } from "./roadmap";

export type GateResult = { ok: true } | { ok: false; reason: string };

// Regra de avanço de nível, reaproveitada tanto pelo botão do drawer quanto
// pelo drag-and-drop do Kanban — única fonte de verdade do gate.
//
// `openPunchTotalCount` é opcional (default 0) de propósito: só importa
// pra entrada no L5 (regra do RFO, ver SPEC-punch-list.md), então chamadas
// existentes que não passam esse argumento continuam se comportando
// exatamente como antes — extensão aditiva, não uma mudança de comportamento.
export function canAdvance(
  fromLevel: Level,
  toLevel: Level,
  validatedProgressPct: number,
  punchACount: number,
  openPunchTotalCount: number = 0
): GateResult {
  const fromIdx = LEVELS_ORDER.indexOf(fromLevel);
  const toIdx = LEVELS_ORDER.indexOf(toLevel);

  if (toIdx === fromIdx) {
    return { ok: false, reason: "O ativo já está nesse nível." };
  }

  if (toIdx < fromIdx) {
    return {
      ok: false,
      reason: "Regressão de nível não é permitida.",
    };
  }

  if (toIdx > fromIdx + 1) {
    return {
      ok: false,
      reason: `Não pula gate — a sequência é obrigatória. Conclua o ${fromLevel} antes de avançar.`,
    };
  }

  if (validatedProgressPct < 100) {
    return {
      ok: false,
      reason: `${fromLevel} está em ${validatedProgressPct}% validado. Finalize e valide todas as etapas aplicáveis antes de avançar.`,
    };
  }

  if (toLevel === "L4" && punchACount > 0) {
    return {
      ok: false,
      reason: `Entrada no L4 bloqueada: ${punchACount} punch A aberto. Encerre antes de avançar.`,
    };
  }

  if (toLevel === "L5" && openPunchTotalCount > 0) {
    return {
      ok: false,
      reason: `RFO bloqueado: ${openPunchTotalCount} pendência(s) aberta(s) (A, B ou C). Encerre todas antes do RFO.`,
    };
  }

  return { ok: true };
}
