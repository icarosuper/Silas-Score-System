# Silas Score System

O SSS transforma interações do chefe (Silas) com o jogador em pontuação. É a camada de placar cômico de um simulador de trabalho em escritório: não julga o desempenho do jogador, mede o absurdo que ele coletou.

Este arquivo é glossário. Números, faixas e regras de cálculo vivem em
[docs/silas-score-system.md](./docs/silas-score-system.md).

## Language

**Silas Score System (SSS)**:
O sistema que recebe interações já observadas e devolve pontuação com discriminação de origem. Não observa nada por conta própria e não sabe de onde os dados vieram.

**Score**:
Pontuação positiva acumulada pelo jogador. Mede absurdo coletado, não desempenho — quanto maior, melhor para o jogador.
_Evitar_: penalidade, dano, dedução

**Evento**:
Uma entrada do catálogo de interações que o chefe pode ter, identificada e classificada em um Tier. É a unidade mínima pontuável.
_Evitar_: mensagem, ação

**Ocorrência**:
Uma instância concreta de um Evento acontecendo: qual Evento, por qual Canal, em que instante, com quais medidas observadas. É o que o SSS recebe.
_Evitar_: instância, disparo, registro

**Categoria**:
O agrupamento a que um Evento pertence (`Gafe`, `Vácuo`, `Figurinha`...). É onde a compatibilidade estática com Modificadores é declarada, e é a unidade de contagem do Combo. Uma Categoria pode conter um único Evento.
_Evitar_: grupo, tipo, família, classe

**Tier**:
Classe de raridade de um Evento (`Comum`, `Raro`, `Épico`, `Lendário`). Determina a Pontuação Base. Mede intensidade do absurdo, não frequência de ocorrência — com que frequência um Tier aparece em jogo é decisão do simulador, não do SSS.
_Evitar_: nível, severidade, gravidade

**Pontuação Base**:
O Score que um Evento vale antes de qualquer Modificador, derivado exclusivamente do seu Tier. Todos os Eventos de um mesmo Tier têm a mesma Pontuação Base.
_Evitar_: valor bruto, score inicial

**Canal**:
Por onde a Ocorrência chegou (`Texto`, `Figurinha`, `Voz`, `Reunião`). É propriedade da Ocorrência, não da Categoria — a mesma Gafe pode ser escrita ou falada. Determina a compatibilidade dos Modificadores que dependem de haver texto, mensagem ou reunião.
_Evitar_: meio, plataforma, fonte, origem

## Modificadores

**Modificador**:
Uma condição observada junto à Ocorrência que altera seu Score. Sempre amplifica — nunca reduz. Não todo Modificador é compatível com toda Ocorrência.
_Evitar_: bônus, multiplicador (é um tipo de Modificador, não sinônimo)

**Modificador Binário**:
Modificador que só tem dois estados — presente ou ausente — e contribui um bônus fixo.
_Evitar_: flag, booleano

**Modificador Graduado**:
Modificador cuja contribuição cresce conforme uma medida observada (tempo, contagem, duração). Nunca é contínuo: a medida sempre cai numa Faixa.
_Evitar_: escalar, progressivo

**Faixa**:
Um intervalo nomeado da medida de um Modificador Graduado, ao qual corresponde um bônus único. O nome da Faixa aparece no Extrato.
_Evitar_: bucket, nível, degrau, tier (reservado para Eventos)

**Teto**:
O limite máximo do multiplicador de uma Ocorrência. Corta o Score final sem alterar o bônus declarado de cada Modificador — aparece como linha própria no Extrato.
_Evitar_: cap, limite, clamp

### Os oito Modificadores

**Risada**:
Quantos caracteres `s` a risada do chefe tem no texto (`rs`, `rsssss`, `rssssssssssss`). Mede deboche.
_Evitar_: rsssss (é a grafia, não o nome do Modificador), gargalhada

**Pontuação Excessiva**:
O tamanho da maior sequência de pontuação repetida no texto (`?????`, `!!!!!`, `.......`). Mede impaciência.
_Evitar_: exclamação, interrogação, ênfase

**Urgência**:
A Ocorrência veio marcada com a flag de urgente. Mede escolha deliberada do chefe.
_Evitar_: prioridade, importante

**Gap de Tempo**:
Quanto tempo o chefe passou calado antes desta Ocorrência, medido do instante da mensagem anterior dele. Não mede nada sobre o jogador.
_Evitar_: atraso, demora, tempo de resposta, silêncio do jogador

**Combo**:
Quantas Ocorrências da mesma Categoria já foram pontuadas no Dia. Afeta apenas a Ocorrência atual — nunca re-pontua as anteriores.
_Evitar_: streak, repetição, sequência (reservado para a memória)

**Enrolação**:
Quantos minutos a reunião passou do fim agendado.
_Evitar_: atraso, extensão, overtime

**Do nada**:
O chefe aciona o jogador para uma reunião ou faz um pedido de atendimento imediato sem agendamento prévio. Mede ausência de aviso, não tempo.
_Evitar_: surpresa, súbito, imprevisto

**Sequência de Vácuo**:
Quantos Dias consecutivos o jogador vem ignorando o chefe. Único Modificador que consome a Sequência, e único restrito a uma só Categoria.
_Evitar_: vácuo acumulado, streak de vácuo

## Memória

**Dia**:
O dia do calendário in-game. É a fronteira de vida do Registro do Dia e a unidade de agregação do Score.
_Evitar_: sessão, jornada, turno

**Registro do Dia**:
A sequência de Ocorrências já pontuadas no Dia corrente, na ordem em que foram observadas. É o que permite deduzir Combo e Gap de Tempo dentro do Dia. Zera na virada do Dia.
_Evitar_: ledger, histórico, log

**Sequência**:
Os dois contadores escalares que atravessam a virada do Dia, porque a mecânica que depende deles é definida em dias: os Dias consecutivos de vácuo e o instante da última mensagem do chefe. Não guarda Ocorrências.
_Evitar_: streak, carry, estado persistente

## Saída

**Extrato**:
A saída do SSS para uma Ocorrência: a linha de Pontuação Base, uma linha por Modificador aplicado e, quando existe, a linha de Teto. As linhas somam exatamente o Score final.
_Evitar_: breakdown, detalhamento, resultado

**Descarte**:
Um Modificador ou uma Ocorrência inteira que o SSS recebeu e não pontuou, acompanhado do motivo. Vive num canal separado do Extrato: o Extrato é o que o jogador vê, os Descartes são o que o desenvolvedor vê.
_Evitar_: erro, rejeição, warning

**Total do Dia**:
A soma dos Scores de todas as Ocorrências do Registro do Dia.
_Evitar_: pontuação diária, placar

**Classificação do Dia**:
A Faixa nomeada em que o Total do Dia cai (`Dia Pesado`, `Dia de Cão`...). Atualiza ao vivo conforme o Dia avança.
_Evitar_: rank, nível, título

**Destaque do Dia**:
A Ocorrência de maior Score no Registro do Dia.
_Evitar_: melhor evento, MVP, highlight
