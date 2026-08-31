import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { certificateStatus } from "@/lib/certificates";
import { CertificateTable, type CertificateListItem } from "./CertificateTable";
import { NewCertificateForm } from "./NewCertificateForm";

export const dynamic = "force-dynamic";

export default async function CertificadosPage() {
  const [session, certificates] = await Promise.all([
    auth(),
    db.certificate.findMany({ orderBy: { validade: "asc" } }),
  ]);

  const items: CertificateListItem[] = certificates.map((c) => {
    const { status, diasRestantes } = certificateStatus(c.validade);

    // Vida restante como % do intervalo real de calibração deste
    // instrumento (validade - dataCalibracao), não um ano fixo como no
    // protótipo — ver Code Style em SPEC-certificates.md.
    const totalIntervalDays = Math.max(
      1,
      Math.round((c.validade.getTime() - c.dataCalibracao.getTime()) / 86_400_000)
    );
    const vidaRestantePct = Math.max(
      0,
      Math.min(100, Math.round((diasRestantes / totalIntervalDays) * 100))
    );

    return {
      id: c.id,
      instrumento: c.instrumento,
      numeroSerie: c.numeroSerie,
      numeroCertificado: c.numeroCertificado,
      laboratorio: c.laboratorio,
      dataCalibracao: c.dataCalibracao.toISOString(),
      validade: c.validade.toISOString(),
      uso: c.uso,
      status,
      diasRestantes,
      vidaRestantePct,
    };
  });

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Certificados & Calibração
        </h1>
        <p className="text-sm text-zinc-500">
          Instrumentos de medição da obra — o vencimento é calculado
          automaticamente a partir da validade.
        </p>
      </div>

      {session?.user?.role && can(session.user.role, "certificates.manage") && (
        <NewCertificateForm />
      )}

      <CertificateTable items={items} />
    </div>
  );
}
