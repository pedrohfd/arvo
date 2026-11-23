# TESTES.md · arvo

Definição dos testes automáticos. Cobrem só as **regras de dinheiro e de datas**, escritas como funções puras (sem banco, sem rede, sem tela). O comportamento esperado vem das decisões do [DESIGN.md](DESIGN.md); se um teste e o DESIGN.md discordarem, registre a dúvida em "Perguntas em aberto" de lá.

## Como rodar

- Runner: `bun test` (o do próprio Bun; sem dependência nova).
- Onde ficam: ao lado do código, em `packages/api/src/rules/*.test.ts`. As regras ficam em `packages/api/src/rules/*.ts`, sem importar Prisma nem tRPC.
- Script: `bun run test` na raiz, via Turbo. Hoje só `@arvo/api` tem a task `test`; o app web ganha a sua quando surgirem os testes dos grupos 9 a 11.
- Convenções:
  - Dinheiro em **centavos inteiros** (`number`); nenhum teste usa ponto flutuante.
  - Datas fixas nos testes (nunca "hoje" real); a regra recebe a data de referência como parâmetro.
  - Cada caso tem nome em português, no formato "faz X quando Y".
  - Datas são texto "AAAA-MM-DD" (dia de calendário, sem `Date` nem fuso); a aritmética fica em `dates.ts`, que tem os seus próprios testes.

Status: `[ ]` a escrever · `[x]` escrito e passando

## 1. Saldo — `balance.ts`

Fórmula: entrou − saiu − guardado nas metas + crédito a pagar. Nunca é armazenado.

- [x] Conta nova, sem transações: saldo 0
- [x] Entrou 5.000,00, saiu 2.000,00: saldo 3.000,00
- [x] Saldo negativo é um número negativo (a tela mostra sem vermelho, mas o valor não é truncado em 0)
- [x] Guardar 500,00 numa meta reduz o saldo em 500,00; resgatar devolve
- [x] Guardar e resgatar não contam como entrou nem como saiu
- [x] Compra no crédito não reduz o saldo na data da compra
- [x] Compra no crédito reduz o saldo no vencimento da fatura (entra "Fatura <cartão>")
- [x] "Crédito a pagar" soma as compras ainda não vencidas
- [x] Transação com data futura não entra no saldo atual
- [x] Transação com data futura passa a entrar quando a data de referência chega nela (inclusive no próprio dia)
- [x] Saldo "no fim de <mês passado>" soma só até o último dia daquele mês
- [x] Entrada de reembolso (de pagamento de divisão) conta como entrada

## 2. Divisão da conta — `split.ts`

Partes iguais contando você; os centavos que sobram ficam com você.

- [x] 85,50 entre 4 pessoas: cada uma 21,37; você 21,39
- [x] A soma das partes é sempre igual ao total (testar vários totais e quantidades)
- [x] 100,00 entre 2: 50,00 e 50,00, sem sobra
- [x] 0,01 entre 3: as outras duas ficam com 0,00 e você com 0,01
- [x] Dividir só com você: uma parte, igual ao total
- [x] Quantidade de pessoas menor que 1 é erro
- [x] Total zero ou negativo é erro

## 3. Fatura do cartão de crédito — `invoice.ts`

Compra até o dia de fechamento vence neste mês; depois, no mês seguinte. O melhor dia de compra é o dia seguinte ao fechamento.

- [x] Fechamento dia 20, vencimento dia 27: compra no dia 20 vence 27 do mesmo mês
- [x] Mesmo cartão: compra no dia 21 vence 27 do mês seguinte
- [x] Compra no dia 1 vence neste mês
- [x] Fechamento no fim do ano: compra em 25/12 com fechamento dia 20 vence em janeiro do ano seguinte
- [x] Vencimento antes do fechamento no calendário (fechamento 28, vencimento 5): a fatura vence no mês seguinte ao do fechamento
- [x] Fechamento e vencimento no mesmo dia (fecha 20, vence 20): vence no mês seguinte
- [x] Mês sem o dia de fechamento ou vencimento (dia 31 em fevereiro, 30 em fevereiro): usa o último dia do mês
- [x] Melhor dia de compra é o dia seguinte ao fechamento (fechamento 20 → 21; fechamento 31 em mês de 30 dias → dia 1 do mês seguinte)
- [x] Valor da fatura é a soma das compras que caem nela
- [x] Débito, Pix e dinheiro não geram fatura (saem na hora)
- [x] Compra parcelada: cada parcela cai na fatura do seu mês, na ordem

## 4. Recorrência — `recurrence.ts`

Ocorrências são geradas ao criar; "sem fim" gera 24 meses à frente e é renovado para manter sempre 24 à frente.

- [x] "Todo mês" por 3 meses gera 3 ocorrências, no mesmo dia de cada mês
- [x] Série iniciada no dia 31 usa o último dia dos meses menores (31/01, 28/02 ou 29/02, 31/03, 30/04)
- [x] Ano bissexto: dia 29/02 e dia 31 em fevereiro de 2028 caem em 29
- [x] Virada de ano: série de 15/11 por 4 meses gera 15/11, 15/12, 15/01, 15/02
- [x] Parcelas numeradas: "parcela 3/10"
- [x] Parcelamento (compra no crédito): a pessoa digita o valor da parcela e quantas parcelas; R$ 50,00 × 10 gera 10 ocorrências de R$ 50,00, sem divisão nem sobra de centavos
- [x] "Repetir" a cada 12 meses (licenciamento do carro, 10/03): gera 10/03 de cada ano; "sem fim" gera 24 meses à frente, ou seja, 2 ocorrências
- [x] "Repetir" a cada 3 meses a partir de 31/01: 31/01, 30/04, 31/07, 31/10 (último dia nos meses curtos, sem perder o dia âncora)
- [x] "Sem fim" gera até o fim do 24º mês à frente (todo mês a partir de hoje: 25 ocorrências) e nada além disso; a que cai no último dia do horizonte entra
- [x] Renovar uma série sem fim acrescenta só as ocorrências novas, sem duplicar as existentes
- [x] Editar "só esta" muda só aquela ocorrência
- [x] Editar "esta e as próximas" muda aquela e as seguintes, nunca as anteriores
- [x] Apagar "só esta" remove só aquela; apagar "esta e as próximas" remove aquela e as seguintes, nunca as anteriores
- [x] Ocorrências já passadas nunca são alteradas ao editar a série
- [x] Limites: quantidade de 1 a 600 por série; periodicidade de pelo menos 1 mês; parcelamento sempre com quantidade

## 5. Reembolso ao marcar pago — `settlement.ts`

- [x] Marcar que uma pessoa pagou cria uma entrada de Reembolso com o valor da parte dela e a data do pagamento
- [x] Com a opção desligada (pagou em dinheiro), marca como pago e não cria entrada
- [x] Desmarcar o pagamento remove a entrada de reembolso gerada
- [x] Apagar a saída dividida apaga as entradas de reembolso geradas por ela
- [x] "A receber" soma só as partes ainda não pagas, por pessoa
- [x] Todos pagaram: "A receber" dessa transação é 0 (estado "Tudo acertado")
- [x] A parte do próprio usuário nunca entra em "A receber"

## 6. Metas — `goals.ts`

- [x] Só dá para guardar até o valor disponível (saldo atual); acima disso é erro
- [x] Só dá para resgatar até o valor guardado naquela meta
- [x] Meta atinge o alvo quando o guardado é maior ou igual ao valor da meta
- [x] "Para gastar" atingida: concluir devolve o valor guardado ao saldo
- [x] "Para manter" atingida: não tem concluir; o valor só sai por resgate
- [x] Dica de data limite: valor mensal = (alvo − guardado) ÷ meses restantes, arredondado para cima em centavos
- [x] Data limite que já passou não gera dica de valor mensal
- [x] Guardar valor zero ou negativo é erro

## 7. Resumo e Horizonte — `summary.ts`

- [x] "Sobrou" = entrou − saiu do mês; fecha com o saldo: sobrou − guardou (+ crédito) = saldo
- [x] "Saiu" e "Para onde foi" seguem a data da compra, inclusive no crédito
- [x] "Para onde foi": 5 maiores categorias + "Outras"; a soma sempre fecha com o total
- [x] Menos de 6 categorias: sem "Outras"
- [x] Guardar e resgatar não entram em "Saiu" nem em "Para onde foi"
- [x] Mês futuro usa só o que está agendado ("Deve sobrar")
- [x] Horizonte: saldo previsto no fim de cada mês, de hoje até hoje + 5 meses
- [x] Horizonte parte do saldo disponível (já sem o guardado nas metas) e inclui a fatura no mês do vencimento
- [x] Meses abaixo do saldo mínimo são marcados; com saldo mínimo 0 ou sem configuração, nenhum é marcado
- [x] Nada agendado: a linha fica reta no saldo atual
- [x] O que é de hoje (e a fatura que vence hoje) já está no saldo atual: não entra de novo no "o que vem" nem no horizonte
- [x] Compras no crédito viram uma fatura por cartão e vencimento em "o que vem"

## 8. Aviso de saldo mínimo — `minimum-balance.ts`

- [x] Gasto que deixaria o saldo abaixo do mínimo gera aviso (saldo 2.533,80, mínimo 500,00, Pix de 2.100,00 → 433,80 < 500,00)
- [x] Gasto que deixa o saldo exatamente no mínimo não avisa
- [x] Gasto no crédito não avisa
- [x] Entrada nunca avisa
- [x] Sem saldo mínimo configurado, nunca avisa

## 9. Valor digitado no teclado — `amount-input.ts` (no app web)

Fica em `apps/web`, porque é regra de tela, mas também é função pura.

- [ ] "120" vira R$ 120,00 (12000 centavos)
- [ ] "120,5" vira R$ 120,50; "120,50" vira R$ 120,50
- [ ] Centavos só depois da vírgula; uma segunda vírgula é ignorada
- [ ] Mais de 2 casas decimais: o dígito extra é ignorado
- [ ] Zeros à esquerda são ignorados ("007" vira 7)
- [ ] Apagar remove o último dígito; apagar em vazio continua vazio
- [ ] Respeita o limite máximo de R$ 9.999.999,99 (999999999 centavos): um dígito a mais é ignorado
- [ ] 9.999.999,99 é aceito; 10.000.000,00 não

## 10. Busca — `search.ts` (no app web)

- [ ] "farmacia" encontra "Farmácia"
- [ ] Ignora maiúsculas e minúsculas
- [ ] Procura no título e, se não houver título, na categoria
- [ ] Procura só nas transações do mês escolhido
- [ ] Texto vazio devolve a lista inteira do mês

## 11. Fila offline — `offline-queue.ts` (no app web)

Fila simples em IndexedDB; a lógica de ordem e reenvio é testada com um armazenamento em memória.

- [ ] Registrar sem rede coloca o gasto na fila com estado "pendente"
- [ ] Ao voltar a rede, envia na ordem em que foram registrados
- [ ] Envio com sucesso remove o item da fila
- [ ] Envio com erro de rede mantém o item e tenta de novo depois
- [ ] Envio recusado pelo servidor (dados inválidos) marca "Não foi salvo" e mantém o item para "Tentar de novo"
- [ ] Reenviar um item que já foi salvo não cria transação duplicada (cada item tem um identificador único gerado no aparelho)
- [ ] Fila vazia não faz nenhuma chamada

## Fora do escopo (por enquanto)

- Testes de tela (componentes, rotas, E2E).
- Testes de integração com banco e com o Better-Auth.
- Acessibilidade e contraste: seguem a auditoria manual do DESIGN.md.

Quando surgir um bug de regra de dinheiro, escreva primeiro o teste que o reproduz e depois corrija.
