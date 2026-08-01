# A janela de leitura carrega a linha anterior, não uma semente

O Score não é persistido: ele é derivado por replay do log de Ocorrências a cada
leitura ([design §3](../superpowers/specs/2026-08-01-painel-sss-design.md)). A pergunta
que sobra é **quanto do log** a rota lê.

Ler tudo é o mais simples. Ler uma janela é o mais barato. E qualquer janela cria um
problema que não é de custo: o **Gap de Tempo** da primeira Ocorrência da janela mede
o tempo desde a mensagem anterior do chefe, e essa mensagem está fora da janela.

```
2026-07-01 14h  Subiu?          ← última mensagem dele, fora da janela
   ... 30 dias de silêncio ...
2026-08-01 10h  Ainda off?      ← primeira linha da janela de 6 Dias
```

Sem esse contexto, o Gap de hoje sai como "não há anterior" e o `Assombração
(3+ dias)` — o caso mais cômico do sistema, o chefe ressuscitando — nunca pontua.

## Considered Options

**Replay da tabela inteira**, sem janela. `select * from occurrences order by day,
occurred_at, id`. Uma query, nenhum conceito extra: a primeira linha do log é
genuinamente a primeira mensagem do chefe que existe, e o Gap dela é ausente porque
é verdade que é ausente. Rejeitado pelo custo, que cresce com a tabela enquanto a
janela não cresce: o D1 cobra por linha lida e o polling de 5s multiplica isso. Com ~10
pessoas e ~10 registros/dia cada, a tabela passa de 30 mil linhas no primeiro ano, e a
~15 mil leituras/dia isso dá ~450M linhas lidas por dia contra o teto de ~5M do free
tier — duas ordens de grandeza fora.

**Janela mais uma segunda query de semente.** `select * from occurrences where day >=
?1` para a janela, e `select max(occurred_at) from occurrences where day < ?1` para o
timestamp avulso da mensagem anterior, que entra em `replay` como terceiro parâmetro:
`replay(log, today, seed)`. Custo idêntico à opção escolhida — a segunda query é um
index seek de uma linha. Rejeitado porque o parâmetro é detalhe de infraestrutura
vazando pra dentro de uma função pura: o core passaria a saber que existe janela de
leitura, e a assinatura carregaria pra sempre a marca de uma decisão de banco.

**Índice em `occurred_at` como solução.** Considerado e descartado como resposta
errada à pergunta: o índice barateia a busca da mensagem anterior, não dispensa
buscá-la. O problema é semântico, não de performance. (Além disso o índice já
existe de fato: `(day, occurred_at)` cobre os dois ramos da janela, porque `day` é
monotônico com `occurred_at`.)

### O custo mata o replay integral, mas não decide entre as janelas

As duas opções de janela custam o mesmo — a segunda query da semente é um index seek de
uma linha. E nenhuma das duas, sozinha, cabe no free tier: seis Dias a ~100 linhas/Dia
são ~600 linhas por leitura, e ~600 × 15 mil leituras ainda é ~9M linhas/dia.

O que fecha a conta é o polling **não** reler a janela. Como o log é append-only, o
`max(rowid)` é um change-token completo, e lê-lo é uma linha
([design §6](../superpowers/specs/2026-08-01-painel-sss-design.md)): as ~15 mil leituras
caem a ~15 mil linhas/dia e o replay passa a rodar ~100 vezes por dia, quando algo
muda. A janela mantém o replay barato quando ele roda; o token faz ele rodar pouco.

Registrado aqui porque a versão anterior deste ADR usava o custo pra justificar a
escolha, e o custo não justifica: ele elimina o replay integral e é indiferente entre as
outras duas. A escolha abaixo é pela assinatura do core, e é só por isso.

## Decision

A janela de 6 Dias **mais a Ocorrência imediatamente anterior a ela**, numa query só.

```sql
-- ?1 = today − 5
select * from (select * from occurrences where day < ?1 order by day desc, occurred_at desc, id desc limit 1)
union all
select * from occurrences where day >= ?1
order by day, occurred_at, id
```

O `limit 1` obriga o subselect: o SQLite não aceita `order by`/`limit` num ramo de
compound select. O `id desc` no desempate não muda pontuação — a linha extra só é lida
pelo seu instante — mas mantém a query determinística com dois inserts no mesmo
milissegundo, e custa três caracteres.

A mensagem anterior deixa de ser um número avulso e volta a ser o que sempre foi:
uma linha do log. `replay(log, today)` recebe um log e não sabe que existe janela.

## Consequences

O core fica com dois parâmetros em vez de três, e o conceito de "semente" não existe
em lugar nenhum — nem no tipo, nem na assinatura, nem nos testes.

**A fold itera os Dias de calendário do primeiro Dia presente no log até hoje**, não
de uma data fixa. É essa escolha que torna a frase acima verdadeira ao pé da letra: a
linha extra atravessa a fold como qualquer outra — conta Combo no Dia dela, move o
marcador de Gap — e os Dias vazios entre ela e o início da janela zeram o contador de
vácuo, que é exatamente o que aconteceria de verdade. Se a fold começasse numa data
fixa (`today − 5`), a linha extra ficaria fora do range iterado e voltaria a ser um
caso especial na entrada da fold: a mesma semente, agora escondida dentro do core em
vez de declarada na assinatura. O preço é iterar Dias vazios quando o chefe sumiu por
meses — um loop de inteiros que não faz nada, e nada é o que ele deve fazer.

Como a linha extra está a 6+ Dias de distância, ela fica fora do Dia corrente e nunca
aparece na saída. É o comportamento não óbvio que a escolha introduz, e o que o teste
**"a linha anterior à janela ancora o `Assombração` da primeira Ocorrência do Dia e
não aparece na saída"** existe pra fixar.

Seis Dias (`today − 5`) é o que a maior Faixa de vácuo (`5+ dias`) exige, e nada mais
olha pra trás: Combo é por Dia, o Gap vem da linha extra, e Total, Classificação e
Destaque são do Dia corrente. Uma janela maior leria linhas que nenhuma regra
consulta.

Em troca, dois custos. A SQL não é auto-explicativa e precisa do comentário que diz
por que o primeiro ramo existe — o menor dos dois. O outro é acoplamento: a linha
extra fica fora da saída **porque a saída é o Dia corrente**, não porque alguém a
filtra. No dia em que a tela mostrar Dias anteriores, ela vaza pra saída — e pontuando
com Gap ausente, que é falso. Aí ou se filtra a primeira linha no core, ou se volta pra
opção da semente. Nos dois casos é refatoração local: é a mesma janela, muda só quem
carrega a linha extra.
