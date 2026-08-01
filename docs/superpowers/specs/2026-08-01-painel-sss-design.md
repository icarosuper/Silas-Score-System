# Painel do SSS — Design de Implementação

Este documento define **como construir** o Silas Score System. Ele não redefine
regra de pontuação nenhuma: comportamento vive em
[silas-score-system.md](../../silas-score-system.md), vocabulário vive em
[CONTEXT.md](../../../CONTEXT.md), e decisões de escopo vivem nos
[ADRs](../../adr/).

---

## 1. O que é o produto

Um **painel manual de placar**. Não existe simulador: quem produz as Ocorrências é
o Silas real, e quem as registra são as pessoas que trabalham com ele.

O §11 da spec diz que decidir *o que acontece* é do simulador. Aqui o simulador é a
vida — e o papel do painel é ser o marcador. Ele não gera Eventos, não infere nada de
texto e não julga: recebe o que uma pessoa observou e devolve o Extrato.

Público: um punhado de desenvolvedores, todos com experiência de backend e banco.
Placar único e compartilhado — o Score é do Silas, não de quem registra.

---

## 2. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Pacotes e testes | **Bun** | Test runner embutido; nenhuma config de Jest/Vitest |
| Framework | **Svelte 5** (runes) + **SvelteKit 2** + `adapter-cloudflare` | Adaptador oficial e fino — empacota os endpoints como Worker, sem camada de emulação |
| Estilo | **Tailwind** | Sem arquivo de CSS a manter |
| Banco | **Cloudflare D1** | SQLite serverless por *binding* — nenhuma string de conexão existe |
| Auth | **Cloudflare Access** | Identidade real sem uma linha de código — desde que o Worker exista só no domínio protegido (§9) |
| Deploy | **Wrangler** → Workers com static assets | Um artefato, domínio próprio |

Dependências de runtime além do framework: **nenhuma**. Sem ORM, sem biblioteca de
auth, sem roteador.

**Idioma:** código e banco em **inglês** — tabelas, colunas, tipos, funções,
identificadores. A **UI é em pt-BR**. Os nomes cômicos dos Eventos são rótulos de
exibição, não identificadores: o catálogo guarda chave em inglês e `label` em pt-BR,
e é a chave que vai pro banco.

```ts
{ key: 'still-at-lunch', label: 'Ainda almoçando?', category: 'online-presence', tier: 'legendary' }
```

### Alternativas rejeitadas

**Next.js na Cloudflare** exigiria `@opennextjs/cloudflare`, que reimplementa o
runtime do Next sobre Workers. O argumento que sustentava o Next eram Server Actions,
e com dois endpoints esse ganho desaparece.

**Frontend-only conectando direto no banco** (a página estática protegida só pelo
Access) foi rejeitada por dois motivos. O Access protege a página, não o banco: a
credencial iria no JS do cliente e um vazamento abriria o banco pra internet, já que
o endpoint é público. E o driver HTTP não faz transação interativa — pelo caminho
frontend-only se perderia a garantia que motivou usar um banco relacional.

**Vercel + Neon** era a alternativa viável. Perdeu porque o Access substitui dois
requisitos inteiros — senha compartilhada e cadastro de usuários — e o domínio já
está na Cloudflare.

**Redis/KV** não tem read-modify-write atômico de estado composto sem lock
artesanal.

---

## 3. A inversão que simplifica tudo

O banco guarda **somente o log bruto de Ocorrências**, append-only. Score, Combo,
Gap de Tempo, Sequência de Vácuo, Total do Dia, Classificação e Destaque são
**derivados por replay do log**, em memória, a cada leitura. Nada calculado é
persistido.

Isso é seguro porque o Instante é sempre o **agora do servidor**: o log é monotônico,
nada é inserido antes de uma linha existente, e um replay determinístico produz
exatamente os mesmos números que a pontuação incremental produziria. A regra do §5 —
Combo nunca re-pontua o passado — continua valendo, porque o passado nunca muda.

Quatro consequências:

- **Some a transação.** A escrita é um único `INSERT`, atômico em qualquer banco.
  Não há read-modify-write, logo não há corrida no Combo.
- **Some a tabela de Sequência.** Os dois escalares do §7.2 são deriváveis do log.
- **Somem duas classes de Descarte.** `retroativa` é impossível por construção:
  `replay` recebe o log já ordenado por instante, e uma Ocorrência "anterior à última
  processada" não existe nesse formato. `duplicada` sai por decisão de produto — o
  `id` nasce no servidor, então não existe chave de idempotência a comparar, e o
  duplo envio é barrado no formulário (§7). São as duas únicas regras da spec
  deliberadamente não codificadas.
- **Corrigir pontuação corrige o histórico.** Um bug de faixa some no próximo deploy,
  sem migração de dados.

O log é **estritamente append-only**: não há edição e não há remoção. Corrigir um
registro errado é `wrangler d1 execute`. Ver §10.

O SSS continua sendo o sistema stateful que a spec descreve. O que muda é onde o
estado mora: no log, não numa projeção.

---

## 4. Modelo de dados

Uma tabela.

```sql
create table occurrences (
  id           text    primary key,
  occurred_at  integer not null,
  day          text    not null,
  event        text    not null,
  channel      text    not null,
  author       text    not null,
  measures     text    not null
);

create index idx_occurrences_day on occurrences (day, occurred_at);
```

A tabela é `rowid` (nada de `without rowid`), e isso é requisito: o change-token do
polling é `max(rowid)` (§6).

| Coluna | Decisão |
|---|---|
| `id` | UUID gerado **no servidor** (`crypto.randomUUID()`) no momento do insert. Não é chave de idempotência: o duplo envio é barrado no formulário (§7), não no banco. Serve pra endereçar a linha e fixar o Extrato |
| `occurred_at` | Epoch ms, do **servidor**. O cliente nunca informa hora |
| `day` | `YYYY-MM-DD` em `America/Sao_Paulo`, **gravado** e não derivado — a fronteira do Dia é decisão de fuso, e congelá-la impede que uma mudança de timezone reescreva o passado. A Ocorrência das 23h47 fica no Dia em que aconteceu |
| `event` | Chave do catálogo. Categoria e Tier vêm dela, não da tabela |
| `author` | E-mail vindo do header do Access. É **metadado**: não entra no core e não altera Score |
| `measures` | JSON com as cinco medidas informáveis do §2. Colunas separadas dariam cinco `null` na maioria das linhas sem ganho de consulta |

O único índice, `(day, occurred_at)`, serve as duas metades da janela de leitura (§5) —
uma varredura em cada direção, porque `day` é monotônico com `occurred_at`. O
change-token do §6 não precisa de índice nenhum. Não há índice adicional a criar.

A ordenação canônica do log é `order by day, occurred_at, id`. O `id` é desempate: um
UUID não ordena por nada útil, mas dois inserts no mesmo milissegundo precisam de uma
ordem estável pro replay ser determinístico.

Não existe tabela de estado, de usuários nem de score.

---

## 5. O core

Zero IO, zero conhecimento de D1, HTTP ou Access. Duas funções.

```ts
replay(log: Occurrence[], today: Day): DayResult
```

Entra o log ordenado por instante; sai o Extrato de cada Ocorrência, os Descartes,
o Total do Dia, a Classificação, o Destaque e os Dias consecutivos de vácuo.
Internamente é uma fold com três acumuladores: contagem por Categoria no Dia,
instante da última mensagem do chefe, e o contador de vácuo.

**Dois parâmetros, não três.** `replay` recebe um log e não sabe que existe janela de
leitura: a mensagem anterior à janela chega como a primeira linha do log, não como um
argumento à parte. Ver [ADR 0005](../../adr/0005-janela-de-leitura.md).

**Toda** Ocorrência move o marcador de Gap, inclusive as de Canal `Reunião`. Isso é
contraintuitivo e vem do §9 da spec: `Gap de Tempo` é incompatível com `Reunião`
(não há silêncio a medir dentro de uma reunião), mas a reunião *aconteceu* — o chefe
não estava calado. Ela não pontua Gap e ainda assim zera o silêncio da próxima.

```ts
scoreOccurrence(occurrence: Occurrence, derived: Derived): { receipt, discards }
```

Não vê histórico. Recebe Gap, Combo e Sequência de Vácuo já resolvidos como números
e resolve Faixas, compatibilidade, Teto e arredondamento. É contra ela que os
exemplos §10 são testados, sem montar log nenhum.

### Janela de leitura

A rota consulta os **últimos 6 Dias de calendário mais a Ocorrência imediatamente
anterior a eles**, numa query só, e faz replay de tudo devolvendo o Dia corrente.

```sql
-- ?1 = today − 5. O primeiro ramo traz a mensagem anterior à janela: sem ela, o Gap
-- de Tempo da primeira Ocorrência da janela não teria de onde ser medido.
select * from (select * from occurrences where day < ?1 order by day desc, occurred_at desc, id desc limit 1)
union all
select * from occurrences where day >= ?1
order by day, occurred_at, id
```

Seis Dias (`today − 5`) é o que a maior Faixa de vácuo (`5+ dias`) exige, e é tudo o
que alguma regra olha pra trás: Combo é por Dia, e Total, Classificação e Destaque são
do Dia corrente. O que eles não cobrem é o Gap de Tempo, porque `Assombração (3+ dias)`
não tem limite superior — o Silas pode sumir um mês, e sem a linha anterior o caso mais cômico
do sistema, o chefe ressuscitando, sairia sem linha de Gap. Essa linha extra está a 6+
Dias de distância, logo fica fora do Dia corrente e nunca aparece na saída.

Os dois ramos usam o índice `(day, occurred_at)` do §4. As alternativas consideradas
— duas queries com um parâmetro de semente, e replay da tabela inteira — estão no
[ADR 0005](../../adr/0005-janela-de-leitura.md), junto do acoplamento que a linha extra
cria com "a saída é só o Dia corrente".

A fold itera **os Dias do calendário**, não só os Dias presentes no log. Um Dia sem
nenhuma Ocorrência não contém Ocorrência de `Vácuo`, logo zera o contador (§7.3). Se
iterasse só os dias com registro, um fim de semana silencioso preservaria a sequência
indevidamente.

A iteração começa no **primeiro Dia presente no log** — o Dia da linha extra, ou o
início da janela quando ela não existe — e não numa data fixa. Começar em `today − 5`
deixaria a linha extra fora do range iterado, e ela voltaria a ser um caso especial na
entrada da fold: a semente do ADR 0005 de novo, escondida no core em vez de declarada
na assinatura. Iterar os Dias vazios entre a linha extra e a janela não custa nada e
não muda nada — eles zeram o contador de vácuo, que é o que aconteceu de verdade.

### Organização

```
src/lib/core/
  types.ts          Tipos, enums, ids
  catalog.ts        Os 39 Eventos → chave, rótulo, Categoria, Tier
  tables.ts         Pontuação Base, Faixas, bônus, matriz de compatibilidade
  score.ts          Extrato de uma Ocorrência
  replay.ts         Fold sobre o log
```

`catalog.ts` e `tables.ts` são **dados**, não lógica: são a transcrição direta das
tabelas dos §3, §5 e §6 da spec. Mudar um bônus é editar um número.

Duas consequências de forma nessa transcrição:

**Faixa é um limite inferior, não um intervalo.** Cada Faixa é um par
`[medida mínima, bônus]`, e vale a maior Faixa que a medida alcança. A spec escrevia
os intervalos com as duas pontas (`5–20 min`, `20–60 min`), o que deixava seis
bordas ambíguas — 20 min é `Alongada` ou `Sequestro`? Com limite inferior a pergunta
não existe.

```ts
const band = (table, measure) => table.findLast(([min]) => measure >= min)
```

**A matriz de compatibilidade tem uma consumidora só.** `tables.ts` exporta
`allowedModifiers(category, channel): Modifier[]`, usada tanto pelo `scoreOccurrence`
quanto pelo formulário (§7). Transcrever a matriz do §6.3 duas vezes seria o mesmo "duas
fontes da verdade" que o §2 da spec usa pra justificar Gap, Combo e Vácuo serem
derivados.

---

## 6. Servidor

Três rotas, todas com `platform.env.DB`.

| Rota | Faz |
|---|---|
| `GET /` | Lê a janela (§5), faz replay, renderiza a página |
| `POST` registrar | Valida a Ocorrência, gera o `id`, carimba `occurred_at` e `day` do servidor, insere, **devolve o `id`** |
| `GET /token` | Devolve `"<today>:<max(rowid)>"` — uma linha lida |

O `id` de volta não é decoração: é com ele que a tela fixa o Extrato (§7). Como é uma
form action, ele chega pelo resultado do `use:enhance`.

### Validação

O corpo do POST é **fronteira de confiança**, mesmo atrás do Access: um formulário
desatualizado, um `curl` de desenvolvimento ou uma extensão de navegador entram pela
mesma porta. E o log é append-only — lixo que entra fica pra sempre.

O que a rota exige, rejeitando com `400` e sem gravar nada:

- `event` pertence ao catálogo, e `channel` ao enum de quatro valores;
- cada chave de `measures` é uma das cinco medidas informáveis do §2;
- cada medida numérica é inteira, `>= 0`, e tem teto sanitário. Uma Risada de 10 mil
  caracteres não é uma Ocorrência, é um campo colado errado; a Faixa satura muito
  antes disso, então o teto não muda pontuação nenhuma — só impede a linha absurda de
  existir no banco.

A validação é **estrutural, não semântica**. Medida incompatível com a Categoria ou o
Canal, e medida derivada informada, **não** são erro de rota: são Descarte, e o core
precisa recebê-las pra poder reportá-las (§6.4 da spec). Rejeitá-las aqui mataria o
bloco de Descartes da tela.

### A terceira rota existe por causa do free tier

O caminho óbvio era o polling chamar `invalidateAll()` a cada 5s, re-executando o
`load` do `GET /`. Isso relê a janela inteira **em toda batida**, e o D1 cobra por linha
lida: ~600 linhas × ~15 mil leituras/dia ≈ 9M linhas/dia, contra o teto de ~5M do free
tier. A janela do §5 mantém o replay barato; ela não impede que ele rode 15 mil vezes.

Como o log é **append-only**, o `rowid` mais alto é um change-token completo: ele é
estritamente crescente a cada `INSERT`, nada é editado e nada é removido, então mudou o
`max(rowid)` ⇔ existe Ocorrência nova. O `today` entra no token porque a virada do Dia
muda a saída com zero inserts — o Registro do Dia zera e o contador de vácuo pode cair
(§7.3).

```sql
select max(rowid) from occurrences
```

O `max()` de um `rowid` é o caso que o SQLite resolve lendo a última entrada da b-tree
da tabela: uma linha, sem índice e sem varredura. `max(occurred_at)` ou um
`order by ... limit 1` dariam a mesma resposta pagando ordenação ou dependendo do
planner — e nenhum dos dois é mais curto.

O polling bate em `/token` e só chama `invalidateAll()` quando o valor muda: ~15 mil
linhas lidas por dia em vez de 9M, e o replay roda ~100 vezes por dia em vez de 15 mil.
Sem isso a decisão do §5 não paga o próprio argumento de custo
([ADR 0005](../../adr/0005-janela-de-leitura.md)).

`rowid` só é confiável aqui porque não há `DELETE`: o SQLite reusa rowid de linha
apagada. Uma correção manual via `wrangler d1 execute` (§10) é a única exceção, e no pior
caso ela custa um refresh atrasado.

Não há quarta rota, e não há rota de remoção: o log é append-only.

O `author` sai do header `Cf-Access-Authenticated-User-Email`.

**Ruga conhecida:** o Access não roda local. Em desenvolvimento, se o header falta, o
`author` vem de uma variável em `.dev.vars`. O fallback é condicionado ao `dev` de
`$app/environment`, que é constante de build — o ramo é removido do bundle de
produção, não apenas não executado.

---

## 7. A tela

Uma página, **mobile-first** — o registro acontece no celular, no momento em que o
Silas apronta. Coluna única que se espalha em duas no desktop.

**Cabeçalho:** o e-mail autenticado. Sem tela de login, sem seleção de usuário.

**Registrar:**

1. **Categoria → Evento** — dois `<select>` nativos em cascata. Categoria tem 13
   opções, e a maior Categoria tem 6 Eventos, então nenhum picker passa de 13 itens.
   Um `<select>` único com os 39 seria uma roda de rolagem sofrível no celular, e uma
   lista com busca seria um componente a manter; o picker nativo do sistema é o melhor
   dos três em mobile e custa uma linha de template — o segundo select é um
   `{#each catalog[category]}`.

   Escolher a Categoria antes não é só ergonomia: o formulário **já precisa** dela
   pra chamar `allowedModifiers(category, channel)` e pra decidir se `Do nada`
   aparece. A cascata deixa a lógica mais direta, não menos.

   O atrito é saber que `Subiu?` é `Cobrança de Status` e `Temos que tirar da frente`
   é `Cobrança de Prazo`. Pra dez pessoas usando diariamente, isso vira memória
   muscular em uma semana. Se não virar, um `<datalist>` de busca direta por cima,
   preenchendo os dois selects, é aditivo.
2. **Canal** — quatro botões. Só os plausíveis em destaque, nenhum bloqueado.
3. **Medidas** — os campos vêm de `allowedModifiers(category, channel)` (§5), nunca de
   `if` escritos à mão. Quatro dos cinco informáveis dependem do **Canal**: Texto
   mostra Risada e Pontuação Excessiva, Figurinha e Texto mostram Urgência, Reunião
   mostra Enrolação. O quinto depende da **Categoria**: `Do nada` aparece em
   `Chamada pra Reunião`, `Ligação no Telefone` e `Cobrança de Prazo`, em qualquer
   Canal. Gap, Combo e Sequência de Vácuo **nunca** aparecem: são derivados, e
   informá-los é Descarte.

O botão desabilita enquanto o envio está em voo e o formulário limpa no sucesso.
É o que impede o duplo envio — sem isso, dois toques viram duas Ocorrências, e uma
Ocorrência a mais não erra uma vez: ela avança o Combo e contamina a Categoria pelo
resto do Dia (§7.4 da spec).

**Aviso de registro recente:** escolhido o Evento, se ele já foi registrado nos
últimos ~5 minutos, uma linha embaixo do botão diz por quem e há quanto tempo. Não
bloqueia — o Silas mandar `Subiu?` duas vezes em três minutos é precisamente o
absurdo que o Combo existe pra pontuar. O alvo é o outro caso: o Silas manda no
grupo, três pessoas veem, duas registram, e o placar conta um absurdo como dois. O
dado já está em memória pro replay, então é um `find`.

**Extrato:** o comprovante da **sua** última Ocorrência, linha a linha, fechando no
Score. Fica fixo até você registrar de novo — o polling atualiza o Dia, não o
comprovante. Se mostrasse a última de qualquer autor, seu Extrato sumiria em cinco
segundos quando outra pessoa registrasse; como o formulário limpa no sucesso e não
há Desfazer, ele é o único sinal de que você acertou o Evento.

**O Dia:** Total, Classificação ao vivo, Destaque, e a linha do tempo com autoria.
Atualiza por polling de ~5s no `/token` (§6) e ao focar a aba, para que os registros
dos outros apareçam. Token igual, nada a fazer — a página não é recarregada à toa.

**Descartes:** bloco recolhido. Com o formulário respeitando a matriz, o painel
praticamente nunca gera Descarte — o §6.4 existe porque um *simulador* não conhece a
matriz. As regras ficam no core de qualquer forma, e o bloco é voltado ao
desenvolvedor.

**Não existe Desfazer.** A versão anterior deste design tinha um, restrito ao próprio
autor e a 5 minutos, e ele parecia barato porque o Score é derivado — bastaria o
replay não ver a linha. Só que o efeito não é local: apagar a 1ª Ocorrência de uma
Categoria faz a 2ª virar 1ª e perder o `Insistência +20%` que a pessoa já tinha visto
no Extrato, e apagar qualquer linha alarga o Gap da seguinte. Isso é exatamente o que
o §5 da spec proíbe — *"o Total do Dia mudar sozinho depois de o jogador já ter visto
os números"*.

Fechar o buraco exigia condicionar o Desfazer a ser a **última linha do log**, de
qualquer autor — e aí quem registrasse um segundo antes de um colega perdia o direito
de corrigir o próprio erro. Removê-lo sai mais barato que as duas condições e deixa o
log append-only sem asterisco.

---

## 8. Testes

Escritos **antes** da implementação, direto da spec.

| Grupo | Cobre |
|---|---|
| Golden §10.1–10.4 | Os quatro exemplos trabalhados, número por número, incluindo os Descartes do 10.4 |
| Fronteiras de Faixa | Cada limite inferior duas vezes, um abaixo e nele: 2/3 `s`, 8/9 `s`, 14/15 min e 2 h de Gap, 4ª/5ª do Combo, 5/6 e 20/21 min de Enrolação |
| Teto e arredondamento | Teto mordendo (10.3) e não mordendo; a invariante de que **as linhas somam exatamente o Score** |
| Compatibilidade | A matriz §6.3 varrida: cada Modificador × cada Canal, mais as duas restrições por Categoria |
| Integridade | Só `medida-derivada-informada`. `duplicada` e `retroativa` não existem no core (§3) |
| Virada do Dia | Gap atravessando meia-noite (o caso das 23h47); reset do vácuo por Dia vazio; a escada 1→2→0→1 do §7.3 |
| Linha anterior à janela | Ela ancora o `Assombração` da primeira Ocorrência do Dia **e não aparece na saída**; os Dias vazios entre ela e a janela zeram o contador de vácuo (é o que fixa a fold iterando desde o primeiro Dia do log, §5); e o log vazio não produz Gap nenhum |
| Catálogo | Contagem por Tier bate com a Distribuição do §3: 13 / 8 / 10 / 8. Toda chave é única e todo `label` bate com a spec |
| Validação da rota | `event` e `channel` fora do enum, medida negativa, não-inteira, acima do teto e chave desconhecida — todos rejeitados. Medida incompatível e medida derivada **aceitas**, porque são Descarte e não erro (§6) |

O penúltimo impede que o catálogo saia de sincronia com a spec silenciosamente.

Nenhum grupo precisa de banco. Com `duplicada` fora do escopo, o core é função pura
de ponta a ponta, e a validação da rota é uma função pura exportada à parte que
recebe o corpo do POST e devolve `Occurrence` ou erro — o handler só a chama. `bun
test` basta: sem harness de D1, sem `wrangler dev` no CI.

Uma pedra: o `bun test` não resolve o alias `$lib` do SvelteKit. Como `src/lib/core/`
não importa nada do framework, os cinco arquivos se importam por caminho relativo e o
problema não aparece.

---

## 9. Operação

**Rodar local** — três passos, uma vez:

```
bun install
bun run db:init      # wrangler d1 execute DB --local --file=schema.sql
bun run dev
```

O D1 local é um arquivo SQLite em `.wrangler/state/`. Sem connection string, sem
Docker. Resetar o banco é apagar o arquivo.

**Deploy:**

```
bun run deploy
```

**Setup inicial da nuvem** — uma vez na vida:

1. `wrangler d1 create silas` → id no `wrangler.toml`
2. `bun run db:init:remote`
3. `bun run deploy`
4. No dashboard: apontar o domínio e criar a aplicação no Access com a lista de
   e-mails
5. Fechar o `workers.dev` — abaixo

Nenhuma variável de ambiente a gerenciar, nenhum segredo no repositório.

**O passo 5, que não pode faltar.** O Access é configurado por *hostname*, e o Wrangler
publica o Worker em `<nome>.<subdomínio>.workers.dev` por padrão — um segundo
endereço público, apontando pro mesmo Worker e pro mesmo D1, onde o Access não
existe. Por ali qualquer pessoa escreve no banco, assinando como quem quiser: o
header `Cf-Access-Authenticated-User-Email` só é confiável porque o Access o
sobrescreve, e onde o Access não está na frente ele é o que o cliente digitou.

```toml
# wrangler.toml
workers_dev  = false   # o hostname permanente de cortesia
preview_urls = false   # os hostnames por versão
```

Com o Worker existindo só no domínio protegido, não há JWT a validar. A alternativa
seria verificar `Cf-Access-Jwt-Assertion` contra o JWKS da equipe em toda
requisição — ~30 linhas e um cache de chaves pra comprar o que duas linhas de config
já compram. Perde-se as URLs de preview por versão, que este projeto não usa.

---

## 10. Fora de escopo

Além do que o §11 da spec já exclui:

| Não faz | Por quê |
|---|---|
| Detectar Eventos em texto colado | Contradiz a fronteira do [ADR 0001](../../adr/0001-fronteira-do-sss.md); o observador é humano |
| Ranking por pessoa | Mediria quem registra mais, não quem sofre mais. O placar é do Silas |
| Editar ou desfazer Ocorrência | O log é append-only (§3, §7). Registro errado é permanente — e `Migué?` (Raro, 30) e `Ainda almoçando?` (Lendário, 200) são vizinhos na mesma lista, então um toque errado custa 170 pontos que ninguém tira. Aceito: corrigir é `wrangler d1 execute`, e o custo de um placar de piada errado é uma piada errada |
| Detectar que duas pessoas registraram o mesmo absurdo | O aviso de registro recente (§7) reduz; nada impede. Distinguir "o Silas repetiu" de "dois viram a mesma coisa" exige saber o que o Silas fez, que é justamente o que o painel não sabe |
| Histórico de Dias anteriores na tela | O log guarda tudo; a tela mostra o Dia. Não é gratuito de adicionar: a linha extra da janela (§5) hoje só fica fora da saída porque a saída é o Dia corrente — ver [ADR 0005](../../adr/0005-janela-de-leitura.md) |
| Realtime por websocket | Polling de 5s resolve o caso |
| Calibrar os limiares de Classificação (§8.3) | Continuam provisórios até haver dados de uso |
