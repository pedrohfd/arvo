import { CaretLeftIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { CategoryIcon } from "@/components/category-icon";
import {
	categoryShare,
	categoryTitle,
	paymentLine,
	transactionCount,
} from "@/lib/category-detail";
import { dayLabel, formatSigned, moneyParts } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/resumo/categoria/$categoryId")({
	component: ResumoCategoria,
	// O mês vem do Resumo; um endereço sem mês (ou torto) cai no mês do aparelho.
	validateSearch: (search: Record<string, unknown>): { month: string } => ({
		month:
			typeof search.month === "string" && /^\d{4}-\d{2}$/.test(search.month)
				? search.month
				: new Date().toLocaleDateString("sv-SE").slice(0, 7),
	}),
});

// Tela "4.1 · Resumo · categoria" do Figma: as saídas de uma categoria no mês escolhido, por dia.
// Abre ao tocar numa linha do "Para onde foi". Carregando, não carregou e "nada neste mês" seguem o
// padrão das outras telas (sem quadro próprio).
function ResumoCategoria() {
	const { categoryId } = Route.useParams();
	const { month } = Route.useSearch();
	const list = useQuery(trpc.transaction.list.queryOptions({ month }));
	const summary = useQuery(trpc.summary.month.queryOptions({ month }));
	const categories = useQuery(trpc.category.list.queryOptions());

	const category = categories.data?.find((row) => row.id === categoryId);
	const loaded = list.data && summary.data && categories.data;

	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			<div className="flex h-12 items-center px-2 pt-1">
				<Link
					to="/resumo"
					className="icon-btn"
					aria-label="Voltar para o Resumo"
				>
					<CaretLeftIcon size={22} aria-hidden />
				</Link>
			</div>

			{list.isError || summary.isError || categories.isError ? (
				<div className="flex flex-1 items-center justify-center pb-24">
					<div className="empty empty--problem">
						<span className="empty__icon">
							<WarningCircleIcon size={28} aria-hidden />
						</span>
						<h2 className="empty__title">Não deu pra carregar</h2>
						<p className="empty__text">
							Seus dados estão salvos. Foi a conexão com o arvo que falhou
							agora.
						</p>
						<button
							type="button"
							className="btn-secondary empty__action"
							onClick={() => {
								list.refetch();
								summary.refetch();
								categories.refetch();
							}}
						>
							Tentar de novo
						</button>
					</div>
				</div>
			) : !loaded ? (
				<div
					className="flex flex-col gap-3 px-5 pt-4"
					role="status"
					aria-busy="true"
					aria-label="Carregando"
				>
					<div className="skel !rounded-[var(--radius-md)] size-[52px]" />
					<div className="skel h-5 w-[200px]" />
					<div className="skel !rounded-[var(--radius-md)] h-10 w-[210px]" />
				</div>
			) : (
				<Ready
					month={month}
					category={category}
					rows={list.data.filter(
						(tx) => tx.kind === "EXPENSE" && tx.category.id === categoryId,
					)}
					saiuCents={summary.data.totals.saiuCents}
					today={new Date().toLocaleDateString("sv-SE")}
				/>
			)}
		</div>
	);
}
function Ready({
	month,
	category,
	rows,
	saiuCents,
	today,
}: {
	month: string;
	category: { name: string; icon: string } | undefined;
	rows: Array<{
		id: string;
		date: string;
		amountCents: number;
		title: string | null;
		paymentMethod: "CARD" | "PIX" | "CASH" | "DEPOSIT";
		cardName: string | null;
		dueDate: string | null;
		category: { name: string; icon: string };
	}>;
	saiuCents: number;
	today: string;
}) {
	const name = category?.name ?? rows[0]?.category.name ?? "Categoria";
	const icon = category?.icon ?? rows[0]?.category.icon ?? "tag";
	const total = rows.reduce((sum, row) => sum + row.amountCents, 0);
	const amount = moneyParts(total);

	// Por dia, do mais novo para o mais antigo (a lista já vem nessa ordem).
	const days: { date: string; totalCents: number; rows: typeof rows }[] = [];
	for (const row of rows) {
		let day = days.at(-1);
		if (!day || day.date !== row.date) {
			day = { date: row.date, totalCents: 0, rows: [] };
			days.push(day);
		}
		day.rows.push(row);
		day.totalCents += row.amountCents;
	}

	return (
		<>
			<section className="flex shrink-0 flex-col items-start gap-2 px-5 pt-4 pb-6">
				<span className="tx-row__icon !size-[52px]">
					<CategoryIcon name={icon} size={26} />
				</span>
				<h1 className="sheet__title pt-3">
					{categoryTitle(name, month, today)}
				</h1>
				<p className="balance__value">
					<span className="sr-only">Saídas de </span>
					<span aria-hidden>− </span>
					{amount.integer}
					<span className="balance__cents text-[22px] leading-7">
						{amount.cents}
					</span>
				</p>
				<p className="text-(length:--text-size-small) mt-1 text-[var(--color-text-muted)] leading-5">
					<b className="font-semibold text-[var(--color-text)]">
						{rows.length}
					</b>{" "}
					{transactionCount(rows.length)}
					{"   "}
					<b className="font-semibold text-[var(--color-text)]">
						{categoryShare(total, saiuCents)}%
					</b>{" "}
					das saídas do mês
				</p>
			</section>

			<section className="sheet" aria-label="Transações da categoria">
				{days.length === 0 ? (
					<div className="empty">
						<span className="empty__icon">
							<CategoryIcon name={icon} size={28} />
						</span>
						<h2 className="empty__title">Nada em {name} neste mês</h2>
						<p className="empty__text max-w-[340px] [text-wrap:wrap]">
							Nenhuma saída dessa categoria no mês escolhido.
						</p>
					</div>
				) : (
					days.map((day) => (
						<div key={day.date}>
							<div className="day-header">
								<span className="day-header__label">
									{dayLabel(day.date, today)}
								</span>
								<span className="day-header__total">
									{formatSigned(-day.totalCents)}
								</span>
							</div>
							<div className="tx-list">
								{day.rows.map((row) => (
									<Link
										key={row.id}
										to="/transacao/$transactionId"
										params={{ transactionId: row.id }}
										className="tx-row"
									>
										<span className="tx-row__icon">
											<CategoryIcon name={row.category.icon} />
										</span>
										<span className="tx-row__text">
											<span className="tx-row__title">
												{row.title || row.category.name}
											</span>
											<span className="tx-row__sub">{paymentLine(row)}</span>
										</span>
										<span className="tx-row__value">
											{formatSigned(-row.amountCents)}
										</span>
									</Link>
								))}
							</div>
						</div>
					))
				)}
			</section>
		</>
	);
}
