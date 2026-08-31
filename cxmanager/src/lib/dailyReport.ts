// Relatório diário — sempre montado ao vivo, nunca persistido (ver
// SPEC-daily-report.md). Cada seção é uma função pura independente,
// testável sem banco; page.tsx faz toda a busca e repassa os dados já no
// formato que cada função espera.

const DAY_MS = 86_400_000;

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ── ① Hoje: etapas executadas/validadas no dia ─────────────────────────

export type StepEventToday = {
  assetTag: string;
  stepLabel: string;
  action: "executado" | "validado";
  at: Date;
  byName: string | null;
};

export function getStepsToday(
  completions: {
    assetTag: string;
    stepLabel: string;
    executedAt: Date | null;
    executedByName: string | null;
    validatedAt: Date | null;
    validatedByName: string | null;
  }[],
  hoje: Date = new Date()
): StepEventToday[] {
  const events: StepEventToday[] = [];

  for (const c of completions) {
    if (c.executedAt && isSameCalendarDay(c.executedAt, hoje)) {
      events.push({
        assetTag: c.assetTag,
        stepLabel: c.stepLabel,
        action: "executado",
        at: c.executedAt,
        byName: c.executedByName,
      });
    }
    if (c.validatedAt && isSameCalendarDay(c.validatedAt, hoje)) {
      events.push({
        assetTag: c.assetTag,
        stepLabel: c.stepLabel,
        action: "validado",
        at: c.validatedAt,
        byName: c.validatedByName,
      });
    }
  }

  return events;
}

// ── ① Hoje: ativos prontos parados há mais de 24h ──────────────────────

export type StalledAsset = {
  tag: string;
  nome: string;
  nivelAtual: string;
  readySince: Date;
};

export function getStalledReadyAssets(
  assets: {
    tag: string;
    nome: string;
    nivelAtual: string;
    progressPct: number;
    lastValidatedAt: Date | null;
  }[],
  hoje: Date = new Date()
): StalledAsset[] {
  return assets
    .filter(
      (a) =>
        a.progressPct === 100 &&
        a.nivelAtual !== "L5" && // nada a avançar depois do RFO
        a.lastValidatedAt !== null &&
        hoje.getTime() - a.lastValidatedAt.getTime() > DAY_MS
    )
    .map((a) => ({
      tag: a.tag,
      nome: a.nome,
      nivelAtual: a.nivelAtual,
      readySince: a.lastValidatedAt as Date,
    }));
}

// ── ② Punchs com prazo crítico ──────────────────────────────────────────

export type CriticalPunch = {
  assetTag: string;
  categoria: string;
  titulo: string;
  prazo: Date;
  overdue: boolean;
};

export function getCriticalPunches(
  punches: {
    assetTag: string;
    categoria: string;
    titulo: string;
    prazo: Date | null;
    status: string;
  }[],
  hoje: Date = new Date()
): CriticalPunch[] {
  return punches
    .filter((p) => p.status === "aberto" && p.prazo !== null)
    .map((p) => ({
      assetTag: p.assetTag,
      categoria: p.categoria,
      titulo: p.titulo,
      prazo: p.prazo as Date,
      overdue: (p.prazo as Date).getTime() < hoje.getTime(),
    }))
    .sort((a, b) => a.prazo.getTime() - b.prazo.getTime());
}

// ── ③ Energizações pendentes ────────────────────────────────────────────

export type PendingEnergization = {
  tag: string;
  nome: string;
  status: "lb" | "ag" | "bl";
};

export function getPendingEnergizations(
  items: { tag: string; nome: string; status: "en" | "lb" | "ag" | "bl" }[]
): PendingEnergization[] {
  return items
    .filter((i): i is { tag: string; nome: string; status: "lb" | "ag" | "bl" } =>
      i.status !== "en"
    )
    .map((i) => ({ tag: i.tag, nome: i.nome, status: i.status }));
}

// ── ④ Documentos faltando ───────────────────────────────────────────────

export type MissingDocument = {
  assetTag: string;
  stepLabel: string;
  docName: string;
};

export function getMissingDocuments(
  steps: {
    assetTag: string;
    stepLabel: string;
    docPattern: string;
    executedAt: Date | null;
    documentCount: number;
  }[]
): MissingDocument[] {
  return steps
    .filter((s) => s.executedAt !== null && s.documentCount === 0)
    .map((s) => ({
      assetTag: s.assetTag,
      stepLabel: s.stepLabel,
      docName: s.docPattern.replace("{tag}", s.assetTag),
    }));
}

// ── ⑤ Avisos do sistema ─────────────────────────────────────────────────

export type SystemWarning = {
  instrumento: string;
  status: "warn" | "exp";
  diasRestantes: number;
};

export function getSystemWarnings(
  certificates: {
    instrumento: string;
    status: "ok" | "warn" | "exp";
    diasRestantes: number;
  }[]
): SystemWarning[] {
  return certificates
    .filter((c): c is { instrumento: string; status: "warn" | "exp"; diasRestantes: number } =>
      c.status !== "ok"
    )
    .map((c) => ({
      instrumento: c.instrumento,
      status: c.status,
      diasRestantes: c.diasRestantes,
    }));
}
