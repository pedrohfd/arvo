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
- [x] C8 · `@rive-app/react-webgl2` mantido: a rota `/` usa `apps/web/src/assets/arvo-animation.riv` (arquivo do projeto, provavelmente a animação do logo). Reavaliar na Fase 2 (splash): Rive ou SVG/CSS, como o design descreve
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

1. Fase 0 restante: usar `public/logo.svg` no lugar do texto "arvo" na barra lateral (`app-shell.tsx`).
2. Fase 2 (Começar): criar a rota `/login` (destrava a conferência visual da casca e o `check-types`), tirar o `continue-on-error` do CI, decidir Rive × SVG para o splash (C8).
3. Fase 1 (modelo de dados e API) pode ir em paralelo; as regras de dinheiro seguem TESTES.md.
4. Pendências com você: C5 (Vercel), C11 (proteção da `master`), D7 (apagar a prévia no Figma), propagar o Campo nas telas do Figma.
5. Nada foi enviado ao remoto: `git push` da `dev` e PR para a `master` quando quiser (o CI roda no PR).

## Fase 1 · Modelo de dados e API

- [ ] Schema Prisma: `Category`, `Card`, `Person`, `Transaction`, `TransactionSplit`, `Goal`, `GoalMovement`, `UserSettings`; tudo ligado ao usuário com `onDelete: Cascade` (P6)
- [ ] Dinheiro em centavos inteiros
- [ ] Recorrência: gerar as ocorrências ao criar, com limite à frente para "sem fim" e renovação depois
- [ ] Regra do saldo: entrou − saiu − guardado + crédito a pagar (nunca armazenado)
- [ ] Regra da divisão: partes iguais contando você; os centavos que sobram ficam com você
- [ ] Regra da fatura: até o dia de fechamento vence neste mês, depois no mês seguinte; o saldo só diminui no vencimento
- [ ] Data futura entra no saldo só quando a data chega
- [ ] Marcar pago cria entrada de reembolso (desligável); apagar a saída apaga os reembolsos gerados
- [ ] Routers tRPC: `transaction`, `summary`, `goal`, `person`, `card`, `category`, `profile`
- [ ] Categorias padrão criadas no cadastro
- [ ] Testes das regras de dinheiro, conforme [TESTES.md](TESTES.md)

## Fase 2 · Começar

- [ ] Criar a rota `/login` e tirar o `continue-on-error` do passo de tipos no CI (C10)
- [ ] 7.1 Splash (logo se desenha em ~1 s)
- [ ] 7.2 Onboarding em 3 passos (arrastável)
- [ ] 7.3 Entrar (erro, entrando, sem internet, sessão expirada)
- [ ] 7.4 Criar conta (senha curta, e-mail existente, criando)
- [ ] 7.5 Recuperar senha (normal, não encontrado, enviado)
- [ ] 1.2 Início vazia ("Já tem dinheiro na conta? Registre como uma entrada.")

## Fase 3 · Início e Registrar

- [ ] 1.1 Início: saldo, entrou/saiu, "A receber", "No crédito, a pagar"
- [ ] Lista agrupada por dia (Hoje, Ontem, "14 de nov."), com o gesto de recolher o saldo ao subir a lista
- [ ] Seletor de mês (folha 1.10) e saldo "no fim de <mês>" em mês passado
- [ ] Busca sem acento e sem maiúsculas, só no mês escolhido
- [ ] Estados: carregando, não carregou, sem internet, erro na linha da transação
- [ ] 2.1 Valor com teclado numérico (vírgula, centavos só depois dela)
- [ ] 2.2 Detalhes: categoria obrigatória, título opcional, data, forma de pagamento, repetir, dividir
- [ ] 2.3 Dividir com (pessoas só como nomes)
- [ ] 2.4 Seletor de data
- [ ] Aviso de saldo mínimo ao registrar (âmbar, não bloqueia)
- [ ] **+** funciona offline: fila em IndexedDB, enviada quando a rede volta
- [ ] 3.1 Detalhe da transação (editar, apagar, marcar/desmarcar pago)
- [ ] 3.2 Editar; "Só esta" / "Esta e as próximas" em recorrentes
- [ ] 3.3 Apagar (folha de confirmação)
- [ ] 3.4 A receber, por pessoa
- [ ] Contagem do saldo ao registrar (respeitando "reduzir movimento")

## Fase 4 · Resumo e Horizonte

- [ ] 4.1 Resumo: "Sobrou em <mês>", Entrou, Saiu, Guardou, No crédito
- [ ] "Para onde foi": 5 categorias + "Outras", lista ao tocar numa categoria
- [ ] Mês futuro: "Deve sobrar", selo "Previsão"
- [ ] 4.2 Horizonte de saldos (hoje + 5 meses, só o agendado) e lista "O que vem" (provisório)
- [ ] Linha de saldo mínimo no gráfico
- [ ] Estados: carregando, não carregou, sem internet, sem movimento

## Fase 5 · Metas

- [ ] 5.1 Lista com anel de progresso e "Guardado nas metas"
- [ ] 5.2 Detalhe com histórico, Guardar e Resgatar
- [ ] 5.3 Nova/editar meta (dois tipos: "Para gastar" e "Para manter"; data limite com dica calma)
- [ ] 5.4 Guardar e 5.5 Resgatar (só o que está disponível)
- [ ] 5.6 Concluir meta (devolve o valor ao saldo)
- [ ] Meta atingida (selo e círculo amarelos)
- [ ] 5.7 Guardar/resgatar aparecem na Início como "Guardado em <meta>"

## Fase 6 · Perfil

- [ ] 6.1 Perfil
- [ ] 6.2 Cartões (crédito: fechamento, vencimento, fatura atual, melhor dia de compra)
- [ ] 6.3 Categorias (criar, renomear, ícone, apagar com destino das transações)
- [ ] 6.4 Pessoas
- ~~6.5 Lembretes~~ (v2, ver P4)
- [ ] 6.6 Aparência
- [ ] 6.7 Conta: editar perfil, sair, apagar conta (exportar CSV fica para a v2, ver P4)
- [ ] 6.8 Saldo mínimo

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
