# Modificadores compõem por soma de percentuais, não por produto

O Score de uma Ocorrência é `Pontuação Base × (1 + Σ bônus)`. Bônus multiplicativos
empilhados (`Base × 1,4 × 1,6 × 1,25`) foram rejeitados, apesar de serem o padrão em
jogos. O motivo é que **o modelo multiplicativo é incompatível com o Extrato
discriminado por Modificador**, que é o requisito de saída do sistema.

## Considered Options

**Produto (`Base × Π fatores`).** É o que quase todo sistema de pontuação de jogo
faz, e é o que um leitor deste documento vai propor. O problema: em
`200 × 1,4 × 1,6 × 1,25 = 560`, quanto contribuiu o fator `1,4`? Se aplicado
primeiro, +80. Se por último, +160. A contribuição de cada Modificador depende da
ordem em que se escolhe atribuí-la, e essa ordem é arbitrária. Produzir um Extrato
exigiria inventar uma convenção de atribuição e explicá-la ao jogador.

**Soma de valores fixos (`Base + Σ valores`).** Atribuição exata, mas um `+5` é
enorme num Comum (10) e irrelevante num Lendário (200). Um bônus fixo não consegue
ser proporcionalmente relevante nos dois extremos da curva de Tier.

**Retornos decrescentes** (ordenar bônus e aplicar 100%, 75%, 50%...) foi rejeitado
pelo mesmo motivo que o produto: `Risada` apareceria como `+20%` numa Ocorrência e
`+10%` em outra, porque seu valor passaria a depender de quem mais está na lista.

## Consequences

Três propriedades caem de graça: ordem de aplicação não existe como conceito;
a contribuição de um Modificador é `Base × bônus dele`, calculável isoladamente; e o
bônus escala com o Tier automaticamente.

O empilhamento cresce linearmente em vez de explodir, o que torna o Teto necessário
mas simples — um único número (Σ ≤ 2,00). E o Teto **não** escala os bônus
individuais para caber: ele entra como linha própria no Extrato, justamente para que
`Urgência` nunca apareça valendo `+18%` numa Ocorrência e `+40%` em outra.
