import type { CertificateStatus } from "@/lib/certificates";

export type CertificateListItem = {
  id: string;
  instrumento: string;
  numeroSerie: string;
  numeroCertificado: string;
  laboratorio: string;
  dataCalibracao: string;
  validade: string;
  uso: string;
  status: CertificateStatus;
  diasRestantes: number;
  vidaRestantePct: number;
};

const STATUS_BADGE: Record<CertificateStatus, string> = {
  ok: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-700",
  exp: "bg-red-50 text-red-700",
};

const STATUS_BAR: Record<CertificateStatus, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  exp: "bg-red-500",
};

const KPI_ACCENT: Record<CertificateStatus, string> = {
  ok: "border-l-emerald-500",
  warn: "border-l-amber-500",
  exp: "border-l-red-500",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function statusLine(status: CertificateStatus, diasRestantes: number): string {
  if (status === "exp") return `Vencido há ${Math.abs(diasRestantes)} d`;
  if (status === "warn") return `Vence em ${diasRestantes} d`;
  return "Válido";
}

export function CertificateTable({ items }: { items: CertificateListItem[] }) {
  // KPIs contados a partir da mesma lista renderizada abaixo — nunca uma
  // query separada, pra nunca divergir do que está na tabela.
  const ok = items.filter((i) => i.status === "ok").length;
  const warn = items.filter((i) => i.status === "warn").length;
  const exp = items.filter((i) => i.status === "exp").length;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          className={`rounded-lg border border-zinc-200 border-l-4 bg-white p-4 ${KPI_ACCENT.ok}`}
        >
          <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-400">
            Válidos
          </div>
          <div className="text-2xl font-bold text-zinc-900" data-testid="kpi-ok">
            {ok}
          </div>
          <div className="text-xs text-zinc-500">liberados para uso em campo</div>
        </div>
        <div
          className={`rounded-lg border border-zinc-200 border-l-4 bg-white p-4 ${KPI_ACCENT.warn}`}
        >
          <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-400">
            Vencendo em 30 dias
          </div>
          <div className="text-2xl font-bold text-zinc-900" data-testid="kpi-warn">
            {warn}
          </div>
          <div className="text-xs text-zinc-500">fiquem de olho pra recalibrar</div>
        </div>
        <div
          className={`rounded-lg border border-zinc-200 border-l-4 bg-white p-4 ${KPI_ACCENT.exp}`}
        >
          <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-400">
            Vencidos
          </div>
          <div className="text-2xl font-bold text-zinc-900" data-testid="kpi-exp">
            {exp}
          </div>
          <div className="text-xs text-zinc-500">uso não recomendado</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="px-4 py-2 font-medium">Instrumento</th>
              <th className="px-4 py-2 font-medium">Nº série</th>
              <th className="px-4 py-2 font-medium">Certificado</th>
              <th className="px-4 py-2 font-medium">Calibração</th>
              <th className="px-4 py-2 font-medium">Validade</th>
              <th className="px-4 py-2 font-medium">Vida restante</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr
                key={c.id}
                data-certificate-id={c.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-4 py-2">
                  <div className="font-semibold text-zinc-900">{c.instrumento}</div>
                  <div className="text-xs text-zinc-500">{c.uso}</div>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-zinc-600">
                  {c.numeroSerie}
                </td>
                <td className="px-4 py-2">
                  <div className="font-mono text-xs text-zinc-600">
                    {c.numeroCertificado}
                  </div>
                  <div className="text-xs text-zinc-400">{c.laboratorio}</div>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-zinc-600">
                  {fmtDate(c.dataCalibracao)}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-zinc-600">
                  {fmtDate(c.validade)}
                </td>
                <td className="px-4 py-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded bg-zinc-100">
                    <div
                      className={`h-full rounded ${STATUS_BAR[c.status]}`}
                      style={{ width: `${c.vidaRestantePct}%` }}
                    />
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[c.status]}`}
                  >
                    {statusLine(c.status, c.diasRestantes)}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                  Nenhum certificado cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
