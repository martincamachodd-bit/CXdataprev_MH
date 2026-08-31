"use client";

import { useState, type LiHTMLAttributes, type ReactNode } from "react";
import type {
  StepEventToday,
  StalledAsset,
  CriticalPunch,
  PendingEnergization,
  MissingDocument,
  SystemWarning,
} from "@/lib/dailyReport";

const ENERGIZATION_LABEL: Record<"lb" | "ag" | "bl", string> = {
  lb: "Liberado p/ energizar",
  ag: "Aguardando fonte",
  bl: "Bloqueado (punch A)",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-2 text-sm font-semibold text-zinc-900">{title}</h2>
      <ul className="flex flex-col gap-1.5 text-sm text-zinc-700">{children}</ul>
    </div>
  );
}

function Item({ children, ...rest }: LiHTMLAttributes<HTMLLIElement>) {
  return (
    <li className="border-b border-zinc-100 pb-1.5 last:border-0" {...rest}>
      {children}
    </li>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-xs font-semibold text-amber-700">
      {children}
    </span>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <li className="text-xs text-zinc-400">{children}</li>;
}

function Toast({ message }: { message: string }) {
  return (
    <div
      data-testid="toast"
      className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg print:hidden"
    >
      {message}
    </div>
  );
}

export function DailyReportView({
  hojeLabel,
  stepsToday,
  stalledAssets,
  criticalPunches,
  pendingEnergizations,
  missingDocuments,
  systemWarnings,
}: {
  hojeLabel: string;
  stepsToday: StepEventToday[];
  stalledAssets: StalledAsset[];
  criticalPunches: CriticalPunch[];
  pendingEnergizations: PendingEnergization[];
  missingDocuments: MissingDocument[];
  systemWarnings: SystemWarning[];
}) {
  const [toast, setToast] = useState<string | null>(null);

  function handleSend() {
    setToast(
      "Seria enviado por e-mail/WhatsApp pra 7 destinatários (mock — sem integração real neste MVP)."
    );
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          ⬇ Exportar PDF
        </button>
        <button
          type="button"
          onClick={handleSend}
          className="rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-500"
        >
          📤 Enviar pro time
        </button>
      </div>

      <div
        data-testid="daily-report-doc"
        className="rounded-xl border border-zinc-200 bg-white p-6"
      >
        <h1 className="text-lg font-semibold text-zinc-900">
          Relatório Diário de Comissionamento
        </h1>
        <div className="mb-4 font-mono text-xs text-zinc-400">
          {hojeLabel} · montado ao vivo
        </div>

        <Section title="① Hoje">
          {stepsToday.length === 0 && stalledAssets.length === 0 ? (
            <Empty>Nenhuma etapa executada ou validada hoje até agora.</Empty>
          ) : (
            <>
              {stepsToday.map((e, i) => (
                <Item key={`step-${i}`} data-step-today-tag={e.assetTag}>
                  <Tag>{e.assetTag}</Tag> {e.stepLabel} — <strong>{e.action}</strong>
                  {e.byName ? ` por ${e.byName}` : ""} às{" "}
                  {new Date(e.at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Item>
              ))}
              {stalledAssets.map((a) => (
                <Item key={`stalled-${a.tag}`} data-stalled-tag={a.tag}>
                  <Tag>{a.tag}</Tag> {a.nome} — pronto no {a.nivelAtual} e
                  parado desde{" "}
                  {new Date(a.readySince).toLocaleString("pt-BR")}, sem
                  avançar.
                </Item>
              ))}
            </>
          )}
        </Section>

        <Section title="② Punchs com prazo crítico">
          {criticalPunches.length === 0 ? (
            <Empty>Nenhum punch aberto com prazo definido.</Empty>
          ) : (
            criticalPunches.map((p, i) => (
              <Item key={i} data-punch-tag={p.assetTag}>
                <Tag>{p.assetTag}</Tag> [{p.categoria}] {p.titulo} — prazo{" "}
                {new Date(p.prazo).toLocaleDateString("pt-BR")}
                {p.overdue && (
                  <span className="ml-1 font-semibold text-red-600">
                    VENCIDO
                  </span>
                )}
              </Item>
            ))
          )}
        </Section>

        <Section title="③ Energizações pendentes">
          {pendingEnergizations.length === 0 ? (
            <Empty>Nenhuma energização pendente — tudo energizado.</Empty>
          ) : (
            pendingEnergizations.map((e) => (
              <Item key={e.tag} data-energization-tag={e.tag}>
                <Tag>{e.tag}</Tag> {e.nome} — {ENERGIZATION_LABEL[e.status]}
              </Item>
            ))
          )}
        </Section>

        <Section title="④ Documentos faltando">
          {missingDocuments.length === 0 ? (
            <Empty>Nenhum documento pendente.</Empty>
          ) : (
            missingDocuments.map((d, i) => (
              <Item key={i} data-missing-doc-tag={d.assetTag}>
                <Tag>{d.assetTag}</Tag> {d.stepLabel} — {d.docName} sem
                upload.
              </Item>
            ))
          )}
        </Section>

        <Section title="⑤ Avisos do sistema">
          {systemWarnings.length === 0 ? (
            <Empty>Nenhum certificado vencendo ou vencido.</Empty>
          ) : (
            systemWarnings.map((w, i) => (
              <Item key={i} data-warning-instrumento={w.instrumento}>
                {w.status === "exp" ? "⛔" : "📄"} {w.instrumento} —{" "}
                {w.status === "exp"
                  ? `vencido há ${Math.abs(w.diasRestantes)} dia(s)`
                  : `vence em ${w.diasRestantes} dia(s)`}
              </Item>
            ))
          )}
        </Section>
      </div>

      {toast && <Toast message={toast} />}
    </div>
  );
}
