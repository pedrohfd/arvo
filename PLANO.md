# PLANO.md · arvo

Controle de andamento da implementação. O design está em [DESIGN.md](DESIGN.md) e no Figma; aqui fica só o que falta construir.

Convenções:
- Marque `[x]` ao terminar um item e anote a data no Registro no fim do arquivo.
- Nunca se faz commit direto na `dev`: todo trabalho entra por uma branch (em inglês) criada a partir da `dev`.
- Cada fase vira um ou mais PRs para `dev`; `dev` é mesclada na `master` só depois de conferida.
- Se o código e o DESIGN.md discordarem, o código vale até a pessoa decidir (ver DESIGN.md).

Status: `[ ]` a fazer · `[~]` em andamento · `[x]` feito

## Decisões pendentes

- [x] **Offline do +** — fila simples em IndexedDB; só o que é registrado offline fica no aparelho. Decidido em 2026-11-22.
- [x] **Recorrência** — gerar as ocorrências futuras no banco ao criar; "sem fim" tem limite à frente, renovado depois. Decidido em 2026-11-22.
- [x] **Testes** — `bun test` nas regras de dinheiro; as definições estão em [TESTES.md](TESTES.md). Decidido em 2026-11-22.

## Pendências de configuração

Resolvidas uma a uma, em ordem.

- [x] C1 · Postgres: Docker local (`docker-compose.yml`, `bun run db:up` / `db:down`, `postgresql://arvo:arvo@localhost:5432/arvo`) e Neon para preview e produção (criar os bancos em C5)
- [x] C2 · Arquivos `.env.local` criados em `apps/server` e `apps/web` (ignorados pelo git; validados com `varlock load`). Em outra máquina, recriar com `BETTER_AUTH_SECRET` (32+ caracteres), `BETTER_AUTH_URL=http://localhost:3000/api/auth`, `CORS_ORIGIN=http://localhost:3001`, `DATABASE_URL` e `VITE_SERVER_URL=http://localhost:3000`
- [x] C3 · Cliente Prisma gerado e migração inicial `init` (tabelas do auth) aplicada no Docker; fluxo do banco = `db:migrate` (migrações versionadas, commitadas). Obs.: `bun run db:generate` via Turbo só funciona em terminal interativo; fora dele, `bunx prisma generate` dentro de `packages/db`
- [x] C4 · Cookie de sessão: `sameSite: "lax"` e `secure` só quando `BETTER_AUTH_URL` é https (`packages/auth/src/index.ts`). Para testar no celular pela rede local, `CORS_ORIGIN` e `BETTER_AUTH_URL` precisam usar o IP do PC (ainda não configurado)
- [ ] C5 · (adiado até haver algo para publicar) Projeto na Vercel: `vercel link`, bancos de preview e produção, `env:preview` e `env:production`; `dev` como preview
- [x] C6 · PWA: manifest feito (descrição, `lang` pt-BR, `display` standalone, cores `#F2F5FA`). Ícones gerados de `apps/web/public/icon.svg` por `bun run generate-pwa-assets` (`pwa-assets.config.ts`, sem padding extra, fundo `#F2F5FA`): `pwa-64/192/512`, `maskable-icon-512`, `apple-touch-icon-180` e `favicon.ico`, commitados em `public/`. Conferidos a olho (maskable preenche o quadrado, monograma na zona segura); o plugin injeta os `<link>` do favicon e do apple-touch no build, então o `index.html` não muda. Pendente só ver o ícone instalado num aparelho
- [x] C7 · Decidido: instalar `@phosphor-icons/react` e remover `lucide-react` na Fase 0, ao reconstruir os 6 arquivos que o usam (`loader`, `mode-toggle`, `checkbox`, `dropdown-menu`, `message-scroller`, `sonner`); item na Fase 0
- [x] C8 · Decidido na Fase 2: splash em SVG/CSS (como o design descreve); `@rive-app/react-webgl2` e `arvo-animation.riv` removidos (o arquivo continua no histórico do git)
- [x] C9 · `bun run test` funcionando (script na raiz, task `test` no `turbo.json`, `test` em `@arvo/api`, `packages/api/src/rules/smoke.test.ts` de exemplo, para apagar com o primeiro teste real)
- [x] C10 · CI criado em `.github/workflows/ci.yml` (PRs e pushes para `dev` e `master`: `biome ci`, `check-types`, `test`). O passo de tipos está com `continue-on-error` porque o `check-types` do web falha na `master` (rota `/login` inexistente em `user-menu.tsx:26` e `_auth/route.tsx:11`); remover o `continue-on-error` na Fase 2. Ainda não rodou no GitHub (só validado localmente: lint e testes passam, 0 erros de lint)
- [ ] C11 · Proteção da `master` (merge só por PR) e deploy de preview da `dev` — roteiro abaixo; marcar quando aplicado
  1. Subir a `dev` com este trabalho e abrir um PR para a `master`, para o CI rodar uma vez (o GitHub só oferece o check como "obrigatório" depois da primeira execução).
  2. GitHub › Settings › Branches › Add branch ruleset (ou classic rule) para `master`:
     - Require a pull request before merging (aprovações: 0, já que o projeto é só seu).
     - Require status checks to pass: escolher `check` (o job do CI).
     - Block force pushes e restringir a exclusão da branch.
  3. Repetir, mais leve, para a `dev` só se quiser; não é necessário.
  4. Preview da `dev` na Vercel: depende do C5. Depois do `vercel link` e do banco Neon de preview, a Vercel gera um preview por branch/PR automaticamente.

## Pendências de decisão

Produto:
- [x] P1 · Limite máximo de valor no teclado: R$ 9.999.999,99 (999.999.999 centavos); vale para transações, guardar em metas e o servidor também valida
- [x] P2 · Recorrências "sem fim" geram 24 meses à frente (igual ao seletor de mês); a renovação mantém sempre 24 à frente. Falta definir na Fase 1 quando renovar (sugestão: ao abrir o app, no servidor, sem tarefa agendada)
- [x] P3 · Moeda BRL e fuso `America/Sao_Paulo` fixos, sem configuração. Datas de transação são dias de calendário (coluna `Date`, sem hora); "hoje" é calculado em Brasília, no servidor e no app, e as regras recebem a data de referência por parâmetro
- [x] P4 · Lembretes (push) e exportar CSV ficam para a v2: as telas 6.5 e "Exportar dados" não entram no app da v1 (nem o item no Perfil)
- [x] P5 · E-mail de recuperar senha via Resend (`sendResetPassword` do Better-Auth). Falta, na Fase 2: criar a conta Resend, a chave `RESEND_API_KEY` no `.env.schema` do server, e um domínio verificado (sem domínio, só envia para o e-mail do dono da conta); em dev, imprimir o link no log
- [x] P6 · Apagar conta apaga tudo na hora, em cascata, sem carência; a folha de confirmação avisa que é definitivo. Na Fase 1, todo modelo ligado ao usuário usa `onDelete: Cascade`

Design (em aberto no DESIGN.md):
- [x] D1 · Horizonte aprovado como está (registrado no DESIGN.md). Resta um ajuste visual no Figma: o ponto do fim de novembro (~R$ 1.043 depois da fatura) não aparece no gráfico
- [x] D2 · Nomes alinhados: CSS de Layout renomeado para `--layout-*`; Typography com hífen (`--text-size-label`, etc.) no CSS e no code syntax do Figma (a barra do Figma é inválida em CSS). Registrado no DESIGN.md
- [x] D3 · Estados desenhados no Figma: Campo Hover/Desabilitado e Alternador Hover/Pressionado (propriedade `Estado`); Barra lateral (desktop) movida para abrir espaço. Registrado no DESIGN.md
- [x] D4 · Campos sem borda abaixo de 3:1: mantidos sem borda, decisão consciente registrada em Acessibilidade no DESIGN.md
- [x] D5 · Componente Campo aprovado (2026-11-22). Fica pendente, sem bloquear o código, propagar nas telas do Figma (cópias à mão viram instâncias)
- [x] D6 · Peças de Mês e Desktop aprovadas (2026-11-22); o aviso "aguardando aprovação" saiu do DESIGN.md
- [ ] D9 · (com você) Figma 2.2: desenhar "Parcelamento" (só no cartão de crédito: valor da parcela e número de parcelas) e a periodicidade do "Repetir" (todo mês, a cada X meses, uma vez por ano); decisão de 2026-11-23 no DESIGN.md. Não bloqueia a Fase 1
- [ ] D7 · (com você) Apagar no Figma a página "Prévia · Cores novas (temporária)" e os modos "Prévia claro" e "Prévia escuro" da coleção Arvo Color; não bloqueia nada
- [x] D8 · Chip de mês e aviso âmbar nas outras séries: alinhar junto da implementação; ao codar cada série, se a tela do Figma divergir do guia (chip: sálvia + ponto verde; aviso âmbar padrão), seguir o guia e corrigir o Figma

## Fase 0 · Fundação

Abordagem: o CSS aprovado de `design/components.css` foi copiado para `packages/ui/src/styles/components.css` (classes como `.navbar`, `.btn-primary`, `.tx-row`) e já está carregado no app. Os wrappers React de cada peça são escritos junto da tela que os usa (Fases 2 a 6), em vez de todos de uma vez.

- [x] Tokens de `design/tokens.css` (claro e escuro) em `packages/ui/src/styles/tokens.css`, ligados ao Tailwind (`bg-surface`, `text-text-muted`, `rounded-md`, `shadow-soft`) e às variáveis do shadcn
- [x] Fontes Fraunces (variável completa, com SOFT) e Inter (variável com opsz) via `@fontsource-variable`; números tabulares ficam nas classes `.num` e nas peças de valor
- [x] CSS de componentes portado para `@arvo/ui` (sem as pranchas de protótipo `.phone`, `.status-bar`, `.home-indicator`)
- [ ] Wrappers React das peças: botão (principal, secundário, perigo, texto, ícone), campo, chip, linha de transação, folha, aviso, estado vazio, spinner (junto de cada tela)
- [x] Ícones Phosphor: `@phosphor-icons/react` instalado e `lucide-react` e `@fontsource-variable/geist` removidos; os 6 arquivos trocados
- [ ] Ícones novos entram como componente na página de ícones do Figma antes de serem usados (regra da memória do projeto); os do shell (house, target, chart-line-up, user, plus) já existem lá
- [x] Ícones do PWA: SVG do monograma exportado do Figma e PNGs gerados e conferidos (C6)
- [x] `<meta name="theme-color">` com `media` para claro e escuro (C6)
- [x] Casca do celular: barra inferior com **+** central (`apps/web/src/components/app-shell.tsx`; o + ainda não faz nada, entra na Fase 3)
- [x] Casca do desktop: barra lateral de 240 e, de 640 a 1024, barra compacta de 72. Falta o painel de detalhe de 400 (por tela, Fase 7)
- [x] Tema claro/escuro seguindo o sistema (`next-themes` com `data-theme`, padrão `system`)
- [x] Botão **+** em amarelo (Mango): `.fab` corrigido em `design/components.css` e na cópia do `@arvo/ui`, que ainda estava em verde
- [ ] PWA: service worker revisado e ícones (junto do item de ícones do PWA)
- [x] Template removido: `header.tsx` e `dashboard.tsx`. Rotas provisórias `/inicio`, `/metas`, `/resumo` e `/perfil` com o título; ainda falta trocar `/` (Rive), `user-menu`, `mode-toggle` e as formas de entrar/criar conta (Fase 2)
- [ ] Conferir o app no navegador (claro e escuro, celular e desktop): a casca só foi validada por build e tipos; não dá para abrir as telas autenticadas antes da rota `/login`

## Retomada (próxima sessão)

1. A Fase 1 está completa, salvo os testes dos grupos 10 e 11 do TESTES.md.
2. Falta na Fase 3: "Outro" em "Por quantos meses".
3. Falta na Fase 4: o aviso de sem internet (Resumo e Horizonte).
4. Fase 7 inteira (desktop e acabamento) e a conferência visual da Fase 0 no navegador.
5. Pendências com você: C5 (Vercel), C11 (proteção da `master`), D7 e D9 (Figma), propagar o Campo nas telas do Figma, desenhar `/redefinir-senha`.

## Fase 1 · Modelo de dados e API

- [x] Schema Prisma (`packages/db/prisma/schema/finance.prisma` + migração `finance_model`): `Category`, `Card`, `Person`, `Series`, `Transaction`, `TransactionSplit`, `Goal`, `GoalMovement`, `UserSettings`; tudo ligado ao usuário com `onDelete: Cascade` (P6). Categoria e pessoa em uso não se apagam (`NoAction`, conferido só no fim da transação para a cascata da conta passar); apagar cartão mantém as compras. Restrições `CHECK` no SQL da migração. As relações com `User` são injetadas em `auth.prisma` por `scripts/patch-auth-schema.ts` (roda dentro do `auth:generate`)
- [x] Dinheiro em centavos inteiros (`amountCents`, até 999.999.999 por `CHECK`)
- [x] Recorrência e parcelamento (`Series`) — regra pura pronta em `recurrence.ts`; as ocorrências são geradas ao criar (`lib/plan-transaction.ts`, usado por `transaction.create`, com `repeat` e `installments`); as séries "sem fim" são renovadas ao abrir o Início (`lib/renew-series.ts`, chamado por `summary.home`; 24 meses à frente, P2; o contador `Series.generatedCount` impede de recriar o que foi apagado, e apagar "esta e as próximas" encerra a série, com o "Desfazer" reabrindo); "repetir" com periodicidade (`intervalMonths`: 1, 3, 12...) e parcelamento no crédito (N parcelas do valor digitado)
- [x] Regra do saldo: entrou − saiu − guardado + crédito a pagar (nunca armazenado). `rules/balance.ts` ligada em `summary` e `goal`
- [x] Regra da divisão: partes iguais contando você; os centavos que sobram ficam com você (`rules/split.ts`, ligada em `transaction.create`)
- [x] Regra da fatura: até o dia de fechamento vence neste mês, depois no mês seguinte; o saldo só diminui no vencimento (`rules/invoice.ts`, ligada em `card` e `summary`)
- [x] Data futura entra no saldo só quando a data chega (`balance.ts` com a data de referência de `lib/calendar.ts`)
- [x] Marcar pago cria entrada de reembolso (desligável); apagar a saída apaga os reembolsos gerados (`settlement.ts`, ligada em `split`; no banco, a cascata de `reimbursedSplitId` apaga)
- [x] Routers tRPC prontos (`goal` também tem `monthMovements`): `category`, `transaction` (listar, criar, apagar), `summary` (Início, Resumo do mês, Horizonte), `card` (listar, criar, editar, apagar), `goal` (criar, editar, guardar, resgatar, concluir, apagar), `person`, `split` (A receber, marcar/desmarcar pago com reembolso) e `settings` (saldo mínimo); `transaction.get`, `transaction.restore` (desfazer o apagar) e `transaction.update` (editar, com "Só esta" / "Esta e as próximas") feitos
- [x] Categorias padrão criadas no cadastro (`packages/db/src/default-categories.ts`, hook `databaseHooks.user.create.after` no Better-Auth)
- [~] Testes das regras de dinheiro, conforme [TESTES.md](TESTES.md): grupos 1 a 8 escritos (130 testes, verificados por mutação); faltam os grupos 9 a 11, do app web (teclado de valor, busca, fila offline)

## Fase 2 · Começar

- [x] Criar a rota `/login` (e-mail e senha, erro, entrando, sem internet; `apps/web/src/routes/login.tsx`) e tirar o `continue-on-error` do passo de tipos no CI (C10).
- [x] 7.1 Splash (logo se desenha em ~1 s): rota `/` com `LogoDraw` (SVG, traço do "vo" com `pathLength` e `stroke-dashoffset`; sem animação em `prefers-reduced-motion`); segue para `/inicio` com sessão ou `/login`. Quadro final conferido contra o Figma. O onboarding (7.2) entra no lugar do `/login` para quem abre pela primeira vez
- [x] 7.2 Onboarding em 3 passos (arrastável): rota `/onboarding` com carrossel de rolagem nativa (`scroll-snap`; arrasto com o mouse e setas do teclado), ilustrações com as peças reais e dados de exemplo (`onboarding-art.tsx`, `goal-ring.tsx`), conferido contra o Figma. O splash leva para ele só na primeira vez (`localStorage`); "Pular" e "Começar" vão para `/cadastro`
- [x] 7.3 Entrar (erro, entrando, sem internet, sessão expirada): conferida contra o Figma (página "7 · Começar"). Sessão expirada = `/login?sessao=expirada`, disparado quando o tRPC responde `UNAUTHORIZED` (`utils/trpc.ts`). O link "Esqueci a senha" leva à 7.5
- [x] 7.4 Criar conta (senha curta, e-mail existente, criando): rota `/cadastro` (`apps/web/src/routes/cadastro.tsx`), com nome, e-mail e senha de 8+ caracteres; o campo compartilhado com o login está em `components/auth-field.tsx`. Conferida contra o Figma
- [x] 7.5 Recuperar senha (normal, não encontrado, enviado): rota `/recuperar-senha`, conferida contra o Figma. O "não achamos" vem do tRPC `emailExists` (a criação de conta já revela se o e-mail existe). Em dev o link sai no log do server (`[recuperar senha]`); a rota `/redefinir-senha` (nova senha) não existe no Figma e foi montada com as peças da 7.4: falta desenhá-la. Pendente do P5: Resend de verdade (hoje, em produção, o envio falha de propósito)
- [x] 1.2 Início vazia ("Seu mês começa aqui", em `inicio.tsx`)

## Fase 3 · Início e Registrar

- [~] 1.1 Início: saldo, entrou/saiu, "A receber", "No crédito, a pagar" e lista por dia feitos (`routes/_auth/inicio.tsx`, com carregando, não carregou e 1.2 vazia); falta conferir no navegador contra o Figma
- [x] Lista agrupada por dia (`groupByDay`, em `inicio.tsx`) com o gesto de recolher: ao subir a lista (celular) o saldo e os cartões sobem junto, o título "Transações" gruda e o saldo compacto aparece no topo (`.collapse-area`, observador de interseção)
- [x] Seletor de mês (folha 1.10, `components/home/month-sheet.tsx`, `lib/home-month.ts`) e saldo "no fim de <mês>" em mês passado; `summary.home` devolve `firstMonth`; a 1.3 "mês sem movimento" feita
- [x] Busca sem acento e sem maiúsculas, só no mês escolhido (título, categoria e meta), com a 1.8 "busca sem resultado"
- [x] Estados: carregando, não carregou, sem internet (aviso com a hora dos dados) e a linha salvando / na fila / não foi salvo
- [x] 2.1 Valor com teclado numérico (vírgula, centavos só depois dela): `components/register/register-sheet.tsx` e `lib/amount-input.ts` (grupo 9 do TESTES.md, 14 testes); teclado do computador também
- [~] 2.2 Detalhes: categoria (com a folha "Mais"), título, forma de pagamento, repetir (sem fim, 2, 3, 6, 10, 12) e aviso de saldo mínimo feitos; faltam "Outro" em "Por quantos meses" e o parcelamento (D9, sem tela)
- [x] 2.3 Dividir com: interruptor "Dividir a conta" na 2.2 (só saída que não se repete) e folha `components/register/split-sheet.tsx` (escolher pessoas, nome novo cria a pessoa, nome repetido avisa); dica da parte de cada um em `lib/split-with.ts` (com testes)
- [x] 2.4 Seletor de data: `components/register/date-sheet.tsx` e `lib/date-picker.ts` (atalhos Ontem/Hoje/Amanhã, calendário do mês, até 24 meses à frente; aviso "Ainda não entra no saldo" na data futura)
- [x] Aviso de saldo mínimo ao registrar (âmbar, não bloqueia; feito na 2.2)
- [x] **+** funciona offline: fila em IndexedDB (`lib/offline-queue.ts`, `lib/offline-storage.ts`, `components/offline/outbox-provider.tsx`), enviada ao abrir, quando a rede volta e ao voltar ao primeiro plano; o `clientId` do aparelho impede duplicar; o que está na fila já conta no saldo e no mês (`lib/queued-view.ts`). Limite: os dados da tela não ficam guardados no aparelho (abrir o app do zero sem rede mostra "Não deu pra carregar")
- [~] 3.1 Detalhe da transação: rota `/transacao/$transactionId` (simples, dividida, tudo acertado, entrada, parcela/repete, data futura, apagada em outro aparelho, carregando, erro), marcar/desmarcar pago e apagar; textos em `lib/transaction-detail.ts` (com testes). "Não foi salvo" feito para registros da fila (`local-...`, com Tentar de novo e Apagar)
- [x] 3.2 Editar: o mesmo `RegisterSheet` em modo edição (`editing`), sem repetir nem dividir; valor travado em saída dividida, parcela só em cartão de crédito, reembolso não se edita; em série, folha "Salvar em quais parcelas/repetições?" (começa em "Esta e as próximas"); com outra data, as seguintes acompanham (`lib/plan-edit.ts`, com testes), e o início e o dia da série são refeitos para a renovação continuar do mesmo ponto; "Só esta" / "Esta e as próximas" em recorrentes
- [x] 3.3 Apagar: folha de confirmação, "Só esta" / "Esta e as próximas" em série, e aviso "Saída apagada · Desfazer" (10 s) na Início. O `transaction.delete` devolve um retrato do que saiu (com os reembolsos) e o `transaction.restore` recria com os mesmos ids. Obs. para a renovação do "sem fim" (P2): "esta e as próximas" não encerra a série, então a renovação não pode recriar o que foi apagado
- [x] 3.4 A receber, por pessoa: rota `/receber` (`routes/_auth/receber.tsx`), aberta pelo cartão "A receber" da Início; pessoas e contas via `split.pending` (`lib/pending-splits.ts`, com testes), bolinha abre "Fulano pagou?"; normal e "Tudo acertado" do Figma, carregando e não carregou sem quadro
- [x] Contagem do saldo ao registrar (`lib/count-to.ts`, `lib/use-count-to.ts`; sem contar com "reduzir movimento") e a linha "acabou de registrar" (destaque e "agora", `lib/recent-registered.ts`)

## Fase 4 · Resumo e Horizonte

- [x] 4.1 Resumo (`routes/_auth/resumo.tsx`): "Sobrou em <mês>", Entrou, Saiu, Guardou, No crédito
- [x] "Para onde foi": 5 categorias + "Outras", e a lista das saídas da categoria no mês ao tocar (`routes/_auth/resumo/categoria.$categoryId.tsx`, `lib/category-detail.ts`); "Outras" não abre
- [x] Mês futuro: "Deve sobrar", selo "Previsão"
- [x] 4.2 Horizonte de saldos (`routes/_auth/resumo/horizonte.tsx`, `components/summary/horizon-chart.tsx`, `lib/horizon.ts`): hoje + 5 meses, só o agendado, lista "O que vem" por mês, normal, negativo e "Nada agendado ainda"; `summary.horizon` devolve saldo de hoje, pontos e o agendado
- [x] Linha de saldo mínimo no gráfico (e pontos abaixo dele em âmbar)
- [~] Estados: carregando, não carregou, sem movimento e (Horizonte) vazio feitos; falta sem internet

## Fase 5 · Metas

- [x] 5.1 Lista com anel de progresso e "Guardado nas metas"
- [x] 5.2 Detalhe com histórico, Guardar e Resgatar
- [x] 5.3 Nova/editar meta (dois tipos: "Para gastar" e "Para manter"; data limite com dica calma)
- [x] 5.4 Guardar e 5.5 Resgatar (só o que está disponível)
- [x] 5.6 Concluir meta (devolve o valor ao saldo)
- [x] Meta atingida (selo e círculo amarelos)
- [x] Gesto de recolher em Metas (5.1 "lista recolhida") e no Resumo (celular baixo), como na Início (DEV-128; `lib/use-collapse.ts`, `.fit-screen`)
- [x] 5.7 Guardar/resgatar aparecem na Início como "Guardado em <meta>"

## Fase 6 · Perfil

- [x] 6.1 Perfil (todas as linhas abrem a sua tela; "Exportar dados" saiu, v2)
- [x] 6.2 Cartões (crédito: fechamento, vencimento, fatura atual, melhor dia de compra)
- [x] 6.3 Categorias (criar, renomear, ícone, apagar com destino das transações)
- [x] 6.4 Pessoas (`routes/_auth/perfil/pessoas.tsx`: lista com quanto cada uma deve, nova, renomear e apagar)
- ~~6.5 Lembretes~~ (v2, ver P4)
- [x] 6.6 Aparência (`routes/_auth/perfil/aparencia.tsx`: automática, clara ou escura, por aparelho)
- [x] 6.7 Conta: editar o nome (`perfil/conta.tsx`; trocar e-mail depende do P5), sair (folha de confirmação) e apagar conta (`deleteUser` do Better-Auth, pede a senha; a cascata é do banco). Exportar CSV fica para a v2 (P4)
- [x] 6.8 Saldo mínimo (`routes/_auth/perfil/saldo-minimo.tsx`; vazio desliga o aviso)

## Telas feitas sem design próprio (para revisar)

Construídas sem quadro no Figma. Cada item tem uma issue no Linear; ao revisar, desenhar no Figma ou aprovar como está, e marcar `[x]`. Levantadas em 2026-11-24 comparando os quadros de cada página do Figma com as rotas e folhas do código.

- [ ] `/redefinir-senha`: página inteira, montada com as peças da 7.4 (DEV-117; o desenho em si é a DEV-72)
- [ ] Folha "Nova pessoa": reaproveita "Renomear pessoa", que é o único quadro de pessoa (DEV-118)
- [ ] Folhas "Editar cartão" e "Editar categoria": reaproveitam "Novo cartão" e "Nova categoria" (DEV-119)
- [ ] Gesto de deslizar a linha (editar à direita, apagar à esquerda) em cartões, categorias e pessoas (DEV-120)
- [ ] Detalhe da meta concluída (o cartão não abre nada) e "Apagar meta" na edição, sem folha de confirmação (DEV-121)
- [ ] Escolhas da Início com mês e busca que o Figma não mostra: sem "No crédito, a pagar" em mês passado, rótulo do mês futuro, busca com resultado, mês atual vazio sem botão (DEV-124)
- [ ] Escolhas da contagem do saldo e da linha "acabou de registrar": 1 s, conta em qualquer mudança do saldo, "agora" só em linha simples (DEV-130)
- [ ] Escolhas do gesto de recolher (Início, Metas e Resumo) que o Figma não mostra: só celular, Resumo só em celular baixo (até 720 px), busca com rolagem própria, aviso de sem internet rola junto (DEV-129)
- [ ] Escolhas da lista de uma categoria no Resumo que o Figma não mostra: "Outras" não abre, linha tocável sem sinal, estados sem quadro, mês no endereço (DEV-127)
- [ ] Escolhas da fila offline que o Figma não mostra: aviso "na fila", recusado fora do saldo, aviso só na Início, dados não guardados, Motivo, Apagar sem confirmação (DEV-126)
- [ ] Escolhas do Horizonte (4.2) que o Figma não mostra: texto do aviso negativo, carregando e não carregou, ponto do fim de novembro, "Registrar conta fixa" (DEV-125)
- [ ] Estados carregando e não carregou do A receber (3.4), e a ordem das pessoas e das contas (DEV-123)
- [ ] Escolhas da 3.2 Editar que o Figma não mostra: valor travado em saída dividida, só crédito em parcela, Editar desligado em reembolso, padrão da folha de escopo ("Só esta" no Figma × "Esta e as próximas" no DESIGN.md) e sem aviso de saldo mínimo (DEV-122)

## Fase 7 · Desktop e acabamento

- [ ] Início, Registrar (diálogo de 560), Metas, Resumo e Perfil no layout desktop
- [ ] Atalhos de teclado: ↑↓ ↵ Esc N ←→
- [ ] Largura média (768): barra lateral compacta de 72 e painel como gaveta
- [ ] Auditoria de acessibilidade: contraste AA, alvos de 44 px, `aria-invalid` nos erros, setas nos grupos, Esc nos diálogos
- [ ] `prefers-reduced-motion` em todas as transições
- [ ] Revisão de desempenho do PWA e do uso offline

## Registro

- 2026-11-22 — Plano criado; branch `dev` criada.
- 2026-11-22 — Decisões fechadas: fila simples offline, ocorrências geradas ao criar, testes com `bun test` (definições em TESTES.md).
- 2026-11-22 — Fase 0 quase pronta: tokens, fontes, CSS de componentes, Phosphor, tema e casca do app; faltam wrappers por tela, ícones do PWA e conferência visual.
- 2026-11-22 — Pendências de configuração C1–C10 resolvidas ou adiadas (Docker + Neon, `.env.local`, migração inicial, cookie `lax`, manifest do PWA, testes, CI); restam C5 (Vercel, adiada), C6 (ícones do PWA na Fase 0) e C11 (roteiro, com você). Pendências de decisão P1–P6 e D1–D8 fechadas; resta D7 (com você).
- 2026-11-23 — C6 concluída: PNGs do PWA gerados a partir do monograma e conferidos; build do web passa.
- 2026-11-23 — Logo SVG na barra lateral (como máscara, para seguir a cor do texto nos dois temas) e rota `/login` criada; `continue-on-error` do CI removido.
- 2026-11-23 — Fase 2: telas Entrar, Criar conta e Recuperar senha conferidas contra o Figma; splash feito em SVG/CSS e Rive removido (C8).
- 2026-11-23 — Fase 2: onboarding (7.2) feito. Descoberto que as fontes Inter e Fraunces não eram empacotadas (dev e build): corrigido em PR separado.
- 2026-11-23 — Fase 1: schema de finanças e migração. Decisões: parcelamento (crédito) e repetir (com periodicidade) são conceitos separados; apagar cartão mantém o histórico. O banco local foi migrado com um teste de 22 casos (restrições, cascatas, apagar conta).
- 2026-11-23 — Fase 1: regras de dinheiro puras (saldo, divisão, fatura, saldo mínimo, recorrência e parcelamento, reembolso, metas, Resumo e Horizonte) com 130 testes, verificados por mutação. Falta ligar nos routers tRPC.
- 2026-11-24 — Fase 6: Pessoas (6.4) e Saldo mínimo (6.8) feitas; `person.list` devolve `splitCount`.
- 2026-11-24 — Fase 6 concluída: Aparência (6.6) e Conta (6.7: editar nome, sair, apagar conta com senha).
- 2026-11-24 — Fase 3: Dividir com (2.3) no Registrar.
- 2026-11-24 — Fase 3: detalhe da transação (3.1, sem o Editar) e apagar com desfazer (3.3).
- 2026-11-24 — Fase 3: Registrar com divisão (2.3), detalhe da transação (3.1, sem o Editar) e apagar com desfazer (3.3) mergeados (#36, #37).
- 2026-11-24 — Fase 5 (Metas, #27 a #30) e Fase 6 (Cartões e Categorias, #32 e #33) concluídas; Fase 4: Resumo (4.1, mês futuro) feito, falta o Horizonte. Regras de saldo, divisão, fatura, data futura e reembolso ligadas nos routers; séries geradas ao criar. PLANO.md e Linear reconciliados com o código.
- 2026-11-24 — Fase 1: renovação das séries sem fim ao abrir o Início; migração `series_generated_count`. Testado no banco local: série de 1 ocorrência vira 35 (até 11/2028) e uma segunda renovação não duplica.
- 2026-11-24 — Fase 3: Editar (3.2) feito, com `transaction.update`; testado no banco local (só esta, esta e as próximas com data nova, valor travado em dividida, erros). Não conferido no navegador contra o Figma.
- 2026-11-24 — Levantadas as telas feitas sem design próprio (seção própria acima, issues DEV-117 a DEV-122) para revisão com foco.
- 2026-11-24 — Fase 3: A receber (3.4) feito (`/receber`, `split.pending`); testado no banco local (soma por pessoa, marcar pago tira da lista). Não conferido no navegador contra o Figma.
- 2026-11-24 — Fase 3: seletor de mês (1.10), saldo "no fim de <mês>", mês sem movimento (1.3) e busca (1.8) feitos; testado no banco local (`firstMonth`, saldo de mês passado). Não conferido no navegador contra o Figma.
- 2026-11-24 — Fase 4: Horizonte (4.2) com a linha de saldo mínimo feito; `summary.horizon` testado no banco local (fatura no vencimento, salário recorrente, mínimo). Rota do Resumo movida para `resumo/index.tsx`. Não conferido no navegador contra o Figma.
- 2026-11-24 — Fase 3: fila offline do + feita (registrar sem rede, enviar na volta, linha "Na fila para enviar" / "Salvando…" / "Não foi salvo", aviso "Sem internet", detalhe local); 15 testes da fila em `offline-queue.test.ts` (grupo 11 do TESTES.md). Testado no banco local: reenvio com o mesmo `clientId` não duplica e as linhas planejadas no aparelho batem com as do servidor. Não conferido no navegador nem sem rede de verdade.
- 2026-11-24 — Fase 4: lista das saídas de uma categoria no mês (tela "Resumo · categoria") feita, aberta pelas linhas do "Para onde foi"; testado no banco local (total da lista bate com o do Resumo, vencimento da fatura na linha). Não conferido no navegador contra o Figma.
- 2026-11-24 — Fase 3: gesto de recolher o saldo na Início (1.11) feito; Metas e Resumo (celular pequeno) ficam para depois (DEV-128). Não conferido no navegador: o comportamento de rolagem só foi verificado pela leitura do CSS e do código.
- 2026-11-24 — Gesto de recolher feito também em Metas e no Resumo (celular baixo); o gancho `useCollapse` agora serve as três telas. Não conferido no navegador: o comportamento de rolagem só foi verificado pela leitura do CSS e do código.
- 2026-11-24 — Fase 3: contagem do saldo e destaque da linha recém-registrada (Início) feitos; contagem e expiração testadas (`count-to.test.ts`, `recent-registered.test.ts`). Não conferido no navegador: a animação só foi verificada pela leitura do código.
