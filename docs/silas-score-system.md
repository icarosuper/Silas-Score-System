# Silas Score System — Especificação de Pontuação

O **Silas Score System** (SSS) recebe interações do chefe com o jogador e devolve
pontuação com discriminação de origem.

Este documento define **comportamento de pontuação**. Ele não fala de tecnologia,
não fala de plataforma e não fala de onde os dados vieram. Os termos usados aqui
estão definidos em [CONTEXT.md](../CONTEXT.md).

---

## 1. O que o Score significa

O Score mede **absurdo coletado**, não desempenho.

Um Score alto não é castigo — é troféu. O jogador *quer* que o chefe faça coisas
absurdas com ele, e quer que sejam absurdas do jeito mais espetacular possível.
É por isso que os Tiers usam vocabulário de raridade (`Lendário` é jackpot, não
sentença) e é por isso que **todo Modificador amplifica e nenhum reduz**.

A pressão de "não quero levar cobrança" existe no jogo, mas mora nas mecânicas de
tarefa — não aqui. O SSS é o placar cômico por cima.

### O que o Tier mede

Tier mede **intensidade do absurdo**, não frequência. O catálogo tem 8 Eventos
`Lendário` e 13 `Comum` — não é uma pirâmide de raridade. Com que frequência um
`Lendário` aparece em jogo depende inteiramente das taxas de disparo do simulador.

**Consequência que precisa estar dita:** o SSS não consegue se defender de um
simulador desbalanceado. Se o chefe disparar `Lendário` de hora em hora, nenhuma
curva de pontuação salva o balanceamento. Calibragem de raridade é responsabilidade
do simulador (ver §9, Não-escopo).

---

## 2. Entrada

O SSS recebe uma **Ocorrência** por vez, contendo:

| Campo | Descrição |
|---|---|
| Identificador | Identidade única desta Ocorrência. Usado para detectar duplicata |
| Evento | Qual entrada do catálogo (§3). Determina Categoria e Tier |
| Canal | `Texto`, `Figurinha`, `Voz` ou `Reunião` |
| Instante | Quando aconteceu |
| Medidas observadas | Os valores brutos dos Modificadores observáveis (abaixo) |

### Medidas que o chamador informa

| Modificador | Medida bruta |
|---|---|
| Risada | Quantidade de caracteres `s` na risada |
| Pontuação Excessiva | Tamanho da maior sequência de pontuação repetida |
| Urgência | Presente / ausente |
| Do nada | Presente / ausente |
| Enrolação | Minutos além do fim agendado da reunião |

### Medidas que o SSS deriva sozinho

Estas **não** vêm na entrada. O chamador não deve informá-las, e informá-las é
descartado.

| Modificador | Derivado de |
|---|---|
| Gap de Tempo | Instante da Ocorrência − instante da última mensagem do chefe (Sequência) |
| Combo | Contagem de Ocorrências da mesma Categoria no Registro do Dia |
| Sequência de Vácuo | Contador de Dias consecutivos de vácuo (Sequência) |

O motivo dessa divisão: janela de Combo, escala de Gap e escada de Vácuo são regras
de **pontuação**. Se o chamador as calculasse, existiriam duas fontes da verdade e
mudar uma faixa exigiria mudar dois sistemas.

**O SSS nunca recebe dados sobre o jogador** — nem presença, nem respostas, nem
atividade. Ele só vê o que o chefe fez. Isso é deliberado e é o que mantém a
superfície de entrada mínima.

---

## 3. Catálogo de Eventos

39 Eventos em 13 Categorias.

### Cobrança de Status

| Evento | Tier |
|---|---|
| Como estamos? | Comum |
| Tudo em casa? | Comum |
| Subiu? | Comum |

### Cobrança de Presença Online

| Evento | Tier |
|---|---|
| Migué? | Raro |
| Ainda off? | Épico |
| Sua entrada é xh certo? | Épico |
| Status está off | Épico |
| Ainda almoçando? | Lendário |
| Mandei mensagem xh, ainda estava off... | Lendário |

### Cobrança de Prazo

| Evento | Tier |
|---|---|
| Valendo grana? rsssss | Comum |
| Temos que tirar da frente | Comum |
| AMANHÃ????? | Raro |

### Cobrança em Call

| Evento | Tier |
|---|---|
| Problemas técnicos | Comum |
| Ligue a câmera | Raro |
| Você que está quieto | Épico |

### Chamada pra Reunião

| Evento | Tier |
|---|---|
| Chega aí... | Raro |

### Gafe

| Evento | Tier |
|---|---|
| Conversinha fiada...rsss | Comum |
| Web Settings | Raro |
| Recursos | Raro |
| Object Value | Épico |
| Warron | Lendário |
| A gente compra sua hora das 09hrs às 18hrs | Lendário |

### Vácuo

| Evento | Tier |
|---|---|
| Texto muito grande → pede call | Raro |
| Sabe que não vou ler nada... | Épico |
| Lá vem a bíblia... | Lendário |
| Não pode call → pede texto → manda texto → pede call | Lendário |

O último é **Evento irmão** do primeiro, não sua continuação. O SSS não valida se
um pressupõe o outro — decidir se um Evento pode acontecer é regra do simulador
(ver [ADR 0001](./adr/0001-fronteira-do-sss.md)). Se ambos ocorrerem no mesmo Dia,
os dois pontuam: o chefe fez duas coisas absurdas.

### Palavra Censurada

| Evento | Tier |
|---|---|
| Mas que m$#$@#$# | Comum |

### Figurinha

| Evento | Tier |
|---|---|
| Teta | Comum |
| Braço curto | Comum |

### Motivacional

| Evento | Tier |
|---|---|
| Desencana... | Comum |
| Relaxa... | Comum |
| Sei que trabalho muito | Épico |
| Somos profissionais | Épico |

Motivacional pontua positivo como tudo o mais. Um chefe dizendo "sei que trabalho
muito" é gafe de autoelogio — absurdo colecionável, não recompensa.

### Desmotivacional

| Evento | Tier |
|---|---|
| Silas... | Comum |
| Se alguém faz X, está roubando da empresa | Épico |
| Está de brincadeira??? | Épico |
| Isto não é uma democracia | Lendário |

### Esticar Reunião

| Evento | Tier |
|---|---|
| Esticar reunião | Raro |

### Ligação no Telefone

| Evento | Tier |
|---|---|
| Ligar no telefone | Lendário |

### Distribuição

| Tier | Eventos | Pontuação Base |
|---|---|---|
| Comum | 13 | 10 |
| Raro | 8 | 30 |
| Épico | 10 | 80 |
| Lendário | 8 | 200 |

Razões de 3× → 2,67× → 2,5×: a curva **desacelera no topo**, para que `Lendário`
não engula o resto do catálogo. Um `Lendário` vale 20 `Comum`.

---

## 4. Como os Modificadores compõem

```
Score = Pontuação Base × (1 + Σ bônus)
```

Soma de percentuais — **não** produto. Ver [ADR 0002](./adr/0002-soma-de-percentuais.md)
para o motivo, que é sutil e importante: no modelo multiplicativo, a contribuição de
cada Modificador depende da ordem em que você escolhe atribuí-la, então o Extrato
discriminado por Modificador seria impossível de produzir sem uma convenção
arbitrária.

Três propriedades caem de graça desse modelo:

1. **Ordem é irrelevante.** Não existe "ordem de aplicação" a especificar.
2. **Atribuição é exata.** A contribuição de um Modificador é `Base × bônus dele`,
   calculável isoladamente. Ela não muda porque outro Modificador está presente.
3. **Escala com o Tier.** `+40%` é proporcionalmente relevante num `Comum` e num
   `Lendário`. Um bônus fixo nunca conseguiria as duas coisas.

### Teto

```
Σ bônus efetivo ≤ 2,00      →      Score ≤ 3 × Pontuação Base
```

O Teto **não reduz o bônus declarado de nenhum Modificador**. Cada Modificador
mantém seu valor honesto no Extrato, e o corte aparece como linha própria. Escalar
os bônus proporcionalmente faria `Urgência` aparecer como `+18%` numa Ocorrência e
`+40%` em outra — exatamente o defeito que o modelo somativo existe para evitar.

| Tier | Base | Teto (3×) |
|---|---|---|
| Comum | 10 | 30 |
| Raro | 30 | 90 |
| Épico | 80 | 240 |
| Lendário | 200 | 600 |

**Modificadores furam a hierarquia de Tier, e isso é intencional.** Um `Raro`
carregado (90) vence um `Épico` pelado (80). Um `Épico` carregado (240) vence um
`Lendário` pelado (200). Um `AMANHÃ?????` às 23h48, urgente, com risada, é mais
memorável que um `Warron` solto no meio da tarde — e o Score diz isso.

### Arredondamento

- Cada linha do Extrato é arredondada para inteiro (meio para cima).
- O total é a **soma das linhas arredondadas**, nunca recalculado à parte.

Isso garante a invariante que dá sentido ao Extrato: **as linhas sempre fecham no
total.**

Efeito colateral aceito: o multiplicador exibido é o declarado (`1 + Σ bônus`), e o
total realizado pode divergir dele em alguns décimos por causa do arredondamento por
linha. Em `AMANHÃ?????` (§10.1) o multiplicador declarado é 1,95× e o total é 59 em
vez de 58,5. A invariante das linhas fechando vale mais que a do multiplicador
exato.

---

## 5. Os oito Modificadores

### Binários

| Modificador | Bônus | Condição |
|---|---|---|
| Urgência | **+40%** | A Ocorrência veio marcada como urgente |
| Do nada | **+50%** | Acionamento para reunião ou pedido de atendimento imediato, sem agendamento prévio |

`Do nada` é o binário mais caro porque destrói o planejamento do jogador com zero
aviso. `Urgência` é caro porque é escolha deliberada — o chefe *marcou*.

### Graduados

**Risada** — quantidade de caracteres `s`:

| Faixa | Medida | Bônus |
|---|---|---|
| Tique | 1–2 `s` | +10% |
| Deboche | 3–8 `s` | +20% |
| Escárnio | 9+ `s` | +35% |

**Pontuação Excessiva** — maior sequência repetida de `?`, `!` ou `.`:

| Faixa | Medida | Bônus |
|---|---|---|
| Ênfase | 2–3 | +10% |
| Ansiedade | 4–6 | +20% |
| Desespero | 7+ | +35% |

Risada e Pontuação Excessiva são o mesmo fenômeno formal — repetição de caractere
como intensificador — mas dizem coisas **opostas** sobre o chefe. `?????` é
impaciência: ele está tenso. `rsssss` é deboche: ele está relaxado *enquanto* te
cobra. Por isso são dois Modificadores e não um.

**Gap de Tempo** — desde a última mensagem do chefe:

| Faixa | Medida | Bônus |
|---|---|---|
| — | < 15 min | não aplica |
| Retomada | 15 min – 2 h | +15% |
| Reaparecimento | 2 h – 1 dia | +35% |
| Ressurreição | 1 – 3 dias | +60% |
| Assombração | 3+ dias | +90% |

**Combo** — a enésima Ocorrência da Categoria no Dia:

| Faixa | Medida | Bônus |
|---|---|---|
| — | 1ª | não aplica |
| Insistência | 2ª | +20% |
| Perseguição | 3ª–4ª | +45% |
| Assédio | 5ª+ | +75% |

Combo conta por **Categoria**, não por Evento. `Como estamos?` às 9h12,
`Tudo em casa?` às 9h31 e `Subiu?` às 9h48 são três Eventos diferentes da mesma
Categoria — e são obviamente o chefe te enchendo três vezes em 36 minutos.

O motivo é prático: **um simulador bem feito vai rotacionar as variações de
propósito.** Ninguém escreve um chefe que manda `Subiu?` três vezes com texto
idêntico — as três frases existem justamente para não parecer repetitivo. Se Combo
contasse por Evento, o simulador mataria a mecânica silenciosamente.

Combo afeta **somente a Ocorrência atual**. A 3ª vale `Base × (1 + 45%)`; a 1ª e a
2ª ficam com o Score que já tinham. Re-pontuar retroativamente faria o Total do Dia
mudar sozinho depois de o jogador já ter visto os números.

**Enrolação** — minutos além do fim agendado da reunião:

| Faixa | Medida | Bônus |
|---|---|---|
| — | até 5 min | não aplica |
| Alongada | 5–20 min | +20% |
| Sequestro | 20–60 min | +45% |
| Refém | 60+ min | +80% |

**Sequência de Vácuo** — Dias consecutivos de vácuo:

| Faixa | Medida | Bônus |
|---|---|---|
| — | 1 dia | não aplica |
| Reincidência | 2 dias | +25% |
| Fuga | 3–4 dias | +55% |
| Desaparecido | 5+ dias | +90% |

### Faixa sem bônus

Uma medida que cai fora de faixa (Gap de 8 minutos, Combo na 1ª Ocorrência) é
**compatível e medida**, mas contribui zero. Ela **não gera linha no Extrato** e
**não é Descarte** — simplesmente não aparece.

---

## 6. Compatibilidade

Nem todo Modificador se aplica a toda Ocorrência. A compatibilidade tem duas
fontes, e a maior parte dela é **derivada, não arbitrária**.

### 6.1 Derivada do Canal

`Risada` não se aplica a uma figurinha porque **não há texto onde procurar a
risada**. Não é gosto — é ausência de substrato.

| Modificador | Canais compatíveis | Porque |
|---|---|---|
| Risada | Texto | Precisa de texto |
| Pontuação Excessiva | Texto | Precisa de texto |
| Urgência | Texto, Figurinha | Flag é de mensagem, e figurinha é mensagem |
| Gap de Tempo | Texto, Figurinha, Voz | Reunião é interação contínua — não há silêncio a medir |
| Enrolação | Reunião | Só reunião tem duração a enrolar |
| Combo | todos | Contagem não depende de Canal |
| Do nada | todos | Ausência de agendamento não depende de Canal |
| Sequência de Vácuo | todos | Contagem de Dias não depende de Canal |

Canal é propriedade da **Ocorrência**, não da Categoria — ver
[ADR 0004](./adr/0004-canal-na-ocorrencia.md). A mesma Gafe pode ser escrita ou
falada, e a compatibilidade muda com ela.

### 6.2 Restrita por Categoria

Só duas restrições:

| Modificador | Categorias | Porque |
|---|---|---|
| Sequência de Vácuo | `Vácuo` | Definição |
| Do nada | `Chamada pra Reunião`, `Ligação no Telefone`, `Cobrança de Prazo` | São as únicas que **acionam** — as outras comentam, cobram ou debocham, mas não exigem que o jogador largue o que está fazendo |

`Cobrança de Status` fica fora de `Do nada` de propósito: cobrança de status nunca
é agendada, então ela seria "do nada" 100% das vezes. Um Modificador que sempre
dispara não é Modificador — é parte da Base.

### 6.3 Matriz resultante

Canal típico entre parênteses. `~` = depende do Canal da Ocorrência.

| Categoria | Risada | Pont. | Urg. | Gap | Combo | Enrol. | Do nada | Seq. Vácuo |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Cobrança de Status (Texto) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cobrança de Presença Online (Texto) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cobrança de Prazo (Texto/Reunião) | ~ | ~ | ~ | ~ | ✅ | ~ | ✅ | ❌ |
| Cobrança em Call (Reunião) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Chamada pra Reunião (Texto/Voz) | ~ | ~ | ~ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Gafe (qualquer) | ~ | ~ | ~ | ~ | ✅ | ~ | ❌ | ❌ |
| Vácuo (Texto) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Palavra Censurada (qualquer) | ~ | ~ | ~ | ~ | ✅ | ~ | ❌ | ❌ |
| Figurinha (Figurinha) | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Motivacional (qualquer) | ~ | ~ | ~ | ~ | ✅ | ~ | ❌ | ❌ |
| Desmotivacional (qualquer) | ~ | ~ | ~ | ~ | ✅ | ~ | ❌ | ❌ |
| Esticar Reunião (Reunião) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Ligação no Telefone (Voz) | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |

Uma figurinha da `Teta` marcada como urgente é tecnicamente coerente (figurinha é
mensagem) e é o ápice cômico do sistema. Fica ✅ de propósito.

### 6.4 O que acontece com o incompatível

**Incompatibilidade é rotina, não bug.** Se o sistema de mensagens do jogo tem flag
de urgente, o simulador vai anexar essa flag junto de tudo — inclusive de uma
figurinha. Ele não sabe (nem deve saber) que urgente não se aplica em toda parte.

Por isso o Modificador incompatível **não é erro**. Ele é ignorado e registrado como
**Descarte**, num canal separado do Extrato.

O SSS não consegue distinguir estas duas situações, e é por isso que nenhuma delas
pode ser tratada como falha:

1. O simulador observou um fato verdadeiro (a mensagem *era* urgente) que por acaso
   não importa neste Canal. Normal.
2. O simulador mandou `Enrolação` numa figurinha. Bug.

A separação resolve as duas: **o Extrato é o que o jogador vê, os Descartes são o
que o desenvolvedor vê.** O Extrato continua limpo e sempre fechando na soma. E se
num playtest `Enrolação` aparecer descartada 400 vezes, o bug fica visível.

---

## 7. Memória

### 7.1 Registro do Dia

A sequência de Ocorrências pontuadas no Dia corrente, na ordem observada. **Zera na
virada do Dia.**

Serve para derivar Combo (contagem por Categoria) e para produzir Total do Dia,
Classificação do Dia e Destaque do Dia.

### 7.2 Sequência

Dois escalares que **atravessam** a virada do Dia, porque a mecânica que depende
deles é definida em dias:

| Escalar | Uso |
|---|---|
| Dias consecutivos de vácuo | Alimenta `Sequência de Vácuo` |
| Instante da última mensagem do chefe | Alimenta `Gap de Tempo` |

O segundo existe porque o caso mais engraçado do Gap é justamente o noturno: o
chefe manda `Subiu?` às 23h47 e o Dia vira. Sem esse carry, a mensagem seguinte
pareceria a primeira do Dia e o Gap desapareceria — e é dele que dependem
`Ainda off?` e `Mandei mensagem xh, ainda estava off...`.

A Sequência **não guarda Ocorrências**. Ela é um par de números lido na abertura do
Dia e escrito no fechamento. Toda a complexidade de estado (ordenação, duplicata)
vive no Registro do Dia.

### 7.3 Como os Dias consecutivos de vácuo são contados

O SSS não recebe dados sobre o jogador, então não pode observar diretamente que ele
está ignorando o chefe. Ele deriva isso do próprio catálogo:

> **Um Evento da Categoria `Vácuo` pontuado no Dia é a evidência de que o jogador
> estava em vácuo naquele Dia.**

Duas regras:

- Na **primeira** Ocorrência de `Vácuo` de um Dia, incrementa o contador em 1.
- Ao **fechar** o Dia, se o Registro do Dia não contém nenhuma Ocorrência de
  `Vácuo`, o contador vai a 0.

Assim: Dia 1 com vácuo → 1. Dia 2 com vácuo → 2. Dia 3 sem vácuo → fecha em 0.
Dia 4 com vácuo → 1.

### 7.4 Integridade

O SSS é stateful e recebe Ocorrências uma a uma. Duas situações corrompem o estado:

| Situação | Tratamento |
|---|---|
| Identificador já processado | Ocorrência inteira vira Descarte, motivo `duplicada` |
| Instante anterior ao da última Ocorrência processada | Ocorrência inteira vira Descarte, motivo `retroativa` |

Isso não é preciosismo, e o motivo é específico: **o erro compõe.** Uma Ocorrência
duplicada não erra uma vez — ela **avança o contador de Combo**. A partir daí, toda
Ocorrência daquela Categoria pelo resto do Dia pontua numa faixa de Combo inflada.
Um reenvio às 9h contamina o Dia inteiro.

O SSS **não reordena** Ocorrências fora de ordem. Reordenar exigiria re-pontuar
Ocorrências anteriores, o que contradiz diretamente a regra de que Combo nunca
re-pontua o passado (§5).

---

## 8. Saída

### 8.1 Extrato da Ocorrência

Uma linha de Pontuação Base, uma linha por Modificador com bônus > 0, e a linha de
Teto quando ele morde. **As linhas somam exatamente o Score.**

```
Base (Raro)                              30
Pontuação Excessiva: Ansiedade  +20%    + 6
Urgência                        +40%    +12
Gap de Tempo: Reaparecimento    +35%    +11
────────────────────────────────────────────
Score                          1,95×     59
```

### 8.2 Nível do Dia

| Saída | Descrição |
|---|---|
| Total do Dia | Soma dos Scores do Registro do Dia |
| Classificação do Dia | A Faixa em que o Total cai. **Ao vivo** — ver o Dia subir de `Normal` pra `Pesado` às 14h é melhor que descobrir no fechamento |
| Destaque do Dia | A Ocorrência de maior Score no Dia |

### 8.3 Classificação do Dia — **limiares provisórios**

| Faixa | Total do Dia |
|---|---|
| Silêncio Suspeito | 0 – 299 |
| Dia Normal | 300 – 799 |
| Dia Pesado | 800 – 1.499 |
| Dia de Cão | 1.500 – 2.999 |
| Modo Silas | 3.000+ |

⚠️ **Estes são os únicos números deste documento que não são derivados de nada.**
Eles dependem de quantas Ocorrências o simulador dispara por Dia — informação que o
SSS não tem. Calibrar em playtest.

### 8.4 Canal de Descartes

Separado do Extrato. Cinco motivos:

| Motivo | Escopo |
|---|---|
| `canal-incompatível` | Um Modificador |
| `categoria-incompatível` | Um Modificador |
| `medida-derivada-informada` | Um Modificador (o chamador tentou informar Gap, Combo ou Sequência de Vácuo) |
| `duplicada` | A Ocorrência inteira |
| `retroativa` | A Ocorrência inteira |

Faixa sem bônus **não** é Descarte (§5).

---

## 9. Algoritmo

Para cada Ocorrência recebida:

1. **Integridade.** Identificador já processado → Descarte `duplicada`, encerra.
   Instante anterior ao último processado → Descarte `retroativa`, encerra.

2. **Pontuação Base.** Do Tier do Evento (§3).

3. **Modificadores derivados.** Calcula Gap de Tempo, Combo e Sequência de Vácuo a
   partir do Registro do Dia e da Sequência (§2, §7).

4. **Compatibilidade.** Para cada Modificador presente:
   - incompatível com o Canal → Descarte `canal-incompatível`
   - incompatível com a Categoria → Descarte `categoria-incompatível`
   - medida derivada informada pelo chamador → Descarte `medida-derivada-informada`

5. **Faixas.** Resolve a Faixa de cada Graduado e a presença de cada Binário. Bônus
   0 → não gera linha.

6. **Linhas.** Para cada Modificador com bônus > 0:
   `linha = arredonda(Base × bônus)`.

7. **Total livre.** `T = Base + Σ linhas`.

8. **Teto.** `T_max = Base × 3`. Se `T > T_max`, adiciona linha `Teto (3×)` com
   valor `T_max − T` (negativo) e o Score é `T_max`. Senão, Score é `T`.

9. **Estado.** Anexa a Ocorrência ao Registro do Dia. Atualiza o instante da última
   mensagem do chefe. Se for a primeira Ocorrência de `Vácuo` do Dia, incrementa os
   Dias consecutivos de vácuo.

10. **Saída.** Extrato, Total do Dia, Classificação do Dia, Destaque do Dia,
    Descartes.

Na virada do Dia: zera o Registro do Dia; se ele não tinha nenhuma Ocorrência de
`Vácuo`, zera os Dias consecutivos de vácuo. A Sequência sobrevive.

---

## 10. Exemplos trabalhados

### 10.1 Caso comum — `AMANHÃ?????`

`Cobrança de Prazo`, `Raro`, Canal `Texto`. Marcada como urgente. Última mensagem
do chefe foi ontem às 16h20; agora são 9h05.

| Linha | Bônus | Valor |
|---|---|---|
| Base (Raro) | | **30** |
| Pontuação Excessiva: Ansiedade (5 `?`) | +20% | +6 |
| Urgência | +40% | +12 |
| Gap de Tempo: Reaparecimento (~17h) | +35% | +11 |
| **Score** | **1,95×** | **59** |

`30 × 0,35 = 10,5 → 11`. Teto seria 90; não morde.

### 10.2 Combo e Vácuo — `Lá vem a bíblia...`

`Vácuo`, `Lendário`, Canal `Texto`. 2ª Ocorrência de `Vácuo` hoje. 3º Dia
consecutivo de vácuo. Mensagem anterior do chefe hoje às 10h12; agora 13h40.

| Linha | Bônus | Valor |
|---|---|---|
| Base (Lendário) | | **200** |
| Gap de Tempo: Reaparecimento (3h28) | +35% | +70 |
| Sequência de Vácuo: Fuga (3 dias) | +55% | +110 |
| Combo: Insistência (2ª) | +20% | +40 |
| **Score** | **2,10×** | **420** |

Teto seria 600; não morde.

### 10.3 Teto mordendo — `Sabe que não vou ler nada...`

`Vácuo`, `Épico`, Canal `Texto`. 5ª Ocorrência de `Vácuo` hoje, 5º Dia consecutivo,
urgente, com `rsssss` e `!!!`. Chefe calado há 3h.

| Linha | Bônus | Valor |
|---|---|---|
| Base (Épico) | | **80** |
| Risada: Deboche (5 `s`) | +20% | +16 |
| Pontuação Excessiva: Ênfase (3 `!`) | +10% | +8 |
| Urgência | +40% | +32 |
| Gap de Tempo: Reaparecimento | +35% | +28 |
| Combo: Assédio (5ª) | +75% | +60 |
| Sequência de Vácuo: Desaparecido (5 dias) | +90% | +72 |
| Total livre | 3,70× | 296 |
| **Teto (3×)** | | **−56** |
| **Score** | **3,00×** | **240** |

Σ bônus = 2,70, cortado em 2,00. Cada Modificador mantém seu bônus honesto no
Extrato; o corte é uma linha só.

### 10.4 Descartes — `Teta`

`Figurinha`, `Comum`, Canal `Figurinha`. O simulador anexou urgente (correto),
`Risada` (varreu texto que não existe) e `Enrolação` (bug). Chefe calado há 25 min.

**Extrato:**

| Linha | Bônus | Valor |
|---|---|---|
| Base (Comum) | | **10** |
| Urgência | +40% | +4 |
| Gap de Tempo: Retomada (25 min) | +15% | +2 |
| **Score** | **1,55×** | **16** |

**Descartes:**

| Modificador | Motivo |
|---|---|
| Risada | `canal-incompatível` |
| Enrolação | `canal-incompatível` |

`10 × 0,15 = 1,5 → 2`. Uma figurinha urgente vale 16.

---

## 11. Não-escopo

O que o SSS **deliberadamente não faz** — ver
[ADR 0001](./adr/0001-fronteira-do-sss.md):

| Não faz | Quem faz |
|---|---|
| Decide **se** um Evento pode acontecer, ou em que ordem | Simulador |
| Calibra com que frequência cada Tier aparece | Simulador |
| Conhece a **Fonte** (WhatsApp, Teams, e-mail, WhatsApp pessoal) | Ninguém — o SSS só vê Canal |
| Observa presença, respostas ou atividade do jogador | Ninguém — o SSS só vê o que o chefe fez |
| Pontua desempenho do jogador nas tarefas | Mecânica de tarefas |
| Aplica penalidade, ou qualquer Score negativo | Ninguém — o Score só sobe |
| Persiste, agrega ou compara Scores entre partidas | Fora deste documento |

O SSS **não sabe que WhatsApp existe**. Isso é a leitura forte de "agnóstico de
origem": ele não deve conhecer o inventário de plataformas do jogo, porque conhecer
significaria enumerá-las aqui e acoplar a pontuação a elas.

---

## 12. Decisões registradas

| ADR | Decisão |
|---|---|
| [0001](./adr/0001-fronteira-do-sss.md) | Fronteira do SSS: não valida plausibilidade, não conhece Fonte |
| [0002](./adr/0002-soma-de-percentuais.md) | Modificadores compõem por soma de percentuais, não por produto |
| [0003](./adr/0003-estado-por-dia.md) | Estado vive por Dia, com a Sequência atravessando a virada |
| [0004](./adr/0004-canal-na-ocorrencia.md) | Canal é propriedade da Ocorrência, não da Categoria |
