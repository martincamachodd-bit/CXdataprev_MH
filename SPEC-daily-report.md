# Spec: daily-report

Módulo 6/7 do [CAPABILITY-MAP.md](./CAPABILITY-MAP.md) — CxManager. Depende de `asset-commissioning`, `punch-list`, `energization`, `certificates` (todos já implementados) — é o módulo que agrega os outros quatro.

Fonte: protótipo [`comissionamento-prototipo.html`](D:\Downloads\comissionamento-prototipo.html) — aba "Relatório Diário Automático" (`#page-rel`, função `buildReport()`).

## Objective

Montar, sob demanda, um relatório diário que agrega o que já existe nos quatro módulos anteriores: punchs com prazo crítico, energizações pendentes, documentos faltando e certificados vencendo/vencidos — mais uma seção "Hoje" com o que realmente aconteceu no dia (etapas executadas/validadas) e ativos prontos parados há mais de 24h sem avançar de nível.

Duas decisões confirmadas com o usuário em 2026-08-30:

1. **A seção "Atividades do dia" do protótipo é texto fictício** (agenda por horário: "07:30 MSB-1A continuação do IST...") — não existe conceito de agenda/atividade programada no schema, e não é criado um agora. Ela é **substituída por uma seção "Hoje" derivada do que já existe**: etapas executadas/validadas no dia (`AssetStepCompletion.executedAt`/`.validatedAt`, já existentes) e ativos com progresso 100% no nível atual mas parados há mais de 24h sem avançar (usando o `validatedAt` mais recente das etapas do nível atual como proxy de "desde quando está pronto" — sem novo campo).
2. **Geração e envio ficam só sob demanda, nada persistido** — um botão monta o relatório de hoje ao vivo na página (mesma filosofia de "nunca armazenar valor derivado" já usada em `progressPct`/`certificateStatus`/`computeEnergizationStatuses`). O envio por e-mail/WhatsApp do protótipo (06:00, 7 destinatários) fica **mockado** — mesmo tratamento dado ao `ai-assistant`: sem cron real, sem integração de e-mail real, sem lista de distribuição no schema. "Exportar PDF" usa impressão nativa do navegador (`window.print()` com CSS de impressão), não uma lib de PDF no servidor.

Sucesso = qualquer usuário logado abre `/relatorio`, vê as cinco seções montadas com dado real (nenhuma reproduz o texto fictício do protótipo), e os botões de exportar/enviar existem e reagem (mesmo que o envio seja mockado) sem quebrar nada.

## Tech Stack

Mesma base do projeto. Nenhuma dependência nova — PDF via `window.print()` do navegador, não uma lib server-side. **Nenhuma migration** — 100% derivado de dados que já existem em `Asset`, `AssetStepCompletion`, `AssetDocument`, `Punch`, `Certificate`.

## Commands

Mesmos comandos já documentados no `README.md`. Nenhum comando novo.

## Project Structure

```
src/
  app/
    (app)/
      relatorio/
        page.tsx                → busca tudo (assets, completions, docs, punches, certificados), monta as 5 seções, passa pro client
        DailyReportView.tsx      → client — renderiza as 5 seções no layout "documento" do protótipo (rep-doc), botão Exportar PDF (window.print()) e botão Enviar pro time (mockado, toast)
  lib/
    dailyReport.ts               → 5 funções puras, uma por seção (ver Code Style)
tests/
  unit/
    dailyReport.test.ts          → cada função testada isoladamente com arrays simples, sem banco
  e2e/
    daily-report.spec.ts         → relatório reflete dado real cadastrado (punch com prazo, energização pendente, doc faltando, certificado vencendo); botões de exportar/enviar não quebram a página
```

## Code Style

Mesmo padrão de `lib/gate.ts`/`lib/certificates.ts`/`lib/energization.ts`: funções puras, uma por seção, cada uma testável com array simples (sem banco). `page.tsx` faz toda a busca (reaproveitando `getAssetSummaries()` e `computeEnergizationStatuses()` já existentes) e repassa pras funções — nenhuma delas faz sua própria query.

```ts
// lib/dailyReport.ts

export type StepEventToday = {
  assetTag: string;
  stepLabel: string;
  action: "executado" | "validado";
  at: Date;
  byName: string | null;
};

// Etapas executadas OU validadas dentro do dia de `hoje` (mesmo dia-calendário).
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
): StepEventToday[] { /* ... */ }

export type StalledAsset = { tag: string; nome: string; nivelAtual: string; readySince: Date };

// Ativos com progresso 100% no nível atual (e nível atual != L5) cujo
// validatedAt mais recente das etapas aplicáveis já passou de 24h.
export function getStalledReadyAssets(
  assets: {
    tag: string;
    nome: string;
    nivelAtual: string;
    progressPct: number;
    lastValidatedAt: Date | null;
  }[],
  hoje: Date = new Date()
): StalledAsset[] { /* ... */ }

// Punchs abertos com prazo definido, ordenados por prazo (mais urgente
// primeiro); cada um marcado como vencido ou não.
export function getCriticalPunches(
  punches: { assetTag: string; categoria: string; titulo: string; prazo: Date | null; status: string }[],
  hoje: Date = new Date()
): { assetTag: string; categoria: string; titulo: string; prazo: Date; overdue: boolean }[] { /* ... */ }

// Reaproveita o status já calculado por computeEnergizationStatuses — só
// filtra quem ainda não está "en" (energizado).
export function getPendingEnergizations(
  items: { tag: string; nome: string; status: "en" | "lb" | "ag" | "bl" }[]
): { tag: string; nome: string; status: "lb" | "ag" | "bl" }[] { /* ... */ }

// Etapas com docPattern, já executadas, sem nenhum AssetDocument anexado.
export function getMissingDocuments(
  steps: { assetTag: string; stepLabel: string; docPattern: string; executedAt: Date | null; documentCount: number }[]
): { assetTag: string; stepLabel: string; docName: string }[] { /* ... */ }

// Reaproveita certificateStatus() de lib/certificates.ts — só filtra warn/exp.
export function getSystemWarnings(
  certificates: { instrumento: string; status: "ok" | "warn" | "exp"; diasRestantes: number }[]
): { instrumento: string; status: "warn" | "exp"; diasRestantes: number }[] { /* ... */ }
```

## Testing Strategy

- **Unit (Vitest):** cada uma das 6 funções acima com casos de borda próprios:
  - `getStepsToday`: evento de ontem não aparece; evento de hoje aparece; um evento com `executedAt` e `validatedAt` no mesmo dia gera as duas entradas.
  - `getStalledReadyAssets`: 100% + 23h → não aparece; 100% + 25h → aparece; <100% não aparece mesmo há dias parado; L5 nunca aparece (nada a avançar).
  - `getCriticalPunches`: sem prazo não aparece; prazo futuro aparece não-vencido; prazo passado aparece vencido; ordenação por prazo crescente.
  - `getPendingEnergizations`: "en" filtrado fora; "lb"/"ag"/"bl" aparecem.
  - `getMissingDocuments`: etapa sem docPattern nunca aparece; executada sem doc aparece; executada com doc não aparece; não-executada não aparece mesmo sem doc.
  - `getSystemWarnings`: "ok" filtrado fora; "warn"/"exp" aparecem.
- **E2E (Playwright):** cadastra via Prisma um cenário com pelo menos um item real em cada seção (punch com prazo, ativo com fonte pendente, etapa sem doc, certificado vencendo) e confere que `/relatorio` mostra cada um; confere que os botões "Exportar PDF" e "Enviar pro time" existem e não quebram a página ao clicar.

## Boundaries

- **Sempre:** todo conteúdo do relatório vem de uma leitura ao vivo — nada persistido, nada de cron real, nada de e-mail/WhatsApp real neste MVP.
- **Perguntar antes:** persistir um snapshot histórico do relatório (navegação por data passada); implementar envio real (SMTP/WhatsApp Business API); criar um conceito real de agenda/atividade programada.
- **Nunca:** reproduzir o texto fictício de "Atividades do dia" do protótipo — toda seção do relatório reflete dado real do banco.

## Success Criteria

- [ ] `/relatorio` monta as 5 seções (Hoje, Punchs com prazo, Energizações pendentes, Documentos faltando, Avisos do sistema) com dado real, sem nenhuma linha fictícia do protótipo.
- [ ] Etapa executada ou validada hoje aparece na seção "Hoje"; de ontem não aparece.
- [ ] Ativo 100% pronto e parado há mais de 24h no nível atual aparece na seção "Hoje" como parado.
- [ ] Punch aberto com prazo aparece na seção de punchs, ordenado por urgência, marcado como vencido quando for o caso.
- [ ] Ativo cujo status de energização (via `lib/energization.ts`) não é "energizado" aparece na seção de energizações pendentes.
- [ ] Etapa com padrão de documento, já executada, sem nenhum documento anexado aparece na seção de documentos faltando.
- [ ] Certificado vencendo ou vencido (via `lib/certificates.ts`) aparece na seção de avisos.
- [ ] Botão "Exportar PDF" aciona a impressão do navegador; botão "Enviar pro time" mostra confirmação mockada — nenhum dos dois quebra a página nem faz uma chamada real de envio.
- [ ] Todos os itens de "Testing Strategy" implementados e passando.

## Open Questions

Nenhuma nova além das já registradas nas duas perguntas confirmadas com o usuário ("Hoje" deriva de dado real; geração/envio só sob demanda e mockado) — ambas com decisão tomada, não suposição.
