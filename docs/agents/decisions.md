# Decisions

Escolhas de implementação intencionais. **Leia antes de "consertar" um padrão que parece estranho.**

Decisões de domínio (o que o SSS é) vivem nos [ADRs](../adr/); decisões de stack e de recorte vivem no [design](../superpowers/specs/2026-08-01-painel-sss-design.md).

## 1. O Score não é persistido — é derivado por replay a cada requisição

O banco guarda o log de Ocorrências e nada mais: nenhuma coluna de score, nenhum agregado, nenhum estado de Sequência. Cada `load` relê a janela e refaz a fold.

Consequência que compensa o custo: mudar um bônus é editar um número em `tables.ts`. Sem migração, sem backfill, sem duas verdades. O passado é reinterpretado pela regra nova, e num placar de piada isso é a resposta certa. [ADR 0005](../adr/0005-janela-de-leitura.md)

## 2. A janela de leitura carrega a linha imediatamente anterior a ela

`WINDOW_SQL` é um `union all` de dois ramos: os últimos 6 Dias, mais **uma** linha anterior à janela.

Sem essa linha, o Gap de Tempo da primeira Ocorrência da janela não teria de onde ser medido, e a Faixa `Assombração` — o chefe ressuscitando depois de 3 dias — nunca pontuaria. Uma semente pré-agregada resolveria também, e foi rejeitada: seria estado derivado persistido, exatamente o que a decisão 1 evita.

O `limit 1` obriga o subselect (`select * from (select … limit 1)`): o SQLite não aceita `order by`/`limit` num ramo de compound select. Não é firula.

Ela **não aparece na saída** — o `replay` só emite o Dia corrente. É por isso que "histórico de Dias anteriores na tela" não é uma feature gratuita.

## 3. O `replay` itera Dias de calendário, não os Dias presentes no log

O loop vai de `log[0].day` até `today` somando um dia por vez, mesmo em Dias sem Ocorrência nenhuma.

Um Dia vazio **zera o contador de vácuo**: não conter Ocorrência de Vácuo é a definição de ter parado de dar vácuo (§7.3). Iterar só os Dias presentes no log puliria o Dia vazio e manteria a Sequência viva para sempre.

## 4. O contador de vácuo incrementa **antes** de pontuar

"3º Dia consecutivo" precisa ler 3 já na primeira Ocorrência de Vácuo do 3º Dia, não 2. Daí o `ghostingDays++` acontecer antes do `scoreOccurrence`, guardado pelo flag `sawGhosting` para incrementar uma vez por Dia.

E o reset do Dia corrente **não** acontece: `if (!sawGhosting && day !== today)`. O Dia de hoje ainda não virou; o contador fica pendente, que é justamente o valor de que a próxima Ocorrência de hoje vai precisar.

## 5. Toda Ocorrência move o marcador de Gap, inclusive as que não pontuam Gap

`lastBossAt` é atualizado fora de qualquer teste de compatibilidade. Uma Reunião não pontua Gap (o Modificador não é compatível com o Canal `meeting`), mas o chefe **não estava calado** — deixar o marcador parado inventaria um silêncio que não houve.

## 6. `0` e `false` são ausência de medida, não medida zero

`present()` em `score.ts`. Um formulário que envia `laughter=0` para todo campo escondido geraria um Descarte por campo, e o bloco de Descartes da tela viraria ruído. Zero não é uma risada de tamanho zero: é a ausência de risada.

## 7. O Teto é uma linha negativa no Extrato, não um `Math.min` silencioso

Quando `Σ` passa de 3× a Base, o corte entra como linha própria (`Teto (3×)`, valor `max − free`). O bônus declarado de cada Modificador continua visível e correto, e a invariante **as linhas somam exatamente o Score** sobrevive. Um clamp no final quebraria a soma e faria o jogador desconfiar da conta. [ADR 0002](../adr/0002-soma-de-percentuais.md)

## 8. A validação do POST é estrutural, não semântica

`parseInput` rejeita `event` fora do catálogo, `channel` fora do enum, chave desconhecida, não-inteiro, negativo e acima do teto sanitário. **Aceita** medida incompatível com o Canal ou a Categoria, e medida derivada informada.

Não é frouxidão: essas duas são **Descarte**, e o core precisa recebê-las para poder reportá-las (§6.4). Rejeitá-las na rota mataria o bloco de Descartes da tela — que é a única janela do desenvolvedor para "o formulário está mandando coisa que o SSS ignora".

## 9. `MEASURE_CAP = 1000` é sanitário, não regra

A maior Faixa de qualquer Modificador satura muito antes de 1000, então o teto **não muda pontuação nenhuma**. Ele só impede que uma linha absurda — uma risada de 10 mil caracteres, colada errada — exista no banco para sempre, já que o log é append-only.

## 10. Existe uma terceira rota (`/token`) só por causa do free tier do D1

O óbvio seria o polling chamar `invalidateAll()` a cada 5 s, re-executando o `load`. Isso relê a janela inteira a cada batida: ~600 linhas × ~15 mil batidas/dia ≈ 9M linhas/dia, contra o teto de ~5M do free tier.

Como o log é append-only, `max(rowid)` é change-token completo: estritamente crescente a cada `INSERT`, nada editado, nada removido. O `today` entra no token porque a virada do Dia muda a saída com zero inserts.

`max(rowid)` é o caso que o SQLite resolve lendo a última entrada da b-tree: uma linha, sem índice e sem varredura. Resultado: ~15 mil linhas/dia em vez de 9M, e o replay roda ~100 vezes/dia em vez de 15 mil.

**Corolário:** não adicione `DELETE`. O SQLite reusa rowid de linha apagada, e o token deixaria de ser monotônico. Correção manual via `wrangler d1 execute` é a exceção aceita — custa, no pior caso, um refresh atrasado.

## 11. Não há JWT a validar — a segurança está em duas linhas de `wrangler.toml`

```toml
workers_dev  = false
preview_urls = false
```

O `author` sai do header `Cf-Access-Authenticated-User-Email`, que só é confiável porque o Access o **sobrescreve**. O Access é configurado por hostname; se o Worker também existir em `*.workers.dev`, ali o header é o que o cliente digitou, e qualquer pessoa escreve no banco assinando como quem quiser.

Com o Worker existindo só no domínio protegido, verificar `Cf-Access-Jwt-Assertion` contra o JWKS seria ~30 linhas e um cache de chaves para comprar o que essas duas linhas já compram. Perde-se as URLs de preview por versão, que este projeto não usa.

## 12. O fallback de `author` em desenvolvimento é ramo de `dev`, não checagem de ambiente

```ts
if (dev) return platform?.env?.DEV_AUTHOR ?? 'dev@local'
```

`dev` de `$app/environment` é **constante de build**: o ramo é removido do bundle de produção, não apenas não executado. Um `process.env.NODE_ENV !== 'production'` deixaria o código lá, a um erro de configuração de distância de virar bypass de autenticação.

## 13. Os arquivos do core se importam por caminho relativo

`import { eventOf } from './catalog'`, não `$lib/core/catalog`. O `bun test` não resolve o alias do SvelteKit, e adicionar um plugin de resolução para o test runner é mais peça do que trocar cinco imports. Só funciona porque o core não depende do framework — o dia em que depender, este atalho cai junto.

## 14. `allowedModifiers` é a fonte única da matriz, consumida pelo formulário e pelo core

A tela não tem sua própria noção de "que campos mostrar": chama a mesma função que o `scoreOccurrence` usa para decidir o que pontua. Se as duas divergissem, o formulário ofereceria campos que o core descartaria em silêncio.

## 15. O Extrato é fixado por `id`, não por objeto

`pinnedId: string | null` em vez de guardar a `Entry`. Assim o polling reescreve o Dia inteiro sem mexer no comprovante que está na tela, e o comprovante ainda acompanha uma eventual correção de pontuação. A semente vem do `findLast` da própria pessoa, para o comprovante sobreviver a um refresh.

## 16. A tabela `PLAUSIBLE` na tela é enfeite, e está marcada como tal

Marcada com `ponytail:`. Ela só apaga visualmente os Canais implausíveis para uma Categoria — **não bloqueia nenhum**, e não tem autoridade nenhuma sobre pontuação. A matriz do §6.3 responde "que Modificador cabe neste Canal", não "que Canal faz sentido para esta Categoria"; no dia em que responder, esta tabela some.

## 17. Não há rota de edição nem de remoção

O log é append-only, e um registro errado é permanente. `Migué?` (Raro, 30) e `Ainda almoçando?` (Lendário, 200) são vizinhos na mesma lista, então um toque errado custa 170 pontos que ninguém tira.

Aceito conscientemente: corrigir é `wrangler d1 execute`, e o custo de um placar de piada errado é uma piada errada. O que se compra em troca é a decisão 10 inteira.
