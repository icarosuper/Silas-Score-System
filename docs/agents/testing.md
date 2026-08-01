# Testing

`bun:test`, `test()` no topo do arquivo — sem `describe`, sem mock, sem fixture, sem banco. O teste fica ao lado do arquivo: `score.ts` → `score.test.ts`.

```sh
bun test
bun test src/lib/core/replay.test.ts
bun test -t 'Teto'
```

## Por que nada precisa de banco

O core é função pura de ponta a ponta e a validação do POST é uma função pura exportada à parte (`parseInput`) que o handler só chama. Sobra o SQL — e ele é testado contra um SQLite **em memória** criado no próprio teste (`window.test.ts`), não contra o D1. Não há harness de D1 nem `wrangler dev` no CI.

As três rotas não têm teste próprio: cada uma é `validar → chamar puro → responder`, e as três peças já estão cobertas.

## Os grupos

| Arquivo | Cobre |
|---|---|
| `catalog.test.ts` | O catálogo bate com o §3 da spec: 39 Eventos em 13 Categorias, contagem por Tier 13/8/10/8, chave e rótulo únicos |
| `tables.test.ts` | Os números do §5 e a matriz do §6 varrida célula a célula: cada Modificador × cada Canal, mais as duas restrições por Categoria |
| `score.test.ts` | Os quatro goldens do §10, número por número; fronteiras de Faixa; Teto mordendo e não mordendo; arredondamento; Descartes |
| `replay.test.ts` | Virada do Dia, Combo por Categoria, escada de vácuo 1→2→0→1, a linha anterior à janela, Total/Classificação/Destaque |
| `parse.test.ts` | Rejeição estrutural, e o que **não** é rejeitado: medida incompatível e medida derivada passam, porque são Descarte |
| `window.test.ts` | O `WINDOW_SQL` contra SQLite em memória: os dois ramos, a ordem canônica, o change-token crescente, o índice sendo usado |

## Invariantes que todo teste novo deve preservar

- **As linhas do Extrato somam exatamente o Score**, com e sem Teto. Se uma linha nova quebrar isso, a linha está errada, não o teste
- **Faixa sem bônus não gera linha e não é Descarte** — medida presente abaixo do primeiro limite simplesmente não pontua
- **`0` e `false` são ausência**, não medida zero
- **A linha anterior à janela não aparece na saída** — ela só ancora o Gap

## Escrevendo teste novo

Vem da spec, antes da implementação. Faixa nova exige **dois** casos por limite: um abaixo e um nele. Golden novo se escreve com o número calculado à mão a partir do §4, nunca copiado da saída do código.
