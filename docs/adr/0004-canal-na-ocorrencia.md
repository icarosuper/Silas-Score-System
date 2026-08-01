# Canal é propriedade da Ocorrência, não da Categoria

O **Canal** (`Texto`, `Figurinha`, `Voz`, `Reunião`) vem em cada Ocorrência. As
Categorias não declaram Canal. Isso explica por que não existe uma Categoria
`Gafe em Call`.

O Canal foi introduzido porque metade da matriz de compatibilidade **deriva dele em
vez de ser opinião**: `Risada` não se aplica a uma figurinha porque não há texto onde
procurar a risada; `Enrolação` só se aplica a reunião porque só reunião tem duração.
Quatro dos oito Modificadores são restringidos por Canal, e apenas dois têm restrição
por Categoria.

## Considered Options

**Canal na Categoria.** Cada Categoria declararia um Canal fixo, produzindo uma
matriz estática de 13 × 8 imprimível numa folha. Rejeitado porque as Categorias são
de dois tipos diferentes: algumas são definidas por canal (`Figurinha` só existe como
figurinha) e outras por **conteúdo** (`Warron` é gafe tanto escrita quanto falada
numa call). Fixar Canal na Categoria obrigaria a duplicar `Gafe`, `Motivacional`,
`Desmotivacional`, `Cobrança de Prazo` e `Palavra Censurada` em variantes por canal —
e a Categoria pararia de significar "que tipo de absurdo é" para significar "que tipo
de absurdo e por onde".

O simulador já sabe o Canal: ele acabou de escolher se manda mensagem ou liga. Passar
essa informação é grátis, e é o tipo de fato observado que o SSS deve receber em vez
de adivinhar.

## Consequences

"Compatível" passa a ter **duas fontes**: uma estática (`Sequência de Vácuo` só em
`Vácuo`) e uma dinâmica (`Risada` depende do Canal desta Ocorrência). A matriz de
compatibilidade tem duas seções, e algumas células só podem ser respondidas com
"depende".

Em troca, as regras ficam enunciadas sobre a coisa certa: `Risada` não é
"incompatível com `Ligação no Telefone`", é "incompatível com canal de voz" — e isso
continua valendo quando a 14ª Categoria for adicionada, sem revisar a matriz.
