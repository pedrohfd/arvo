import type { AppRouter } from "@arvo/api/routers/index";
import { cn } from "@arvo/ui/lib/utils";
import {
	ArrowDownLeftIcon,
	ArrowUpRightIcon,
	CaretRightIcon,
	ChartLineUpIcon,
	CreditCardIcon,
	DotsThreeIcon,
	ReceiptIcon,
	TargetIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useDetailSlot } from "@/components/app-shell";
import { CategoryIcon } from "@/components/category-icon";
import { HorizonCard } from "@/components/summary/horizon-card";
import {
	ResumoPanel,
	type SelectedCategory,
} from "@/components/summary/resumo-panel";
import { arrowKeys } from "@/lib/arrow-keys";
import { formatMoney, moneyParts, monthName } from "@/lib/format";
import { useCollapse } from "@/lib/use-collapse";
import { useDesktop } from "@/lib/use-desktop";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/resumo/")({
	component: Resumo,
});

type MonthSummary = inferRouterOutputs<AppRouter>["summary"]["month"];

// Tela 4.1 do Figma (página "Arvo · 4 Resumo"): normal, faltou, mês futuro, sem movimento,
// carregando e não carregou. Ainda não existem: a lista que abre ao tocar numa categoria, o
// celular pequeno recolhido e o aviso de sem internet. O botão do topo abre o Horizonte (4.2).
function Resumo() {
	// O mês do aparelho vale até haver um "hoje" do servidor só para isso; o Início faz igual.
	const currentMonth = new Date().toLocaleDateString("sv-SE").slice(0, 7);
	const [month, setMonth] = useState(currentMonth);
	const summary = useQuery(trpc.summary.month.queryOptions({ month }));
	const { scrollRef, targetRef, collapsed } = useCollapse();
	// Computador: tocar numa categoria escolhe, e o painel da direita lista as saídas dela.
	const desktop = useDesktop();
	const detailSlot = useDetailSlot();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const selected: SelectedCategory | null = (() => {
		const row = summary.data?.spending.categories.find(
			(item) => item.categoryId === selectedId,
		);
		return row && row.categoryId
			? {
					categoryId: row.categoryId,
					name: row.category?.name ?? "Sem categoria",
					totalCents: row.totalCents,
					percent: row.percent,
				}
			: null;
	})();
	const panel =
		desktop && detailSlot
			? createPortal(
					<ResumoPanel
						month={month}
						selected={selected}
						onClear={() => setSelectedId(null)}
					/>,
					detailSlot,
				)
			: null;

	return (
		<div className="fit-screen mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))] lg:max-w-[600px] lg:pt-5">
			<div className="flex h-11 shrink-0 items-center justify-between pt-1 pr-3 pl-5">
				<h1
					className={cn(
						"display",
						collapsed
							? "text-(length:--text-size-title) leading-[var(--text-leading-title)]"
							: "text-(length:--text-size-display) leading-[var(--text-leading-display)]",
					)}
				>
					Resumo
				</h1>
				<span
					className={cn(
						"!text-left top-bar__balance",
						!collapsed && "is-hidden",
					)}
					aria-hidden={!collapsed}
				>
					{summary.data ? formatMoney(summary.data.totals.sobrouCents) : null}
				</span>
				<Link
					to="/resumo/horizonte"
					className="month-btn !h-10 !px-4 !gap-2 font-semibold text-[var(--color-text)] lg:hidden"
				>
					<ChartLineUpIcon size={18} aria-hidden />
					Horizonte
					<CaretRightIcon size={14} className="icon" aria-hidden />
				</Link>
			</div>

			<MonthRow selected={month} current={currentMonth} onSelect={setMonth} />

			<div className="collapse-area" ref={scrollRef}>
				{summary.isError ? (
					<Problem onRetry={() => summary.refetch()} />
				) : !summary.data ? (
					<Loading month={month} />
				) : (
					<Ready
						data={summary.data}
						current={currentMonth}
						onBackToCurrent={() => setMonth(currentMonth)}
						balanceRef={targetRef}
						selectedId={desktop ? selectedId : undefined}
						onSelect={desktop ? setSelectedId : undefined}
					/>
				)}
				{desktop && summary.data ? <HorizonCard /> : null}
			</div>
			{panel}
		</div>
	);
}

// Fileira de meses: três antes do atual e cinco depois (o Horizonte olha 5 meses à frente).
function monthsAround(current: string) {
	const [year, monthNumber] = current.split("-").map(Number) as [
		number,
		number,
	];
	return Array.from({ length: 9 }, (_, index) => {
		const date = new Date(Date.UTC(year, monthNumber - 1 + index - 3, 1));
		return date.toISOString().slice(0, 7);
	});
}

function MonthRow({
	selected,
	current,
	onSelect,
}: {
	selected: string;
	current: string;
	onSelect: (month: string) => void;
}) {
	const selectedRef = useRef<HTMLButtonElement>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: o efeito só precisa rodar quando o mês escolhido muda
	useEffect(() => {
		selectedRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
	}, [selected]);

	return (
		<div ref={arrowKeys()} className="month-row h-12 px-5 pt-3">
			{monthsAround(current).map((month) => (
				<button
					key={month}
					type="button"
					ref={month === selected ? selectedRef : undefined}
					className={cn("month-chip", month === selected && "is-selected")}
					aria-pressed={month === selected}
					onClick={() => onSelect(month)}
				>
					{monthName(month)}
					{month === current ? <span className="month-chip__dot" /> : null}
				</button>
			))}
		</div>
	);
}

function Ready({
	data,
	current,
	onBackToCurrent,
	balanceRef,
	selectedId,
	onSelect,
}: {
	data: MonthSummary;
	current: string;
	onBackToCurrent: () => void;
	/** Marca o valor grande para o gesto de recolher. */
	balanceRef: (element: HTMLElement | null) => void;
	/** Computador: a categoria escolhida (o painel lista as saídas dela). */
	selectedId?: string | null;
	/** Computador: escolhe a categoria em vez de abrir a tela dela. */
	onSelect?: (categoryId: string) => void;
}) {
	const { totals, spending, isFuture } = data;
	const name = monthName(data.month).toLowerCase();
	const isEmpty =
		totals.entrouCents === 0 &&
		totals.saiuCents === 0 &&
		totals.guardouCents === 0 &&
		spending.categories.length === 0;
	const missing = totals.sobrouCents < 0;
	const label = isFuture
		? `Deve sobrar em ${name}`
		: missing
			? `Faltou em ${name}`
			: `Sobrou em ${name}`;
	const rows = [
		...spending.categories.map((row) => ({
			key: row.categoryId,
			categoryId: row.categoryId as string | null,
			name: row.category?.name ?? "Sem categoria",
			icon: <CategoryIcon name={row.category?.icon ?? "tag"} size={18} />,
			totalCents: row.totalCents,
			percent: row.percent,
		})),
		...(spending.others
			? [
					{
						key: "others",
						categoryId: null,
						name: `Outras · ${spending.others.count} ${
							spending.others.count === 1 ? "categoria" : "categorias"
						}`,
						icon: <DotsThreeIcon size={18} aria-hidden />,
						totalCents: spending.others.totalCents,
						percent: spending.others.percent,
					},
				]
			: []),
	];
	const biggest = Math.max(...rows.map((row) => row.totalCents), 1);
	const count = spending.categories.length + (spending.others?.count ?? 0);
	const sheetTitle = isFuture ? "Para onde vai" : "Para onde foi";

	return (
		<>
			<section className="flex flex-col gap-0.5 px-5 pt-4 pb-5">
				<div ref={balanceRef} className="flex flex-col gap-0.5">
					<span className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
						{label}
					</span>
					<Amount cents={totals.sobrouCents} />
				</div>
				<div className="mt-2 flex flex-col">
					<div className="flex flex-wrap gap-x-4">
						<Line
							icon={<ArrowDownLeftIcon size={14} aria-hidden />}
							label={isFuture ? "Vai entrar" : "Entrou"}
							value={isEmpty ? "Nada" : `+ ${formatMoney(totals.entrouCents)}`}
							income={!isEmpty}
						/>
						<Line
							icon={<ArrowUpRightIcon size={14} aria-hidden />}
							label={isFuture ? "Vai sair" : "Saiu"}
							value={isEmpty ? "Nada" : `− ${formatMoney(totals.saiuCents)}`}
						/>
					</div>
					{!isFuture && totals.guardouCents !== 0 ? (
						<Line
							icon={<TargetIcon size={14} aria-hidden />}
							label="Guardou"
							value={`${totals.guardouCents < 0 ? "+" : "−"} ${formatMoney(Math.abs(totals.guardouCents))}`}
						/>
					) : null}
					{!isFuture && totals.creditCents > 0 ? (
						<Line
							icon={<CreditCardIcon size={14} aria-hidden />}
							label="No crédito, a pagar"
							value={formatMoney(totals.creditCents)}
						/>
					) : null}
					{missing && !isFuture ? (
						<p className="text-(length:--text-size-small) pt-1 text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
							Saiu {formatMoney(-totals.sobrouCents)} a mais do que entrou.
						</p>
					) : null}
					{isFuture && !isEmpty ? (
						<p className="text-(length:--text-size-small) pt-1 text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
							Previsão · só o que já está agendado
						</p>
					) : null}
				</div>
			</section>

			<section className="sheet sheet--plain" aria-label={sheetTitle}>
				<div className="sheet__head">
					<h2 className="sheet__title">{sheetTitle}</h2>
					{rows.length > 0 ? (
						<span className="sheet__count">
							{count} {count === 1 ? "categoria" : "categorias"}
						</span>
					) : null}
				</div>
				{rows.length === 0 ? (
					<Nothing
						title={isFuture ? `Nada agendado em ${name}` : `Nada em ${name}`}
						text={
							isFuture
								? "Quando você registrar contas fixas ou parcelas pra esse mês, elas aparecem aqui."
								: "Esqueceu de registrar algo? Toque no + e escolha a data."
						}
						showBack={data.month !== current}
						backLabel={`Voltar para ${monthName(current).toLowerCase()}`}
						onBack={onBackToCurrent}
					/>
				) : (
					<div className="cat-bars">
						{rows.map((row, index) => {
							const className = cn("cat-bar", index === 0 && "cat-bar--top");
							const content = (
								<>
									<div className="cat-bar__top">
										{row.icon}
										<span className="cat-bar__name">{row.name}</span>
										<span className="cat-bar__value">
											{formatMoney(row.totalCents)}
										</span>
										<span className="cat-bar__pct">{row.percent}%</span>
									</div>
									<div className="cat-bar__track">
										<div
											className="cat-bar__fill"
											style={{ width: `${(row.totalCents / biggest) * 100}%` }}
										/>
									</div>
								</>
							);
							// Tocar numa categoria abre a lista das saídas dela no mês; "Outras" não abre.
							const categoryId = row.categoryId;
							if (categoryId && onSelect) {
								return (
									<button
										key={row.key}
										type="button"
										aria-pressed={selectedId === categoryId}
										className={cn(
											className,
											selectedId === categoryId && "is-selected",
										)}
										onClick={() => onSelect(categoryId)}
									>
										{content}
									</button>
								);
							}
							return row.categoryId ? (
								<Link
									key={row.key}
									to="/resumo/categoria/$categoryId"
									params={{ categoryId: row.categoryId }}
									search={{ month: data.month }}
									className={cn(className, "block")}
								>
									{content}
								</Link>
							) : (
								<div key={row.key} className={className}>
									{content}
								</div>
							);
						})}
					</div>
				)}
			</section>
		</>
	);
}

// Valor grande com os centavos menores, como o saldo da Início. Negativo vai com "− ".
function Amount({ cents }: { cents: number }) {
	const parts = moneyParts(Math.abs(cents));
	return (
		<span className="balance__value">
			{cents < 0 ? "− " : ""}
			{parts.integer}
			<span className="balance__cents text-[22px] leading-7">
				{parts.cents}
			</span>
		</span>
	);
}

function Line({
	icon,
	label,
	value,
	income,
}: {
	icon: ReactNode;
	label: string;
	value: string;
	income?: boolean;
}) {
	return (
		<p className="text-(length:--text-size-small) flex h-6 items-center gap-1 text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
			{icon}
			<span>{label}</span>
			<b
				className={cn(
					"font-semibold",
					income
						? "text-[var(--color-income-text)]"
						: "text-[var(--color-text)]",
				)}
			>
				{value}
			</b>
		</p>
	);
}

function Nothing({
	title,
	text,
	showBack,
	backLabel,
	onBack,
}: {
	title: string;
	text: string;
	showBack: boolean;
	backLabel: string;
	onBack: () => void;
}) {
	return (
		<div className="empty">
			<span className="empty__icon">
				<ReceiptIcon size={28} aria-hidden />
			</span>
			<h3 className="empty__title">{title}</h3>
			<p className="empty__text max-w-[340px] [text-wrap:wrap]">{text}</p>
			{showBack ? (
				<button
					type="button"
					className="btn-secondary empty__action"
					onClick={onBack}
				>
					{backLabel}
				</button>
			) : null}
		</div>
	);
}

// Carregando, com o mesmo desenho da tela pronta.
function Loading({ month }: { month: string }) {
	return (
		<div
			className="flex flex-1 flex-col"
			role="status"
			aria-busy="true"
			aria-label="Carregando"
		>
			<section className="flex flex-col gap-0.5 px-5 pt-4 pb-5">
				<span className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
					Resumo de {monthName(month).toLowerCase()}
				</span>
				<div className="skel !rounded-[var(--radius-md)] mt-2 h-10 w-[210px]" />
				<div className="skel mt-4 h-3 w-[220px]" />
				<div className="skel mt-3 h-3 w-[160px]" />
			</section>
			<section className="sheet">
				<div className="sheet__head">
					<h2 className="sheet__title">Para onde foi</h2>
				</div>
				{[0, 1, 2, 3].map((i) => (
					<div key={i} className="flex flex-col gap-3 p-3">
						<div className="flex items-center gap-2">
							<div className="skel size-[18px]" />
							<div className="skel h-2.5 flex-1" />
							<div className="skel h-2.5 w-20" />
						</div>
						<div className="skel h-2" style={{ width: `${90 - i * 20}%` }} />
					</div>
				))}
			</section>
		</div>
	);
}

// Não carregou.
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
