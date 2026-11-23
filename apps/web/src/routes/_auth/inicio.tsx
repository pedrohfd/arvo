import type { AppRouter } from "@arvo/api/routers/index";
import { cn } from "@arvo/ui/lib/utils";
import {
	ArrowDownLeftIcon,
	ArrowsClockwiseIcon,
	ArrowUpRightIcon,
	CaretDownIcon,
	CaretRightIcon,
	CheckCircleIcon,
	CreditCardIcon,
	MagnifyingGlassIcon,
	PlantIcon,
	UsersThreeIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import type { ReactNode } from "react";

import { CategoryIcon } from "@/components/category-icon";
import {
	dayLabel,
	formatMoney,
	formatShortDate,
	formatSigned,
	moneyParts,
	monthName,
	monthShort,
} from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/inicio")({
	component: Inicio,
});

type Outputs = inferRouterOutputs<AppRouter>;
type Tx = Outputs["transaction"]["list"][number];

// Tela 1.1 do Figma (página "Arvo · 1 Início"). Estados: 1.2 primeira vez, 1.4 carregando e
// 1.5 não carregou. Ainda não existem: seletor de mês (folha 1.10, e com ele a 1.3 "mês sem
// movimento"), busca, o gesto de recolher o saldo e o aviso de 1.6 sem internet.
function Inicio() {
	const home = useQuery(trpc.summary.home.queryOptions());
	const month = home.data?.month;
	const list = useQuery({
		...trpc.transaction.list.queryOptions({ month: month ?? "" }),
		enabled: Boolean(month),
	});

	// O mês aparece no seletor mesmo carregando: antes de a resposta chegar, vale o do aparelho.
	const shownMonth =
		month ?? new Date().toLocaleDateString("sv-SE").slice(0, 7);

	if (home.isError || list.isError) {
		return (
			<Page>
				<TopBar month={shownMonth} searchDisabled />
				<Problem
					onRetry={() => {
						home.refetch();
						list.refetch();
					}}
				/>
			</Page>
		);
	}
	if (!home.data || !list.data) {
		return (
			<Page>
				<TopBar month={shownMonth} searchDisabled />
				<Loading />
			</Page>
		);
	}

	const { today, balance, totals, credit, receivable } = home.data;
	const transactions = list.data;
	const isEmpty = transactions.length === 0;
	const short = monthShort(home.data.month);

	return (
		<Page>
			<TopBar month={home.data.month} searchDisabled={isEmpty} />

			<div className="balance-wrap">
				<div className="balance">
					<span className="balance__label">Saldo atual</span>
					<Balance cents={balance.balanceCents} />
				</div>
				{credit.totalCents > 0 && credit.nextDueDate ? (
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
					<div className="stat-card stat-card--wide stat-card--owed">
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
					</div>
				) : null}
			</section>

			<section className="sheet" aria-label="Transações do mês">
				<div className="sheet__head">
					<h2 className="sheet__title">Transações</h2>
					{isEmpty ? null : (
						<span className="sheet__count">
							{transactions.length} em {short}
						</span>
					)}
				</div>
				{isEmpty ? (
					<FirstTime />
				) : (
					groupByDay(transactions).map((day) => (
						<div key={day.date}>
							<div className="day-header">
								<span className="day-header__label">
									{dayLabel(day.date, today)}
								</span>
								<span className="day-header__total">
									{formatSigned(day.netCents)}
								</span>
							</div>
							<div className="tx-list">
								{day.items.map((tx) => (
									<TxRow key={tx.id} tx={tx} />
								))}
							</div>
						</div>
					))
				)}
			</section>
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

// Mês e busca. O seletor (folha 1.10) e a busca ainda não existem.
function TopBar({
	month,
	searchDisabled,
}: {
	month: string;
	searchDisabled?: boolean;
}) {
	return (
		<div className="flex h-12 items-center justify-between pt-1 pr-3 pl-5">
			<button type="button" className="month-btn">
				{monthName(month)}
				<CaretDownIcon size={14} className="icon" aria-hidden />
			</button>
			<button
				type="button"
				className="icon-btn"
				aria-label="Buscar"
				disabled={searchDisabled}
			>
				<MagnifyingGlassIcon size={22} aria-hidden />
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

function groupByDay(transactions: Tx[]) {
	const days: { date: string; netCents: number; items: Tx[] }[] = [];
	for (const tx of transactions) {
		let day = days.at(-1);
		if (!day || day.date !== tx.date) {
			day = { date: tx.date, netCents: 0, items: [] };
			days.push(day);
		}
		day.items.push(tx);
		day.netCents += tx.kind === "INCOME" ? tx.amountCents : -tx.amountCents;
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
		<div className={cn("tx-row", income && "tx-row--income")}>
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
