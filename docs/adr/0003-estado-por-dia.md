# Estado vive por Dia, com a Sequência atravessando a virada

O SSS é stateful: recebe Ocorrências uma a uma e mantém o **Registro do Dia**, que
zera na virada do Dia. Dois escalares — Dias consecutivos de vácuo e instante da
última mensagem do chefe — **atravessam** a virada, formando a **Sequência**.

Os dois tempos de vida parecem acidente. São escolha.

## Considered Options

**Função pura sobre lote.** O SSS receberia a sequência cronológica de Ocorrências e
devolveria o Score de cada uma. Determinístico, testável sem montar estado, e
resolveria os cross-day de graça. Rejeitado porque num jogo ao vivo as Ocorrências
chegam uma a uma, conforme acontecem — não existe lote natural, e inventar um
significaria o jogo bufferizar eventos só para satisfazer o formato de chamada.

**Função pura sem memória**, com o chamador informando `combo: 3`, `gap: 45min`,
`dia_consecutivo: 4`. Rejeitado porque janela de Combo, escala de Gap e escada de
Vácuo são regras de *pontuação*: o jogo passaria a precisar conhecê-las, e mudar uma
faixa exigiria mudar dois sistemas.

**Estado por partida** (nunca zera, com "Dia" sendo só um recorte de leitura).
Rejeitado em favor do reset diário, ao custo de precisar da Sequência.

## Consequences

O reset diário deixaria dois fatos órfãos, e a Sequência existe exatamente para
adotá-los:

- **Dias consecutivos de vácuo** é definicionalmente cross-day. Sem carry, a mecânica
  morre.
- **Instante da última mensagem do chefe** sustenta o caso mais engraçado do Gap: o
  chefe manda `Subiu?` às 23h47 e o Dia vira. Sem carry, a mensagem seguinte
  pareceria a primeira do Dia e o Gap desapareceria — justamente onde vivem
  `Ainda off?` e `Mandei mensagem xh, ainda estava off...`.

A Sequência **não é um ledger**: são dois números, lidos na abertura do Dia e
escritos no fechamento. Toda a complexidade real de estado fica no Registro do Dia.

Como o SSS não recebe dados sobre o jogador ([ADR 0001](./0001-fronteira-do-sss.md)),
o contador de vácuo é derivado do próprio catálogo: **uma Ocorrência da Categoria
`Vácuo` pontuada no Dia é a evidência de que o jogador estava em vácuo naquele Dia.**

Ser stateful obrigou a especificar integridade, que uma função pura não precisaria:
Ocorrência duplicada e Ocorrência retroativa viram Descarte. Não é preciosismo —
uma duplicata avança o contador de Combo e contamina todas as Ocorrências daquela
Categoria pelo resto do Dia. O erro compõe.

O SSS **não reordena** Ocorrências fora de ordem, porque reordenar exigiria
re-pontuar o passado — o que contradiz a regra de que Combo afeta somente a
Ocorrência atual.
