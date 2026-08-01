# Architecture

## Componentes

| Camada | Onde | O que é |
|---|---|---|
| Core | `src/lib/core/` | O SSS. Funções puras: catálogo, tabelas de números, pontuação de uma Ocorrência, replay do log. Zero IO, zero framework |
| Servidor | `src/lib/server/` + `src/routes/**/+*.ts` | Validação do POST, SQL, as três rotas. Só aqui existe D1, header e `Date.now()` |
| Tela | `src/routes/+page.svelte` | Uma página, mobile-first. Formulário, Extrato fixo, Dia, Descartes |

A regra que sustenta o resto: **o Score não é persistido**. O banco guarda o log de Ocorrências; a pontuação é derivada por replay a cada `load`. Mudar um bônus é editar um número em `tables.ts` — não há migração, e todo Dia passado é reinterpretado pela regra nova.

## Fluxo de dados

**Leitura** (`GET /`):

```
todayInSaoPaulo() ──► WINDOW_SQL (today−5, + a linha anterior à janela)
                        │
                        ▼
                  rows ─► toOccurrence ─► replay(log, today)
                                             │  fold por Dia de calendário
                                             │  deriva gap / combo / ghostingDays
                                             │  chama scoreOccurrence por Ocorrência
                                             ▼
                                          DayResult { entries, discards, total,
                                                      classification, highlight }
```

**Escrita** (form action `POST /`):

```
formData ─► parseInput ─┬─ !ok ─► fail(400, { error })
                        └─ ok  ─► id = crypto.randomUUID()
                                  occurredAt = Date.now()
                                  day = todayInSaoPaulo(occurredAt)
                                  author = Cf-Access-Authenticated-User-Email
                                  INSERT_SQL ─► { id }   ◄── a tela fixa o Extrato por este id
```

**Atualização** (polling): a tela bate em `GET /token` a cada 5 s e no `focus` da janela; só chama `invalidateAll()` quando a string muda.

## As três rotas

| Rota | Arquivo | Faz |
|---|---|---|
| `GET /` | `src/routes/+page.server.ts` (`load`) | Lê a janela, faz replay, devolve `{ author, day }` |
| `POST /` | `src/routes/+page.server.ts` (`actions.default`) | Valida, carimba `id`/`occurred_at`/`day`/`author` no servidor, insere, devolve `{ id }` |
| `GET /token` | `src/routes/token/+server.ts` | `text/plain` com `"<today>:<max(rowid)>"`, `cache-control: no-store` |

Não há quarta rota e não há rota de remoção — ver [decisions.md](decisions.md).

## Dados

Uma tabela, definida em [`schema.sql`](../../schema.sql):

```sql
create table occurrences (
  id           text    primary key,   -- uuid gerado no servidor
  occurred_at  integer not null,      -- epoch ms, do servidor
  day          text    not null,      -- YYYY-MM-DD em America/Sao_Paulo, gravado
  event        text    not null,      -- chave do CATALOG
  channel      text    not null,      -- text | sticker | voice | meeting
  author       text    not null,      -- e-mail do Access
  measures     text    not null       -- JSON das medidas informadas
);
create index idx_occurrences_day on occurrences (day, occurred_at);
```

`day` é gravado, não derivado na leitura: a fronteira do Dia é decisão de fuso, e recalculá-la depois mudaria o passado ([ADR 0003](../adr/0003-estado-por-dia.md)).

## Mapa de arquivos

### `src/lib/core/types.ts`

Só tipos, nenhum valor.

- `Tier`, `Channel`, `CategoryKey`, `Modifier` — os quatro enums do domínio
- `InformableModifier` — as cinco medidas que o chamador informa; as outras três o SSS deriva
- `CatalogEvent` — `{ key, label, category, tier }`
- `Day` — `YYYY-MM-DD` em `America/Sao_Paulo`
- `Measures` — `Partial<Record<Modifier, number | boolean>>`
- `Occurrence` — o que é gravado e o que o core recebe
- `Derived` — `{ gapMinutes, comboNth, ghostingDays }`, os três Modificadores derivados já resolvidos
- `Discard`, `DiscardReason` — Modificador recebido e não pontuado, com o motivo
- `ReceiptLine`, `Receipt` — o Extrato: linhas que somam exatamente o `score`
- `Entry` — `{ occurrence, receipt }`
- `DayResult` — a saída do replay

### `src/lib/core/catalog.ts`

Transcrição do §3 da spec. Dados, não lógica.

- `CATEGORIES` — rótulo pt-BR de cada `CategoryKey`
- `CATALOG` — os 39 Eventos, chave em inglês e `label` em pt-BR
- `isEventKey(key)` — a chave existe no catálogo
- `eventOf(key)` — o Evento, ou lança
- `byCategory(category)` — os Eventos da Categoria, para o segundo select do formulário

### `src/lib/core/tables.ts`

Transcrição dos §4, §5, §6 e §8.3. Mudar um bônus é editar um número aqui.

- `CHANNELS`, `CHANNEL_LABELS`, `MODIFIERS`, `MODIFIER_LABELS`, `TIER_LABELS`
- `DERIVED_MODIFIERS` — `gap`, `combo`, `ghostingStreak`; informá-los é Descarte
- `BASE_SCORE` — 10 / 30 / 80 / 200 por Tier
- `CAP_MULTIPLIER` — 3; o Teto
- `Band`, `BANDS` — as Faixas dos seis Modificadores Graduados, cada uma um limite inferior
- `BINARY_BONUS` — `urgency` 0,4 e `outOfNowhere` 0,5
- `band(table, measure)` — a maior Faixa que a medida alcança, ou `undefined`
- `fitsChannel`, `fitsCategory` — os dois eixos de compatibilidade (§6.1, §6.2)
- `allowedModifiers(category, channel)` — a matriz §6.3, derivada dos dois eixos. **Fonte única**: consumida pelo `scoreOccurrence` e pelo formulário
- `CLASSIFICATIONS`, `classify(total)` — os limiares provisórios do §8.3

### `src/lib/core/score.ts`

O §9 da spec, passos 2 a 8. Não vê histórico: recebe os derivados prontos.

- `scoreOccurrence(occurrence, derived)` → `{ receipt, discards }`. Varre `MODIFIERS` duas vezes: uma para coletar Descarte, outra para montar as linhas. Aplica o Teto como linha própria negativa, para que as linhas continuem somando o `score`

### `src/lib/core/replay.ts`

A fold do §5 do design. Recebe o log ordenado por `day, occurred_at, id` e devolve o Dia corrente. Não sabe que existe janela de leitura.

- `addDays(day, n)` — aritmética de calendário em UTC sobre a string
- `replay(log, today)` → `DayResult`. Itera **Dias de calendário**, não só os presentes no log — um Dia vazio zera o contador de vácuo (§7.3). Acumula `lastBossAt` e `ghostingDays` (a Sequência) atravessando a virada; `combo` zera por Dia. Só o Dia corrente vira `entries`/`discards`

### `src/lib/server/parse.ts`

Fronteira de confiança do POST. Função pura, testável sem banco.

- `MEASURE_CAP` — 1000, teto sanitário; a Faixa satura muito antes
- `parseInput(fields)` → `{ ok: true, value } | { ok: false, error }`. Estrutural, não semântica: medida incompatível e medida derivada **passam**, porque são Descarte
- `todayInSaoPaulo(now?)` — o Dia, via `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })`

### `src/lib/server/window.ts`

SQL e conversão de linha. Nenhuma lógica de pontuação.

- `WINDOW_SQL` — os últimos 6 Dias mais a Ocorrência imediatamente anterior a eles, numa query só ([ADR 0005](../adr/0005-janela-de-leitura.md))
- `Row` — a linha crua do D1
- `toOccurrence(row)` — `Row` → `Occurrence`, com `JSON.parse` das medidas
- `TOKEN_SQL` — `select max(rowid) as top from occurrences`
- `INSERT_SQL`

### `src/routes/+page.server.ts`

- `db(platform)` — o binding, ou `error(500)`
- `authorOf(event)` — header do Access; em `dev`, fallback para `DEV_AUTHOR`; em produção, `error(401)`
- `load` — a leitura descrita acima
- `actions.default` — a escrita descrita acima

### `src/routes/token/+server.ts`

- `GET` — o change-token

### `src/routes/+page.svelte`

Svelte 5 runes. Uma coluna no celular, duas no desktop.

- `PLAUSIBLE` — tabela de plausibilidade só para destaque visual do Canal; não bloqueia nada
- `pinnedId` / `pinned` — o Extrato fixo, por `id` e não por objeto
- `measures` — `allowedModifiers(category, channel)` menos os derivados; é o que decide quais campos o formulário mostra
- `recent` — aviso de "já registrado por fulano há N min", janela de 5 min
- `$effect` do polling — `/token` a cada 5 s e no `focus`, `invalidateAll()` só na mudança

### `src/app.d.ts`

`App.Platform.env` — `DB: D1Database` e `DEV_AUTHOR?: string`.

## Layout do repositório

```
src/lib/core/      SSS puro          — sem framework, imports relativos
src/lib/server/    validação e SQL   — sem lógica de pontuação
src/routes/        as três rotas + a tela
schema.sql         a única tabela
wrangler.toml      binding do D1; workers_dev e preview_urls desligados
docs/adr/          decisões de domínio
docs/agents/       estes docs
```
