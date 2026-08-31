import type { AssetType, Level } from "@prisma/client";

export type RoadmapStep = {
  id: string;
  label: string;
  docPattern?: string; // ex.: "FAT-{tag}.pdf"
  skipFor?: AssetType[]; // tipos para os quais a etapa é N/A
};

export const LEVELS_ORDER: Level[] = ["L1", "L2", "L3", "L4", "L5"];

export const NIVEIS: Record<Level, { nome: string; desc: string }> = {
  L1: { nome: "Fábrica & Docs", desc: "FAT · documentação · embarque · NF" },
  L2: { nome: "Instalação", desc: "megger · torque · aperto · limpeza" },
  L3: { nome: "Testes Individuais", desc: "funcional · termografia · proteção" },
  L4: { nome: "Teste Integrado", desc: "IST · scripts · redundância" },
  L5: { nome: "RFO", desc: "Ready for Operation" },
};

// Etapas por nível — etapas marcadas `skipFor` não se aplicam ao tipo do
// ativo (N/A automático, ver applicableSteps).
export const ROADMAP: Record<Level, RoadmapStep[]> = {
  L1: [
    { id: "fat", label: "FAT aprovado (relatório de fábrica)", docPattern: "FAT-{tag}.pdf" },
    { id: "de", label: "Documento de embarque / packing list", docPattern: "PL-{tag}.pdf" },
    { id: "nf", label: "Nota fiscal registrada", docPattern: "NF-{tag}.pdf" },
    { id: "dt", label: "Datasheet e manual carregados", docPattern: "DS-{tag}.pdf" },
    { id: "rec", label: "Inspeção de recebimento (avarias)", docPattern: "REC-{tag}.pdf" },
  ],
  L2: [
    { id: "pos", label: "Posicionamento e fixação conforme projeto" },
    { id: "meg", label: "Megger (resistência de isolamento)", docPattern: "MEG-{tag}.pdf", skipFor: ["CRAC"] },
    { id: "trq", label: "Torque de conexões com marcação", docPattern: "TRQ-{tag}.pdf" },
    { id: "lmp", label: "Inspeção de limpeza interna" },
    { id: "idn", label: "Identificação / TAG física instalada" },
  ],
  L3: [
    { id: "ene", label: "Energização inicial pela fonte principal" },
    { id: "fun", label: "Teste funcional individual", docPattern: "TF-{tag}.pdf" },
    { id: "ter", label: "Termografia sob carga", docPattern: "TERM-{tag}.pdf", skipFor: ["CRAC"] },
    { id: "prt", label: "Teste de proteções / seletividade", skipFor: ["CRAC", "QDL", "PDU"] },
    { id: "trf", label: "Transferência de fonte (A↔B)", skipFor: ["XFM", "QDL", "CRAC"] },
  ],
  L4: [
    { id: "pre", label: "Pré-requisito: punch A = 0 e fichas L3 100%" },
    { id: "ist", label: "IST — script de teste integrado do sistema", docPattern: "IST-{tag}.pdf" },
    { id: "red", label: "Cenários de falha e redundância (N+1)" },
    { id: "bms", label: "Supervisão / BMS validado ponto a ponto" },
  ],
  L5: [
    { id: "pun", label: "Punch list 100% encerrada (A, B e C)" },
    { id: "asb", label: "As-built e databook entregues", docPattern: "DB-{tag}.pdf" },
    { id: "rfo", label: "Termo RFO assinado", docPattern: "RFO-{tag}.pdf" },
  ],
};

export function applicableSteps(level: Level, tipo: AssetType): RoadmapStep[] {
  return ROADMAP[level].filter((step) => !step.skipFor?.includes(tipo));
}

export function resolveDocName(step: RoadmapStep, tag: string): string | undefined {
  return step.docPattern?.replace("{tag}", tag);
}
