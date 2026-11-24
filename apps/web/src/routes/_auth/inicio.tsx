import type { AppRouter } from "@arvo/api/routers/index";
import { cn } from "@arvo/ui/lib/utils";
import {
	ArrowDownLeftIcon,
	ArrowsClockwiseIcon,
	ArrowUpRightIcon,
	CaretDownIcon,
	CaretLeftIcon,
	CaretRightIcon,
	CheckCircleIcon,
	CreditCardIcon,
	MagnifyingGlassIcon,
	PlantIcon,
	ReceiptIcon,
	TargetIcon,
	UsersThreeIcon,
	WarningCircleIcon,
	XIcon,
} from "@phosphor-icons/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { CategoryIcon } from "@/components/category-icon";
import { MonthSheet } from "@/components/home/month-sheet";
import {
	dayLabel,
	formatMoney,
	formatShortDate,
	formatSigned,
	moneyParts,
	monthName,
	monthShort,
} from "@/lib/format";
import { balanceLabel, matchesSearch } from "@/lib/home-month";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/inicio")({
	component: Inicio,
});

type Outputs = inferRouterOutputs<AppRouter>;
type Tx = Outputs["transaction"]["list"][number];
type GoalMovement = Outputs["goal"]["monthMovements"][number];

// Tela 1.1 do Figma (página "Arvo · 1 Início"). Estados: 1.2 primeira vez, 1.3 mês sem movimento,
// 1.4 carregando, 1.5 não carregou, 1.8 busca sem resultado; folha 1.10 de escolher o mês. Ainda
// não existem: o gesto de recolher o saldo (1.11), a folha de estados (1.9) e o aviso de 1.6 sem
// internet.
function Inicio() {
	// Sem escolha, vale o mês de hoje (do servidor); escolher outro refaz as três consultas.
	const [selected, setSelected] = useState<string | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [searching, setSearching] = useState(false);
	const [query, setQuery] = useState("");
	const home = useQuery({
		...trpc.summary.home.queryOptions({ month: selected ?? undefined }),
		placeholderData: keepPreviousData,
	});
	const month = selected ?? home.data?.month;
	const list = useQuery({
		...trpc.transaction.list.queryOptions({ month: month ?? "" }),
		enabled: Boolean(month),
	});
	// Guardar e resgatar também aparecem na lista (5.7), mas não entram em entrou/saiu.
	const movements = useQuery({
		...trpc.goal.monthMovements.queryOptions({ month: month ?? "" }),
		enabled: Boolean(month),
	});

	// O mês aparece no seletor mesmo carregando: antes de a resposta chegar, vale o do aparelho.
	const shownMonth =
		month ?? new Date().toLocaleDateString("sv-SE").slice(0, 7);
	const currentMonth = home.data?.today.slice(0, 7) ?? shownMonth;
	// Trocando de mês, `home` ainda guarda o mês anterior até a resposta nova chegar.
	const switching = home.isPlaceholderData;

	const bar = (disabled?: boolean) => (
		<TopBar
			month={shownMonth}
			searchDisabled={disabled}
			monthDisabled={!home.data}
			onMonth={() => setSheetOpen(true)}
			onSearch={() => setSearching(true)}
		/>
	);

	if (home.isError || list.isError || movements.isError) {
		return (
			<Page>
				{bar(true)}
				<Problem
					onRetry={() => {
						home.refetch();
						list.refetch();
						movements.refetch();
					}}
				/>
			</Page>
		);
	}
	if (!home.data || switching || !list.data || !movements.data) {
		return (
			<Page>
				{bar(true)}
				<Loading />
			</Page>
		);
	}

	const { today, balance, totals, credit, receivable, firstMonth } = home.data;
	const transactions = list.data;
	const days = groupByDay(transactions, movements.data);
	const isEmpty = days.length === 0;
	const short = monthShort(home.data.month);
	const isPast = home.data.month < currentMonth;

	const monthSheet = sheetOpen ? (
		<MonthSheet
			selected={home.data.month}
			current={currentMonth}
			first={firstMonth}
			onSelect={(picked) => {
				setSelected(picked === currentMonth ? null : picked);
				setSheetOpen(false);
			}}
			onClose={() => setSheetOpen(false)}
		/>
	) : null;

	// 1.8: busca. Só no mês escolhido, sem acento e sem maiúsculas; o saldo e os cartões saem de
	// cena para a lista ocupar a tela.
	if (searching) {
		const results = groupByDay(
			transactions.filter((tx) =>
				matchesSearch(query, tx.title, tx.category.name),
			),
			movements.data.filter((movement) =>
				matchesSearch(query, movement.goalName),
			),
		);
		return (
			<Page>
				<SearchBar
					query={query}
					onQuery={setQuery}
					onClose={() => {
						setSearching(false);
						setQuery("");
					}}
				/>
				<div className="flex px-5 pt-3 pb-4">
					<button
						type="button"
						className="month-btn"
						onClick={() => setSheetOpen(true)}
					>
						{monthName(home.data.month)}
						<CaretDownIcon size={14} className="icon" aria-hidden />
					</button>
				</div>
				<section className="sheet" aria-label="Resultados da busca">
					{results.length === 0 ? (
						<NoResults
							query={query.trim()}
							month={home.data.month}
							onClear={() => setQuery("")}
						/>
					) : (
						results.map((day) => <Day key={day.date} day={day} today={today} />)
					)}
				</section>
				{monthSheet}
			</Page>
		);
	}

	return (
		<Page>
			{bar(isEmpty)}

			<div className="balance-wrap">
				<div className="balance">
					<span className="balance__label">
						{balanceLabel(home.data.month, currentMonth)}
					</span>
					<Balance cents={balance.balanceCents} />
				</div>
				{!isPast && credit.totalCents > 0 && credit.nextDueDate ? (
					<p className="text-(length:--text-size-small) mt-2 flex items-center gap-1 text-[var(--color-text-muted)]">
						<CreditCardIcon size={14} aria-hidden />
						<span>
							No crédito, a pagar{" "}
							<b className="font-semibold text-[var(--color-text)]">
								{formatMoney(credit.totalCents)}
							</b>{" "}
							· vence {formatShortDate(credit.nextDueDate)}
						</span>
					</p>
				) : null}
			</div>

			<section className="screen-summary" aria-label="Resumo do mês">
				<div className="stat-pair">
					<StatCard
						variant="in"
						label={`Entrou em ${short}`}
						value={isEmpty ? null : `+ ${formatMoney(totals.entrouCents)}`}
						icon={<ArrowDownLeftIcon size={16} aria-hidden />}
					/>
					<StatCard
						label={`Saiu em ${short}`}
						value={isEmpty ? null : `− ${formatMoney(totals.saiuCents)}`}
						icon={<ArrowUpRightIcon size={16} aria-hidden />}
					/>
				</div>
				{receivable.totalCents > 0 ? (
					<Link
						to="/receber"
						className="stat-card stat-card--wide stat-card--owed"
					>
						<span className="stat-card__badge">
							<UsersThreeIcon size={16} aria-hidden />
						</span>
						<div className="stat-card__text">
							<span className="stat-card__label">
								A receber · {receivable.byPerson.length}{" "}
								{receivable.byPerson.length === 1 ? "pessoa" : "pessoas"}
							</span>
							<span className="stat-card__value">
								{formatMoney(receivable.totalCents)}
							</span>
						</div>
						<CaretRightIcon
							size={18}
							className="stat-card__chevron"
							aria-hidden
						/>
					</Link>
				) : null}
			</section>

			<section className="sheet" aria-label="Transações do mês">
				<div className="sheet__head">
					<h2 className="sheet__title">Transações</h2>
					{isEmpty ? null : (
						<span className="sheet__count">
							{transactions.length + movements.data.length} em {short}
						</span>
					)}
				</div>
				{isEmpty ? (
					firstMonth === null ? (
						<FirstTime />
					) : (
						<EmptyMonth
							month={home.data.month}
							currentMonth={currentMonth}
							onBack={() => setSelected(null)}
						/>
					)
				) : (
					days.map((day) => <Day key={day.date} day={day} today={today} />)
				)}
			</section>
			{monthSheet}
		</Page>
	);
}

// A casca do celular reserva espaço embaixo para a barra; aqui a folha de transações passa por
// baixo dela (com 120 px de respiro), como no Figma.
function Page({ children }: { children: ReactNode }) {
	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			{children}
		</div>
	);
}

// Mês (abre a folha 1.10) e busca.
function TopBar({
	month,
	searchDisabled,
	monthDisabled,
	onMonth,
	onSearch,
}: {
	month: string;
	searchDisabled?: boolean;
	monthDisabled?: boolean;
	onMonth: () => void;
	onSearch: () => void;
}) {
	return (
		<div className="flex h-12 items-center justify-between pt-1 pr-3 pl-5">
			<button
				type="button"
				className="month-btn"
				aria-haspopup="dialog"
				disabled={monthDisabled}
				onClick={onMonth}
			>
				{monthName(month)}
				<CaretDownIcon size={14} className="icon" aria-hidden />
			</button>
			<button
				type="button"
				className="icon-btn"
				aria-label="Buscar"
				disabled={searchDisabled}
				onClick={onSearch}
			>
				<MagnifyingGlassIcon size={22} aria-hidden />
			</button>
		</div>
	);
}

// Campo de busca no lugar da barra do topo; Esc ou a seta voltam.
function SearchBar({
	query,
	onQuery,
	onClose,
}: {
	query: string;
	onQuery: (query: string) => void;
	onClose: () => void;
}) {
	const input = useRef<HTMLInputElement>(null);
	useEffect(() => {
		input.current?.focus();
	}, []);
	return (
		<div className="search-bar h-12">
			<button
				type="button"
				className="icon-btn"
				aria-label="Fechar a busca"
				onClick={onClose}
			>
				<CaretLeftIcon size={22} aria-hidden />
			</button>
			<label className="search-field">
				<MagnifyingGlassIcon size={20} className="icon" aria-hidden />
				<input
					ref={input}
					type="search"
					value={query}
					placeholder="Buscar neste mês"
					aria-label="Buscar neste mês"
					onChange={(event) => onQuery(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Escape") onClose();
					}}
				/>
				{query ? (
					<button
						type="button"
						className="icon-btn"
						aria-label="Limpar a busca"
						onClick={() => {
							onQuery("");
							input.current?.focus();
						}}
					>
						<XIcon size={18} aria-hidden />
					</button>
				) : null}
			</label>
		</div>
	);
}

// Um dia da lista: cabeçalho com o total do dia e as linhas.
function Day({
	day,
	today,
}: {
	day: ReturnType<typeof groupByDay>[number];
	today: string;
}) {
	return (
		<div>
			<div className="day-header">
				<span className="day-header__label">{dayLabel(day.date, today)}</span>
				<span className="day-header__total">{formatSigned(day.netCents)}</span>
			</div>
			<div className="tx-list">
				{day.items.map((item) =>
					item.type === "tx" ? (
						<TxRow key={item.tx.id} tx={item.tx} />
					) : (
						<GoalMovementRow key={item.movement.id} movement={item.movement} />
					),
				)}
			</div>
		</div>
	);
}

// 1.3: mês sem nenhuma entrada ou saída. Em outro mês oferece voltar para o atual; no atual, a
// ação é o +.
function EmptyMonth({
	month,
	currentMonth,
	onBack,
}: {
	month: string;
	currentMonth: string;
	onBack: () => void;
}) {
	const name = monthName(month).toLowerCase();
	return (
		<div className="empty">
			<span className="empty__icon">
				<ReceiptIcon size={28} aria-hidden />
			</span>
			<h3 className="empty__title">Nada em {name}</h3>
			<p className="empty__text max-w-[340px] [text-wrap:wrap]">
				Nenhuma entrada ou saída neste mês. Esqueceu de registrar algo? Toque no
				+ e escolha a data.
			</p>
			{month !== currentMonth ? (
				<button
					type="button"
					className="btn-secondary empty__action"
					onClick={onBack}
				>
					Voltar para {monthName(currentMonth).toLowerCase()}
				</button>
			) : null}
		</div>
	);
}

// 1.8: busca sem resultado.
function NoResults({
	query,
	month,
	onClear,
}: {
	query: string;
	month: string;
	onClear: () => void;
}) {
	return (
		<div className="empty">
			<span className="empty__icon">
				<MagnifyingGlassIcon size={28} aria-hidden />
			</span>
			<h3 className="empty__title">Nada com “{query}”</h3>
			<p className="empty__text max-w-[340px] [text-wrap:wrap]">
				Nenhuma transação de {monthName(month).toLowerCase()} tem esse nome.
				Tente outra palavra ou outro mês.
			</p>
			<button
				type="button"
				className="btn-secondary empty__action"
				onClick={onClear}
			>
				Limpar busca
			</button>
		</div>
	);
}

function Balance({ cents }: { cents: number }) {
	const parts = moneyParts(cents);
	return (
		<span className="balance__value">
			{parts.integer}
			<span className="balance__cents text-[22px] leading-7">
				{parts.cents}
			</span>
		</span>
	);
}

function StatCard({
	label,
	value,
	icon,
	variant,
}: {
	label: string;
	/** Nulo = "Nada ainda" (mês sem registro). */
	value: string | null;
	icon: ReactNode;
	variant?: "in";
}) {
	return (
		<div className={cn("stat-card", variant === "in" && "stat-card--in")}>
			<span className="stat-card__badge">{icon}</span>
			<div className="stat-card__text">
				<span className="stat-card__label">{label}</span>
				<span
					className={cn(
						"stat-card__value",
						value === null && "stat-card__value--empty",
						variant === "in" &&
							value !== null &&
							"text-[var(--color-income-text)]",
					)}
				>
					{value ?? "Nada ainda"}
				</span>
			</div>
		</div>
	);
}

type DayItem =
	| { type: "tx"; tx: Tx }
	| { type: "goal"; movement: GoalMovement };

// Agrupa por dia, do mais novo para o mais antigo. O total do dia só soma o que entrou e saiu:
// guardar e resgatar não contam (5.7).
function groupByDay(transactions: Tx[], movements: GoalMovement[]) {
	const entries: (DayItem & { date: string; createdAt: string })[] = [
		...transactions.map((tx) => ({
			type: "tx" as const,
			tx,
			date: tx.date,
			createdAt: tx.createdAt,
		})),
		...movements.map((movement) => ({
			type: "goal" as const,
			movement,
			date: movement.date,
			createdAt: movement.createdAt,
		})),
	].sort(
		(a, b) =>
			b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
	);

	const days: { date: string; netCents: number; items: DayItem[] }[] = [];
	for (const entry of entries) {
		let day = days.at(-1);
		if (!day || day.date !== entry.date) {
			day = { date: entry.date, netCents: 0, items: [] };
			days.push(day);
		}
		day.items.push(entry);
		if (entry.type === "tx") {
			day.netCents +=
				entry.tx.kind === "INCOME"
					? entry.tx.amountCents
					: -entry.tx.amountCents;
		}
	}
	return days;
}

const METHOD_LABEL = {
	PIX: "Pix",
	CASH: "Dinheiro",
	DEPOSIT: "Depósito",
	CARD: null,
} as const;

// Linha de detalhe sob o título, com o ícone pequeno do Figma: dividida ("1 de 2 já pagou"),
// série (parcela 3/10), crédito (cartão · fatura) ou só a forma de pagamento (com a hora, se houver).
function detailFor(tx: Tx): { icon: ReactNode; text: string } {
	const method = METHOD_LABEL[tx.paymentMethod] ?? tx.cardName ?? "Cartão";
	const total = tx.splits.length;
	const paid = tx.splits.filter((split) => split.paidAt).length;

	if (total > 0) {
		return paid === total
			? {
					icon: <CheckCircleIcon size={14} aria-hidden />,
					text: "Tudo acertado",
				}
			: {
					icon: <UsersThreeIcon size={14} aria-hidden />,
					text: `${paid} de ${total} já pagou`,
				};
	}
	if (tx.seriesKind === "INSTALLMENT" && tx.seriesIndex && tx.seriesCount) {
		return {
			icon: <ArrowsClockwiseIcon size={14} aria-hidden />,
			text: `${method} · parcela ${tx.seriesIndex}/${tx.seriesCount}`,
		};
	}
	if (tx.seriesKind === "RECURRING") {
		return {
			icon: <ArrowsClockwiseIcon size={14} aria-hidden />,
			text: `${method} · repete`,
		};
	}
	if (tx.dueDate) {
		return {
			icon: <CreditCardIcon size={14} aria-hidden />,
			text: `${method} · fatura ${formatShortDate(tx.dueDate)}`,
		};
	}
	return { icon: null, text: tx.time ? `${method} · ${tx.time}` : method };
}

function TxRow({ tx }: { tx: Tx }) {
	const income = tx.kind === "INCOME";
	const detail = detailFor(tx);
	const owedCents = tx.splits
		.filter((split) => !split.paidAt)
		.reduce((sum, split) => sum + split.amountCents, 0);
	return (
		<Link
			to="/transacao/$transactionId"
			params={{ transactionId: tx.id }}
			className={cn("tx-row", income && "tx-row--income")}
		>
			<span className="tx-row__icon">
				<CategoryIcon name={tx.category.icon} />
			</span>
			<div className="tx-row__text">
				<span className="tx-row__title">{tx.title || tx.category.name}</span>
				<span className="tx-row__meta">
					{detail.icon}
					<span>{detail.text}</span>
				</span>
			</div>
			<div className="tx-row__amount">
				<span
					className={cn(
						"tx-row__value",
						income && "text-[var(--color-income-text)]",
					)}
				>
					{formatSigned(income ? tx.amountCents : -tx.amountCents)}
				</span>
				{owedCents > 0 ? (
					<span className="tx-row__sub">falta {formatMoney(owedCents)}</span>
				) : null}
			</div>
		</Link>
	);
}

// 5.7: o nome da linha é o da meta; embaixo diz "Guardado" ou "Resgatado". Valor na cor do texto
// (não é saída nem entrada): o sinal mostra o efeito no saldo.
function GoalMovementRow({ movement }: { movement: GoalMovement }) {
	const deposit = movement.type === "DEPOSIT";
	const label = deposit
		? "Guardado"
		: movement.type === "WITHDRAW"
			? "Resgatado"
			: "Meta concluída";
	return (
		<div className="tx-row">
			<span className="tx-row__icon">
				<TargetIcon size={22} weight="fill" aria-hidden />
			</span>
			<div className="tx-row__text">
				<span className="tx-row__title">{movement.goalName}</span>
				<span className="tx-row__meta">
					<span>{movement.time ? `${label} · ${movement.time}` : label}</span>
				</span>
			</div>
			<div className="tx-row__amount">
				<span className="tx-row__value">
					{formatSigned(deposit ? -movement.amountCents : movement.amountCents)}
				</span>
			</div>
		</div>
	);
}

// 1.2: primeira vez, sem nenhum registro.
function FirstTime() {
	return (
		<div className="empty">
			<span className="empty__icon">
				<PlantIcon size={28} aria-hidden />
			</span>
			<h3 className="empty__title">Seu mês começa aqui</h3>
			<p className="empty__text max-w-[340px] [text-wrap:wrap]">
				Toque no + para registrar o que entrou e o que saiu. O saldo se monta
				sozinho.
			</p>
			<p className="empty__text max-w-[340px] [text-wrap:wrap]">
				Já tem dinheiro na conta? Registre como uma entrada.
			</p>
		</div>
	);
}

// 1.4: carregando, com o mesmo desenho da tela pronta.
function Loading() {
	return (
		<div
			className="flex flex-1 flex-col"
			role="status"
			aria-busy="true"
			aria-label="Carregando"
		>
			<div className="balance-wrap">
				<span className="balance__label">Saldo atual</span>
				<div className="skel !rounded-[var(--radius-md)] mt-2 h-10 w-[210px]" />
				<div className="skel mt-4 h-3 w-[220px]" />
			</div>
			<div className="screen-summary">
				<div className="stat-pair">
					{[0, 1].map((i) => (
						<div key={i} className="stat-card">
							<div className="skel size-7" />
							<div className="flex flex-col gap-2">
								<div className="skel h-2.5 w-[84px]" />
								<div className="skel h-2.5 w-[112px]" />
							</div>
						</div>
					))}
				</div>
				<div className="stat-card stat-card--wide">
					<div className="skel size-7" />
					<div className="flex flex-1 flex-col gap-2">
						<div className="skel h-2.5 w-[120px]" />
						<div className="skel h-2.5 w-[80px]" />
					</div>
				</div>
			</div>
			<section className="sheet">
				<div className="sheet__head">
					<h2 className="sheet__title">Transações</h2>
				</div>
				<div className="skel mx-3 my-2 h-2.5 w-12" />
				{[0, 1, 2].map((i) => (
					<div key={i} className="flex h-16 items-center gap-3 px-3">
						<div className="skel !rounded-[var(--radius-md)] size-11" />
						<div className="flex flex-1 flex-col gap-2">
							<div className="skel h-2.5 w-[100px]" />
							<div className="skel h-2.5 w-[76px]" />
						</div>
						<div className="skel h-2.5 w-[80px]" />
					</div>
				))}
			</section>
		</div>
	);
}

// 1.5: não carregou.
function Problem({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex flex-1 items-center justify-center pb-24">
			<div className="empty empty--problem">
				<span className="empty__icon">
					<WarningCircleIcon size={28} aria-hidden />
				</span>
				<h2 className="empty__title">Não deu pra carregar</h2>
				<p className="empty__text">
					Seus dados estão salvos. Foi a conexão com o arvo que falhou agora.
				</p>
				<button
					type="button"
					className="btn-secondary empty__action"
					onClick={onRetry}
				>
					Tentar de novo
				</button>
			</div>
		</div>
	);
}
