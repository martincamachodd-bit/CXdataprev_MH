"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import type { Level, Role } from "@prisma/client";
import {
  advanceLevelAction,
  executeStepAction,
  getAssetDetail,
  uploadDocumentAction,
  validateStepAction,
  type AssetDetail,
  type StepState,
} from "./actions";
import { LEVEL_BADGE } from "./AssetTable";
import { OpenPunchForm } from "./OpenPunchForm";
import { LEVELS_ORDER, NIVEIS } from "@/lib/roadmap";
import { can } from "@/lib/permissions";
import type { AssetSummary } from "@/lib/assets";

const STEP_STATE_LABEL: Record<StepState, string> = {
  na: "N/A",
  pending: "Pendente",
  executed: "Executado",
  validated: "Validado",
};

const STEP_STATE_DOT: Record<StepState, string> = {
  na: "bg-zinc-300",
  pending: "bg-zinc-300",
  executed: "bg-amber-500",
  validated: "bg-emerald-500",
};

function StepRow({
  assetId,
  assetTag,
  level,
  step,
  canEdit,
  canValidate,
  onChanged,
}: {
  assetId: string;
  assetTag: string;
  level: Level;
  step: AssetDetail["levels"][number]["steps"][number];
  canEdit: boolean;
  canValidate: boolean;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploadPending, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleExecute() {
    setError(null);
    startTransition(async () => {
      const result = await executeStepAction(assetId, level, step.id);
      if (result?.error) setError(result.error);
      else onChanged();
    });
  }

  function handleValidate() {
    setError(null);
    startTransition(async () => {
      const result = await validateStepAction(assetId, level, step.id);
      if (result?.error) setError(result.error);
      else onChanged();
    });
  }

  function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setUploadError(null);
    startUpload(async () => {
      const result = await uploadDocumentAction(undefined, formData);
      if (result?.error) setUploadError(result.error);
      else {
        form.reset();
        onChanged();
      }
    });
  }

  return (
    <div
      data-step={step.id}
      className="border-b border-zinc-100 py-2 last:border-0"
    >
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${STEP_STATE_DOT[step.state]}`}
        />
        <span
          className={`text-sm ${step.state === "na" ? "text-zinc-400" : "text-zinc-700"}`}
        >
          {step.label}
        </span>

        {step.state === "na" ? (
          <span className="ml-auto rounded border border-dashed border-zinc-300 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
            N/A
          </span>
        ) : (
          <>
            <span className="ml-auto text-right font-mono text-[10px] text-zinc-400">
              {STEP_STATE_LABEL[step.state]}
              {step.state === "validated" && step.validatedByName
                ? ` · ${step.validatedByName}`
                : step.state === "executed" && step.executedByName
                  ? ` · ${step.executedByName}`
                  : ""}
            </span>
            {canEdit && step.state === "pending" && (
              <button
                type="button"
                onClick={handleExecute}
                disabled={pending}
                className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:border-zinc-500 hover:text-zinc-900 disabled:opacity-50"
              >
                Marcar executado
              </button>
            )}
            {canValidate && (
              <button
                type="button"
                onClick={handleValidate}
                disabled={pending || step.state !== "executed"}
                className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Validar
              </button>
            )}
          </>
        )}
      </div>
      {error && <p className="mt-1 pl-6 text-xs text-red-600">{error}</p>}

      {step.docPattern && step.state !== "na" && (
        <div className="mt-1.5 pl-6">
          <div className="flex flex-wrap items-center gap-1.5">
            {step.documents.length === 0 ? (
              <span className="inline-flex items-center gap-1 rounded border border-dashed border-zinc-300 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                📎 {step.docPattern.replace("{tag}", assetTag)} — pendente upload
              </span>
            ) : (
              step.documents.map((doc) => (
                <span
                  key={doc.id}
                  className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[10px] text-zinc-600"
                >
                  📎 {doc.filename}
                  {doc.uploadedByName ? ` · ${doc.uploadedByName}` : ""}
                </span>
              ))
            )}
          </div>

          {canEdit && (
            <form onSubmit={handleUpload} className="mt-1 flex items-center gap-2">
              <input type="hidden" name="assetId" value={assetId} />
              <input type="hidden" name="level" value={level} />
              <input type="hidden" name="stepId" value={step.id} />
              <input
                type="file"
                name="file"
                required
                className="text-[11px] text-zinc-500 file:mr-2 file:rounded file:border file:border-zinc-300 file:bg-white file:px-2 file:py-0.5 file:text-[11px]"
              />
              <button
                type="submit"
                disabled={uploadPending}
                className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-600 hover:border-zinc-500 disabled:opacity-50"
              >
                Anexar
              </button>
            </form>
          )}
          {uploadError && (
            <p className="mt-1 text-xs text-red-600">{uploadError}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AssetDrawer({
  asset,
  role,
  onClose,
}: {
  asset: AssetSummary;
  role: Role | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [openLevel, setOpenLevel] = useState<Level | null>(asset.nivelAtual);
  const [advancePending, startAdvance] = useTransition();
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  function refresh() {
    getAssetDetail(asset.id).then(setDetail);
  }

  function handleAdvance() {
    const nextLevel = LEVELS_ORDER[currentIdx + 1];
    if (!nextLevel) return;
    setAdvanceError(null);
    startAdvance(async () => {
      const result = await advanceLevelAction(asset.id, nextLevel);
      if (result?.error) setAdvanceError(result.error);
      else {
        setOpenLevel(nextLevel);
        refresh();
      }
    });
  }

  // AssetTable monta este componente com `key={asset.id}`, então cada troca
  // de ativo remonta do zero — o estado acima já nasce correto pro novo
  // ativo, sem precisar resetar nada aqui dentro do efeito.
  useEffect(() => {
    let cancelled = false;
    getAssetDetail(asset.id).then((d) => {
      if (!cancelled) setDetail(d);
    });
    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  const currentIdx = LEVELS_ORDER.indexOf(asset.nivelAtual);
  const canEdit = role ? can(role, "checklist.edit") : false;
  const canValidate = role ? can(role, "checklist.validate") : false;
  const canApprove = role ? can(role, "gate.approve_transition") : false;
  const canOpenPunch = role ? can(role, "punch.create") : false;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start gap-4 border-b border-zinc-200 px-6 py-5">
          <div>
            <div className="font-mono text-xl font-semibold text-amber-700">
              {asset.tag}
            </div>
            <h2 className="text-base font-semibold text-zinc-900">
              {asset.nome}
            </h2>
            <div className="mt-1 flex gap-3 font-mono text-xs text-zinc-500">
              <span>Célula {asset.celula}</span>
              <span>Tipo: {asset.tipo}</span>
              <span>Nível atual: {asset.nivelAtual}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:border-red-300 hover:text-red-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Stepper L1 → L5 */}
          <div className="mb-6 flex">
            {LEVELS_ORDER.map((level, i) => (
              <div key={level} className="flex-1 text-center">
                <div
                  className={`mx-auto mb-1 h-3 w-3 rounded-full border-2 ${
                    i < currentIdx
                      ? "border-emerald-500 bg-emerald-500"
                      : i === currentIdx
                        ? "border-amber-500 bg-amber-500"
                        : "border-zinc-300 bg-white"
                  }`}
                />
                <div
                  className={`font-mono text-xs font-semibold ${
                    i < currentIdx
                      ? "text-emerald-600"
                      : i === currentIdx
                        ? "text-amber-600"
                        : "text-zinc-400"
                  }`}
                >
                  {level}
                </div>
                <div className="text-[10px] text-zinc-400">{NIVEIS[level].nome}</div>
              </div>
            ))}
          </div>

          {/* Avançar nível (só Aprovador — reaproveita a mesma action do Kanban) */}
          {canApprove && LEVELS_ORDER[currentIdx + 1] && (
            <div className="mb-4 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={handleAdvance}
                disabled={advancePending}
                className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {advancePending
                  ? "Avançando…"
                  : `Avançar para ${LEVELS_ORDER[currentIdx + 1]}`}
              </button>
              {advanceError && (
                <p className="text-xs text-red-600">{advanceError}</p>
              )}
            </div>
          )}

          {/* Fontes A/B */}
          {(asset.fonteA || asset.fonteB) && (
            <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-wide text-zinc-400">
                ⚡ Fontes de alimentação
              </div>
              {asset.fonteA && (
                <div className="mb-1 flex items-center gap-2 font-mono text-xs">
                  <span className="w-14 text-zinc-400">Fonte A</span>
                  <span className="rounded border border-zinc-200 bg-white px-2 py-0.5">
                    {asset.fonteA}
                  </span>
                  <span className="text-zinc-400">→</span>
                  <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-700">
                    {asset.tag}
                  </span>
                </div>
              )}
              {asset.fonteB && (
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="w-14 text-zinc-400">Fonte B</span>
                  <span className="rounded border border-zinc-200 bg-white px-2 py-0.5">
                    {asset.fonteB}
                  </span>
                  <span className="text-zinc-400">→</span>
                  <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-700">
                    {asset.tag}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Níveis expansíveis */}
          {!detail ? (
            <p className="text-sm text-zinc-400">Carregando checklist…</p>
          ) : (
            <div className="flex flex-col gap-2">
              {detail.levels.map(({ level, steps }, i) => {
                const isOpen = openLevel === level;
                const gateLabel =
                  i < currentIdx
                    ? "✓ concluído"
                    : i === currentIdx
                      ? "em execução"
                      : "🔒 gate travado";
                return (
                  <div
                    key={level}
                    className="overflow-hidden rounded-lg border border-zinc-200"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenLevel(isOpen ? null : level)}
                      className="flex w-full items-center gap-3 bg-zinc-50 px-4 py-3 text-left hover:bg-zinc-100"
                    >
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-xs font-semibold ${LEVEL_BADGE[level]}`}
                      >
                        {level}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">
                          {NIVEIS[level].nome}
                        </div>
                        <div className="font-mono text-[10px] text-zinc-400">
                          {NIVEIS[level].desc}
                        </div>
                      </div>
                      <span className="ml-auto font-mono text-[10px] text-zinc-500">
                        {gateLabel}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 py-2">
                        {steps.map((step) => (
                          <StepRow
                            key={step.id}
                            assetId={asset.id}
                            assetTag={asset.tag}
                            level={level}
                            step={step}
                            canEdit={canEdit}
                            canValidate={canValidate}
                            onChanged={refresh}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {canOpenPunch && (
            <div className="mt-4">
              <OpenPunchForm assetId={asset.id} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
