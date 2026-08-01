# Coding Conventions

## Idioma

Código e banco em **inglês**: tabelas, colunas, tipos, funções, identificadores, chaves do catálogo. **UI e comentários em pt-BR.**

Os nomes cômicos dos Eventos são rótulo de exibição, não identificador:

```ts
{ key: 'still-at-lunch', label: 'Ainda almoçando?', category: 'online-presence', tier: 'legendary' }
```

É a `key` que vai pro banco. Termos do domínio em comentário e em texto de UI seguem o [glossário](../../CONTEXT.md), inclusive as maiúsculas (Ocorrência, Modificador, Faixa, Extrato).

## Camadas

| Camada | Pode importar | Nunca importa |
|---|---|---|
| `src/lib/core/` | outros arquivos do core, **por caminho relativo** | `$lib`, `$app`, `@sveltejs/kit`, D1, `fetch` |
| `src/lib/server/` | o core (caminho relativo) | Svelte, `$app` |
| `src/routes/` | qualquer coisa, via `$lib/...` | — |

O core usa caminho relativo porque o `bun test` não resolve o alias `$lib`; como o core não depende do framework, o problema desaparece.

## Comentário

Comentário explica **por quê**, e cita a seção da spec ou o ADR que sustenta a decisão (`§6.3`, `ADR 0005`). Comentário que reescreve o código em português é ruído — apague.

Simplificação deliberada com teto conhecido leva o prefixo `ponytail:`, nomeando o teto e o caminho de saída. Ver `PLAUSIBLE` em `+page.svelte`.

## Tabelas antes de condicionais

Regra que a spec expressa como tabela vive como tabela no código: `BANDS`, `BINARY_BONUS`, `CHANNEL_COMPAT`, `CATEGORY_COMPAT`, `CLASSIFICATIONS`. O código percorre a tabela; não há `if` por Modificador espalhado.

Corolário: `allowedModifiers` é a **fonte única** da matriz de compatibilidade. O formulário e o `scoreOccurrence` chamam a mesma função — se divergirem, a tela mostra campo que o core vai descartar.

## Ausência

`0` e `false` são **ausência de medida**, não medida zero (`present()` em `score.ts`). Sem isso, um formulário que envia zeros geraria Descarte para cada campo escondido. Campo de formulário em branco chega como `''` e é ignorado por `parseInput`.

## Erro

- Validação de corpo: `fail(400, { error })`, mensagem em pt-BR dizendo qual campo e por quê
- Binding ausente: `error(500, 'binding DB ausente')`
- Identidade ausente em produção: `error(401, 'sem identidade do Access')`
- Chave fora do catálogo dentro do core: `throw new Error(...)` — é bug, não entrada inválida; a fronteira já barrou

## Svelte

Runes (`$state`, `$derived`, `$effect`, `$props`), sem stores. Tailwind inline, sem CSS a manter. Alvo de toque mínimo `min-h-12`. `$effect` sempre devolve o cleanup.

## Checklist — Evento novo

1. Adicione a entrada na seção da Categoria em [`docs/silas-score-system.md`](../silas-score-system.md) §3
2. Atualize a contagem por Tier na **Distribuição** do §3
3. Adicione ao `CATALOG` em `catalog.ts`, no bloco da Categoria, com `key` em inglês
4. Ajuste a contagem esperada em `catalog.test.ts`
5. `bun test`

Categoria nova exige também: entrada em `CategoryKey`, em `CATEGORIES`, e — se restringir algum Modificador — em `CATEGORY_COMPAT`.

## Checklist — Modificador novo

1. Spec: §5 (o que mede, Faixas ou bônus binário) e §6 (compatibilidade)
2. `types.ts`: `Modifier` e, se o chamador informa, `InformableModifier`
3. `tables.ts`: `MODIFIERS`, `MODIFIER_LABELS`, `BANDS` ou `BINARY_BONUS`, `CHANNEL_COMPAT` e — se restrito — `CATEGORY_COMPAT`. Derivado? também `DERIVED_MODIFIERS`
4. `score.ts`: nada, se for Graduado ou Binário comum. Derivado exige campo em `Derived`, ramo em `measureOf` e cálculo no `replay`
5. `parse.ts`: se for binário informável, entre em `BINARY`
6. Testes: fronteira de cada Faixa (abaixo e nela) e a linha da matriz §6.3
7. A tela não muda — o formulário se monta a partir de `allowedModifiers`

## Checklist — mudar um número

1. Mude na spec e em `tables.ts` no mesmo commit
2. Rode os testes: os golden do §10 vão quebrar de propósito se o número entrar no cálculo deles
3. Recalcule à mão os exemplos do §10 afetados e atualize spec e teste juntos
