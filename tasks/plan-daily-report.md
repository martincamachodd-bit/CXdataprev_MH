# Implementation Plan: daily-report

Módulo 6/7 do [CAPABILITY-MAP.md](../CAPABILITY-MAP.md). Spec: [SPEC-daily-report.md](../SPEC-daily-report.md). Continua no mesmo projeto (`cxmanager/`) — não é um projeto novo.

## Overview

Relatório diário sob demanda agregando os quatro módulos anteriores (ativos, punch-list, energização, certificados) em cinco seções, todas calculadas ao vivo. Nenhum schema novo, nenhuma migration, nenhuma permissão nova, nada persistido — o maior módulo em número de fontes de dado, mas o mesmo nível mínimo de escopo dos últimos três.

## Architecture Decisions

- **Seção "Hoje" substitui a agenda fictícia do protótipo** — deriva de `AssetStepCompletion.executedAt`/`.validatedAt` (etapas do dia) e do `validatedAt` mais recente do nível atual como proxy de "desde quando está pronto" (ativo 100% parado >24h). Zero campo novo.
- **Nada persistido, tudo sob demanda** — sem cron real, sem `DailyReport` no schema, sem histórico navegável por data. PDF via `window.print()` do navegador (zero lib nova); "Enviar pro time" é mockado (toast), sem envio real de e-mail/WhatsApp — mesmo tratamento do `ai-assistant`.
- **`lib/assets.ts` e os demais libs de módulos anteriores não são tocados** — `page.tsx` faz suas próprias queries extras quando precisa de um dado que `getAssetSummaries()`/`computeEnergizationStatuses()`/`certificateStatus()` não expõem (mesmo precedente já usado por `/energizacao`, que fez sua própria query da etapa `ene` em vez de estender `lib/assets.ts`).
- **"Documentos faltando" cruza todos os níveis do ativo, não só o atual** — uma etapa executada num nível anterior sem documento continua sendo uma pendência real mesmo depois do ativo avançar.
- **Sem permissão nova** — página de leitura agregada, aberta a qualquer papel logado, mesmo padrão de `/kanban` e `/energizacao`.

## Task List

### Tarefa 1: `lib/dailyReport.ts` — as 6 funções puras das seções

- **Descrição:** `getStepsToday`, `getStalledReadyAssets`, `getCriticalPunches`, `getPendingEnergizations`, `getMissingDocuments`, `getSystemWarnings` — exatamente como no Code Style de `SPEC-daily-report.md`. Todas puras, recebendo arrays simples; as que dependem de "hoje" recebem `hoje: Date = new Date()` (mesmo estilo de `certificateStatus`).
- **Aceitação:**
  - [ ] `getStepsToday`: evento de ontem não aparece; evento de hoje aparece; executado+validado no mesmo dia gera duas entradas
  - [ ] `getStalledReadyAssets`: 100%+23h não aparece; 100%+25h aparece; <100% não aparece mesmo há dias parado; L5 nunca aparece
  - [ ] `getCriticalPunches`: sem prazo não aparece; prazo futuro aparece não-vencido; prazo passado aparece vencido; ordenação crescente por prazo
  - [ ] `getPendingEnergizations`: "en" filtrado fora; "lb"/"ag"/"bl" aparecem
  - [ ] `getMissingDocuments`: sem docPattern nunca aparece; executada sem doc aparece; executada com doc não aparece; não-executada não aparece
  - [ ] `getSystemWarnings`: "ok" filtrado fora; "warn"/"exp" aparecem
- **Verificação:** `npm run test` — `tests/unit/dailyReport.test.ts` cobrindo cada caso acima.
- **Dependências:** Nenhuma.
- **Arquivos:** `src/lib/dailyReport.ts`, `tests/unit/dailyReport.test.ts`
- **Escopo estimado:** M

### Checkpoint: Lógica das seções
- [ ] `npx tsc --noEmit`, `npm run lint` sem erro
- [ ] Todos os casos de `Testing Strategy` cobertos e passando
- [ ] Revisar com o usuário antes de construir a página

### Tarefa 2: `/relatorio` — queries e montagem

- **Descrição:** `page.tsx` (Server Component, `force-dynamic`) busca em paralelo: `auth()`, `getAssetSummaries()`, uma query própria de `validatedAt` por (assetId, level) pra detectar parado >24h, a mesma query da etapa `ene` de `/energizacao` + `computeEnergizationStatuses()`, `db.punch.findMany({ where: { status: "aberto" }, include: { asset: {...} } })`, o cruzamento de etapas com `docPattern` executadas contra `AssetDocument` (via `applicableSteps` de todos os níveis + `groupBy` de documentos), e `db.certificate.findMany()` passado por `certificateStatus()`. Monta o formato que cada função de `lib/dailyReport.ts` espera e chama as 6.
- **Aceitação:**
  - [ ] Cada uma das 5 seções recebe dado real montado a partir das queries acima (verificação inicial via render mínimo/log, refinado na Tarefa 3)
  - [ ] Nenhuma query nova quebra o build nem duplica lógica já existente nas libs dos módulos anteriores
- **Verificação:** `npx tsc --noEmit`; render provisório confirma os 5 arrays populados com dado real do banco de dev.
- **Dependências:** Tarefa 1.
- **Arquivos:** `src/app/(app)/relatorio/page.tsx`
- **Escopo estimado:** M

### Tarefa 3: `DailyReportView.tsx` — layout, exportar/enviar, e2e

- **Descrição:** Componente client renderizando as 5 seções no estilo "documento" do protótipo (título, data de hoje, uma lista por seção). Botão "⬇ Exportar PDF" chama `window.print()` (com uma folha de estilo `print:` do Tailwind escondendo cabeçalho/nav). Botão "📤 Enviar pro time" só mostra um toast mockado ("Seria enviado por e-mail/WhatsApp pra N destinatários (mock)"), sem server action.
- **Aceitação:**
  - [ ] As 5 seções aparecem com o rótulo certo e o item de teste correspondente
  - [ ] "Exportar PDF" aciona `window.print()` sem quebrar a página
  - [ ] "Enviar pro time" mostra o toast mockado sem chamada de rede
- **Verificação:** `npm run test:e2e -- daily-report` cobrindo um item real por seção + os dois botões; depois suíte completa pra regressão.
- **Dependências:** Tarefa 2.
- **Arquivos:** `src/app/(app)/relatorio/DailyReportView.tsx`, `tests/e2e/daily-report.spec.ts`
- **Escopo estimado:** M

### Checkpoint: Módulo completo
- [ ] Todos os critérios de sucesso de `SPEC-daily-report.md` revisados um a um contra teste real
- [ ] `npx tsc --noEmit`, `npm run lint`, `rm -rf .next && npm run build` (rota `/relatorio` como `ƒ` dinâmica), `npm run test`, `npm run test:e2e` (suíte completa) passando
- [ ] `CAPABILITY-MAP.md` + memória do projeto atualizados, pronto pra revisão humana antes de iniciar `ai-assistant`

## Risks and Mitigations

| Risco | Impacto | Mitigação |
|---|---|---|
| "Documentos faltando" varrer todos os níveis × todos os ativos ficar pesado | Baixo | Escala do piloto (~400 ativos × ~5 níveis × ~5 etapas ≈ 10 mil iterações em memória) é trivial; sem paginação/otimização necessária no MVP |
| Duplicar levemente a query da etapa `ene` já feita em `/energizacao/page.tsx` | Baixo | Aceito conscientemente — mesmo precedente de cada `page.tsx` fazer sua própria busca em vez de acoplar páginas via uma lib compartilhada nova |
| Esquecer `force-dynamic` na página (armadilha recorrente) | Baixo | Checklist da Tarefa 2 inclui conferir no `npm run build` que a rota aparece como `ƒ`, não `○` |
| `window.print()` não é testável de verdade no Playwright (não há diálogo de impressão real em CI) | Baixo | Teste confirma que a função é chamada (via espionagem exposta na página), não que o PDF sai correto — suficiente pro critério de sucesso ("não quebra a página") |

## Open Questions

Nenhuma — as duas decisões de arquitetura (seção "Hoje" derivada; geração/envio só sob demanda e mockado) já foram confirmadas com o usuário antes da spec ser escrita.
