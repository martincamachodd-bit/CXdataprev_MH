export type CertificateStatus = "ok" | "warn" | "exp";

// Status nunca armazenado — sempre calculado a partir da validade em toda
// leitura, pra nunca ficar desatualizado (mesmo raciocínio de progressPct/
// punchACount em lib/assets.ts). Diferente do protótipo (que estima "vida
// restante" como dias/365 fixo), quem chama essa função usa o intervalo
// real de cada instrumento (validade - dataCalibracao) pra isso, já que
// instrumentos diferentes podem ter periodicidades de calibração diferentes.
export function certificateStatus(
  validade: Date,
  hoje: Date = new Date()
): { status: CertificateStatus; diasRestantes: number } {
  const diasRestantes = Math.round(
    (validade.getTime() - hoje.getTime()) / 86_400_000
  );

  if (diasRestantes < 0) return { status: "exp", diasRestantes };
  if (diasRestantes <= 30) return { status: "warn", diasRestantes };
  return { status: "ok", diasRestantes };
}
