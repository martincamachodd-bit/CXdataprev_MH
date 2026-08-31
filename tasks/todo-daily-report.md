# Todo: daily-report

Plano completo: [tasks/plan-daily-report.md](./plan-daily-report.md). Spec: [SPEC-daily-report.md](../SPEC-daily-report.md).

## Tarefas

- [x] Tarefa 1: `lib/dailyReport.ts` — as 6 funções puras das seções — `getStepsToday`, `getStalledReadyAssets`, `getCriticalPunches`, `getPendingEnergizations`, `getMissingDocuments`, `getSystemWarnings`; 21 unit tests novos, 98/98 passando
- [x] Tarefa 2: `/relatorio` — queries e montagem — todas as 6 queries em paralelo, cruzamento de docPattern×AssetDocument via `applicableSteps` de todos os níveis, reaproveita `getAssetSummaries()`/`computeEnergizationStatuses()`/`certificateStatus()` sem tocar nenhum deles; verificado contra o banco de dev real (252 etapas hoje, 24 ativos parados, 245 energizações pendentes, 438 docs faltando, 5 avisos de certificado, 0 punchs com prazo — confirmado que é real: nenhum punch aberto tem prazo cadastrado ainda), zero erro de console
- [x] Tarefa 3: `DailyReportView.tsx` — layout, exportar/enviar, e2e — 5 seções no estilo "documento" do protótipo, `window.print()` pra exportar, toast mockado pra "enviar" (sem server action); data ("hojeLabel") formatada no servidor pra evitar mismatch de hidratação; 3 e2e novos, 48/48 passando

### Checkpoint: Lógica das seções
- [x] `npx tsc --noEmit` / `npm run lint` sem erro
- [x] Todos os casos de `Testing Strategy` cobertos e passando (mais um extra: punch fechado não aparece mesmo com prazo)
- [ ] Revisar com o usuário antes de construir a página

### Checkpoint: Módulo completo
- [x] Todos os critérios de sucesso de `SPEC-daily-report.md` revisados um a um contra teste real — todos atendidos, sem ressalva
- [x] `npx tsc --noEmit`, `npm run lint`, `rm -rf .next && npm run build` (`/relatorio` como `ƒ` dinâmica), `npm run test` (98 unit), `npm run test:e2e` (48 e2e, suíte completa) passando
- [x] `CAPABILITY-MAP.md` + memória do projeto atualizados
