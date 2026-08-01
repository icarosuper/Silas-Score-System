# Fronteira do SSS: recebe Ocorrências, não valida plausibilidade e não conhece Fonte

O SSS pontua o que recebe. Ele **não decide se um Evento podia acontecer**, não
verifica se um Evento pressupõe outro, e **não sabe por qual plataforma** a mensagem
chegou. Decidir *o que acontece* é do simulador; decidir *quanto vale* é do SSS.

## Considered Options

**Pré-requisito entre Eventos.** O catálogo tem um par onde a tentação é óbvia:
`Não pode call → pede texto → manda texto → pede call` (Lendário) é narrativamente
a continuação de `Texto muito grande → pede call` (Raro). Modelar o segundo como
dependente do primeiro faria o SSS validar a cadeia. Rejeitado porque, uma vez que
pré-requisito exista como mecanismo, ele tem que ser especificado para todos os 39
Eventos — e a restrição não se perde ao ficar de fora: o simulador simplesmente não
dispara o Lendário sem o Raro antes.

**Fonte como Modificador.** `O chefe te achou no WhatsApp pessoal às 22h` é
provavelmente o Evento mais engraçado que o jogo pode produzir, e hoje não há onde
encaixá-lo. Um Modificador `Fonte Indevida` resolveria. Rejeitado porque enumerar
fontes neste documento acopla a pontuação ao inventário de plataformas do jogo. A
leitura forte de "agnóstico de origem" é que o SSS não deve saber que WhatsApp
existe.

Se o efeito cômico virar prioridade, a saída que preserva a fronteira é um binário
genérico — `Fora do Perímetro`, "o chefe te acionou por um meio que não é o meio de
trabalho" — em que o SSS sabe *que* estava fora, mas não *qual* era o meio.

## Consequences

O SSS pode pontuar sequências implausíveis se o simulador as produzir. Isso é
aceito: o custo de um simulador com bug é um Score estranho, e o benefício é que a
especificação de pontuação não precisa modelar o mundo.

O SSS também **não recebe nada sobre o jogador** — nem presença, nem respostas, nem
atividade. É consequência da mesma fronteira, e é o que permitiu que `Gap de Tempo`
fosse derivado apenas do fluxo de mensagens do chefe (ver
[ADR 0003](./0003-estado-por-dia.md)).
