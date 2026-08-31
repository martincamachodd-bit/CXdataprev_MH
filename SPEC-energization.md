# Spec: energization

Módulo 5/7 do [CAPABILITY-MAP.md](./CAPABILITY-MAP.md) — CxManager. Depende de `asset-commissioning` e `punch-list` (ambos já implementados).

Fonte: protótipo [`comissionamento-prototipo.html`](D:\Downloads\comissionamento-prototipo.html) — aba "Energização". No protótipo a árvore é HTML escrito à mão (não deriva de dado nenhum); este módulo constrói a árvore de verdade a partir do que já existe.

## Objective

Mostrar a hierarquia real de energização dos ativos — quem alimenta quem, a partir do campo `fonteA` que `asset-commissioning` já grava como texto livre (referência à TAG de outro ativo, ou uma fonte externa como "Concessionária") — e calcular o status de cascata de cada um: **Energizado**, **Liberado para energizar**, **Aguardando fonte** ou **Bloqueado** (punch A aberto).

Duas decisões confirmadas com o usuário em 2026-08-30, ambas escolhendo o caminho mais simples/reaproveitador:

1. **"Energizado" não é um campo novo** — reaproveita a etapa `ene` ("Energização inicial pela fonte principal") que já existe no L3 do roadmap (`lib/roadmap.ts`). Um ativo está energizado quando essa etapa está **validada**. Zero schema novo, zero ação nova.
2. **Redundância N+1 (fonte A + fonte B) fica só visual** — a árvore mostra o status de cada fonte, mas isso **não** vira uma regra nova em `canAdvance()`. O gate do L4 continua exatamente como está (progresso 100% + zero punch A). A leitura de "liberado para energizar" considera só a **fonte principal** (`fonteA`) — a mesma fonte que o texto da etapa `ene` menciona.

Sucesso = qualquer usuário logado vê, por célula, os ativos com seu status de energização calculado corretamente a partir de dados reais (não mockados): energizado quando a etapa `ene` do L3 está validada; bloqueado quando há punch A aberto (mesmo que a etapa `ene` já esteja validada — punch A sempre prevalece); liberado quando a fonte principal já está energizada (ou é uma fonte externa não rastreada, tipo concessionária) e o próprio ativo ainda não tem punch A; aguardando nos demais casos. Clicar num ativo abre o mesmo drawer já usado em `/ativos` e `/kanban`.

## Tech Stack

Mesma base do projeto. Nenhuma dependência nova, **nenhuma migration** — este módulo não introduz nenhuma tabela nem campo novo, é 100% derivado de dados que já existem (`Asset.fonteA`, `AssetStepCompletion`, `Punch`).

## Commands

Mesmos comandos já documentados no `README.md`. Nenhum comando novo.

## Project Structure

```
src/
  app/
    (app)/
      energizacao/
        page.tsx              → busca ativos + completions da etapa 'ene' + punch A abertos, calcula status
        EnergizationTree.tsx    → client — agrupa por célula, indenta por profundidade, abre o drawer no clique (reaproveita AssetDrawer)
  lib/
    energization.ts             → computeEnergizationStatuses(assets) — função pura, mesmo padrão de lib/gate.ts
tests/
  unit/
    energization.test.ts        → cascata: fonte externa, fonte interna energizada/não energizada, punch A sempre prevalece, ciclo defensivo
  e2e/
    energization.spec.ts        → status calculado bate com dados reais; punch A aberto marca bloqueado mesmo com 'ene' validada; clicar abre o drawer
```

## Code Style

Função pura de cascata, com proteção contra ciclo (dado ruim não deveria travar a página):

```ts
// lib/energization.ts
export type EnergizationStatus = "en" | "lb" | "ag" | "bl";

export type AssetEnergizationInput = {
  tag: string;
  fonteA: string | null;
  openPunchACount: number;
  eneValidated: boolean; // etapa 'ene' do L3 validada?
};

export function computeEnergizationStatuses(
  assets: AssetEnergizationInput[]
): Map<string, EnergizationStatus> {
  const byTag = new Map(assets.map((a) => [a.tag, a]));
  const cache = new Map<string, EnergizationStatus>();
  const resolving = new Set<string>();

  function resolve(tag: string): EnergizationStatus {
    if (cache.has(tag)) return cache.get(tag)!;
    const asset = byTag.get(tag);
    if (!asset || resolving.has(tag)) return "ag"; // ciclo ou dado ausente: nunca trava, só fica "aguardando"
    resolving.add(tag);

    let status: EnergizationStatus;
    if (asset.openPunchACount > 0) {
      status = "bl"; // punch A sempre prevalece, mesmo já energizado
    } else if (asset.eneValidated) {
      status = "en";
    } else {
      const fonteResolvida =
        !asset.fonteA || !byTag.has(asset.fonteA)
          ? true // sem fonte cadastrada ou fonte externa (ex.: concessionária) — sempre disponível
          : resolve(asset.fonteA) === "en";
      status = fonteResolvida ? "lb" : "ag";
    }

    resolving.delete(tag);
    cache.set(tag, status);
    return status;
  }

  for (const asset of assets) resolve(asset.tag);
  return cache;
}
```

`EnergizationTree.tsx` reaproveita `AssetDrawer` (já usado em `/ativos` e `/kanban`) pro clique num ativo — mesmo padrão de composição já estabelecido, nenhum componente de detalhe novo.

## Testing Strategy

- **Unit (Vitest):**
  - Ativo sem `fonteA` (ou fonte externa não cadastrada) e sem `ene` validada → "lb".
  - Ativo cuja fonte está energizada (`ene` validada na fonte) e ele mesmo sem `ene` validada e sem punch A → "lb".
  - Ativo cuja fonte ainda não está energizada → "ag".
  - Ativo com `ene` validada → "en".
  - Ativo com `ene` validada **e** punch A aberto → "bl" (punch A sempre prevalece).
  - Ciclo de fontes (A depende de B, B depende de A) não trava — cai em "ag" pros dois.
- **E2E (Playwright):**
  - Ativo cuja fonte principal tem a etapa `ene` validada aparece como "liberado".
  - Ativo com punch A aberto aparece como "bloqueado", mesmo que a etapa `ene` já esteja validada.
  - Clicar num ativo na árvore abre o drawer com o detalhe certo (mesmo componente de `/ativos`).

## Boundaries

- **Sempre:** tratar uma `fonteA` que não bate com nenhuma TAG cadastrada como fonte externa (nunca travar/erro) — texto livre pode ser "Concessionária", "GER-01" (gerador não cadastrado como ativo) etc.; proteger a resolução recursiva contra ciclo (dado ruim nunca pode travar a página).
- **Perguntar antes:** transformar a regra de redundância N+1 num bloqueio real do gate; adicionar um campo/ação de "marcar energizado" independente da etapa `ene`; validar que `fonteA` referencia uma TAG existente no cadastro do ativo (hoje é texto livre sem validação, por decisão de `asset-commissioning`).
- **Nunca:** guardar o status de energização calculado — sempre recalcular na leitura, mesmo raciocínio de `certificates`/`lib/assets.ts`.

## Success Criteria

- [ ] `/energizacao` mostra os ativos agrupados por célula, com o status de energização calculado a partir de dados reais.
- [ ] Ativo com a etapa `ene` do L3 validada aparece como "Energizado".
- [ ] Ativo cuja fonte principal está energizada (e ele mesmo sem punch A) aparece como "Liberado para energizar".
- [ ] Ativo cuja fonte principal ainda não está energizada aparece como "Aguardando fonte".
- [ ] Ativo com punch A aberto aparece como "Bloqueado", mesmo que já tenha `ene` validada.
- [ ] Fonte principal que não corresponde a nenhuma TAG cadastrada (fonte externa) nunca trava a página nem aparece como erro.
- [ ] Clicar num ativo na árvore abre o mesmo drawer de detalhe já usado em `/ativos`/`/kanban`.
- [ ] Todos os itens de "Testing Strategy" implementados e passando.

## Open Questions

Nenhuma nova além das já registradas nas duas perguntas já confirmadas com o usuário (energizado deriva da etapa `ene`; N+1 fica só visual) — ambas com decisão tomada, não suposição.
