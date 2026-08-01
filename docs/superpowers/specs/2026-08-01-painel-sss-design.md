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
| Framework | **SvelteKit 5** (runes) + `adapter-cloudflare` | Adaptador oficial e fino — empacota os endpoints como Worker, sem camada de emulação |
| Estilo | **Tailwind** | Sem arquivo de CSS a manter |
| Banco | **Cloudflare D1** | SQLite serverless por *binding* — nenhuma string de conexão existe |
| Auth | **Cloudflare Access** | Identidade real sem uma linha de código |
| Deploy | **Wrangler** → Workers com static assets | Um artefato, domínio próprio |

Dependências de runtime além do framework: **nenhuma**. Sem ORM, sem biblioteca de
auth, sem roteador.

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
- **Some a classe de Descarte `retroativa`.** Impossível por construção, e por isso
  o core **não a implementa**: `replay` recebe o log já ordenado por instante, e uma
  Ocorrência "anterior à última processada" não existe nesse formato. É a única
  regra da spec deliberadamente não codificada, e o motivo é este parágrafo.
- **Corrigir pontuação corrige o histórico.** Um bug de faixa some no próximo deploy,
  sem migração de dados.

O SSS continua sendo o sistema stateful que a spec descreve. O que muda é onde o
estado mora: no log, não numa projeção.

---

## 4. Modelo de dados

Uma tabela.

```sql
create table ocorrencias (
  id        text    primary key,
  instante  integer not null,
  dia       text    not null,
  evento    text    not null,
  canal     text    not null,
  autor     text    not null,
  medidas   text    not null
);

create index idx_ocorrencias_dia on ocorrencias (dia, instante);
```

| Coluna | Decisão |
|---|---|
| `id` | UUID gerado **no cliente** ao abrir o formulário. O `primary key` implementa o Descarte `duplicada` (§7.4) de graça: duplo clique e retry batem na constraint e não inserem |
| `instante` | Epoch ms, do **servidor**. O cliente nunca informa hora |
| `dia` | `YYYY-MM-DD` em `America/Sao_Paulo`, **gravado** e não derivado — a fronteira do Dia é decisão de fuso, e congelá-la impede que uma mudança de timezone reescreva o passado. A Ocorrência das 23h47 fica no Dia em que aconteceu |
| `evento` | Chave do catálogo. Categoria e Tier vêm dele, não da tabela |
| `autor` | E-mail vindo do header do Access. É **metadado**: não entra no core e não altera Score |
| `medidas` | JSON com as cinco medidas informáveis do §2. Colunas separadas dariam cinco `null` na maioria das linhas sem ganho de consulta |

Não existe tabela de estado, de usuários nem de score.

---

## 5. O core

Zero IO, zero conhecimento de D1, HTTP ou Access. Duas funções.

```ts
replay(ocorrencias: Ocorrencia[], hoje: Dia): ResultadoDia
```

Entra o log ordenado por instante; sai o Extrato de cada Ocorrência, os Descartes,
o Total do Dia, a Classificação, o Destaque e os Dias consecutivos de vácuo.
Internamente é uma fold com três acumuladores: contagem por Categoria no Dia,
instante da última mensagem do chefe, e o contador de vácuo.

```ts
pontuar(ocorrencia: Ocorrencia, derivadas: Derivadas): { extrato, descartes }
```

Não vê histórico. Recebe Gap, Combo e Sequência de Vácuo já resolvidos como números
e resolve Faixas, compatibilidade, Teto e arredondamento. É contra ela que os
exemplos §10 são testados, sem montar log nenhum.

### Janela de leitura

A rota consulta os **últimos 10 Dias de calendário** e faz replay de tudo, devolvendo
o Dia corrente. Dez dias cobrem com folga a maior faixa de vácuo (`5+ dias`), e o
volume é de dezenas de linhas.

A fold itera **os Dias do calendário**, não só os Dias presentes no log. Um Dia sem
nenhuma Ocorrência não contém Ocorrência de `Vácuo`, logo zera o contador (§7.3). Se
iterasse só os dias com registro, um fim de semana silencioso preservaria a sequência
indevidamente.

### Organização

```
src/lib/core/
  tipos.ts          Tipos, enums, ids
  catalogo.ts       Os 39 Eventos → Categoria + Tier
  tabelas.ts        Pontuação Base, Faixas, bônus, matriz de compatibilidade
  pontuar.ts        Extrato de uma Ocorrência
  replay.ts         Fold sobre o log
```

`catalogo.ts` e `tabelas.ts` são **dados**, não lógica: são a transcrição direta das
tabelas dos §3, §5 e §6 da spec. Mudar um bônus é editar um número.

---

## 6. Servidor

Duas rotas, ambas com `platform.env.DB`.

| Rota | Faz |
|---|---|
| `GET /` | Lê 10 Dias, faz replay, renderiza a página |
| `POST` registrar | Valida a Ocorrência, carimba `instante` e `dia` do servidor, insere, redireciona |
| `POST` desfazer | Apaga uma linha, sob as condições do §7 |

O `autor` sai do header `Cf-Access-Authenticated-User-Email`.

**Ruga conhecida:** o Access não roda local. Em desenvolvimento, se o header falta, o
autor vem de uma variável em `.dev.vars`. O fallback é condicionado a `dev` e nunca
alcança produção.

---

## 7. A tela

Uma página, **mobile-first** — o registro acontece no celular, no momento em que o
Silas apronta. Coluna única que se espalha em duas no desktop.

**Cabeçalho:** o e-mail autenticado. Sem tela de login, sem seleção de usuário.

**Registrar:**

1. **Evento** — lista agrupada por Categoria, com busca. É o campo grande: escolher
   entre 39 é o gesto principal.
2. **Canal** — quatro botões. Só os plausíveis em destaque, nenhum bloqueado.
3. **Medidas** — os campos aparecem conforme a compatibilidade do Canal e da
   Categoria escolhidos (§6.3). Figurinha mostra só urgente; Reunião mostra
   Enrolação; Texto mostra Risada e Pontuação Excessiva. Gap, Combo e Sequência de
   Vácuo **nunca** aparecem: são derivados, e informá-los é Descarte.

**Extrato:** o comprovante da última Ocorrência, linha a linha, fechando no Score.

**O Dia:** Total, Classificação ao vivo, Destaque, e a linha do tempo com autoria.
Atualiza por polling de ~5s e ao focar a aba, para que os registros dos outros
apareçam.

**Descartes:** bloco recolhido. Com o formulário respeitando a matriz, o painel
praticamente nunca gera Descarte — o §6.4 existe porque um *simulador* não conhece a
matriz. As regras ficam no core de qualquer forma, e o bloco é voltado ao
desenvolvedor.

**Desfazer:** botão presente apenas na Ocorrência que o próprio autor registrou, e
apenas nos 5 minutos seguintes. Cobre o caso real — errou o Evento e percebeu na hora
— sem virar edição de histórico. Apagar é barato porque o Score é derivado: o replay
seguinte simplesmente não vê a linha.

---

## 8. Testes

Escritos **antes** da implementação, direto da spec.

| Grupo | Cobre |
|---|---|
| Golden §10.1–10.4 | Os quatro exemplos trabalhados, número por número, incluindo os Descartes do 10.4 |
| Fronteiras de Faixa | Cada limite duas vezes: 2 e 3 `s`, 8 e 9 `s`, 14 e 15 min, 4ª e 5ª do Combo, 5 e 6 min de Enrolação |
| Teto e arredondamento | Teto mordendo (10.3) e não mordendo; a invariante de que **as linhas somam exatamente o Score** |
| Compatibilidade | A matriz §6.3 varrida: cada Modificador × cada Canal, mais as duas restrições por Categoria |
| Integridade | `medida-derivada-informada` no core. `duplicada` é da rota, não do core: teste de integração que insere o mesmo `id` duas vezes e verifica que o log tem uma linha só |
| Virada do Dia | Gap atravessando meia-noite (o caso das 23h47); reset do vácuo por Dia vazio; a escada 1→2→0→1 do §7.3 |
| Catálogo | Contagem por Tier bate com a Distribuição do §3: 13 / 8 / 10 / 8 |

O último impede que o catálogo saia de sincronia com a spec silenciosamente.

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

Nenhuma variável de ambiente a gerenciar, nenhum segredo no repositório.

---

## 10. Fora de escopo

Além do que o §11 da spec já exclui:

| Não faz | Por quê |
|---|---|
| Detectar Eventos em texto colado | Contradiz a fronteira do [ADR 0001](../../adr/0001-fronteira-do-sss.md); o observador é humano |
| Ranking por pessoa | Mediria quem registra mais, não quem sofre mais. O placar é do Silas |
| Editar Ocorrência | Só desfazer. Editar exigiria distinguir correção de reescrita |
| Histórico além de 10 Dias na tela | O log guarda tudo; a tela mostra o Dia |
| Realtime por websocket | Polling de 5s resolve o caso |
| Calibrar os limiares de Classificação (§8.3) | Continuam provisórios até haver dados de uso |
