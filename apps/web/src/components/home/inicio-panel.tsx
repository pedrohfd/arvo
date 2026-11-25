import { cn } from "@arvo/ui/lib/utils";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { CategoryIcon } from "@/components/category-icon";
import {
	Row,
	TransactionDetail,
} from "@/components/transaction/transaction-detail";
import { formatMoney, monthName } from "@/lib/format";
import { trpc } from "@/utils/trpc";

// Painel de detalhe da Início no computador (Figma D1.1 e D1.2): com uma transação escolhida, o
// detalhe dela; sem escolha, o "Resumo do mês" com o "Para onde foi".
export function InicioPanel({
	selectedId,
	month,
	balanceCents,
	onClear,
	onDeleted,
}: {
	selectedId: string | null;
	month: string;
	/** O saldo da Início (com o que ainda está na fila offline). */
	balanceCents: number;
	onClear: () => void;
	onDeleted: Parameters<typeof TransactionDetail>[0]["onDeleted"];
}) {
	return (
		<div className="detail-panel">
			{selectedId ? (
				<Selected id={selectedId} onClear={onClear} onDeleted={onDeleted} />
			) : (
				<MonthSummary month={month} balanceCents={balanceCents} />
			)}
		</div>
	);
}

function Selected({
	id,
	onClear,
	onDeleted,
}: {
	id: string;
	onClear: () => void;
	onDeleted: Parameters<typeof TransactionDetail>[0]["onDeleted"];
}) {
	const tx = useQuery({
		...trpc.transaction.get.queryOptions({ id }),
		retry: (count, error) => error.data?.code !== "NOT_FOUND" && count < 2,
	});
	const notFound = tx.error?.data?.code === "NOT_FOUND";

	// Apagada em outro aparelho: o painel volta ao resumo.
	useEffect(() => {
		if (notFound) onClear();
	}, [notFound, onClear]);

	if (tx.isError && !notFound) {
		return (
			<div className="empty empty--problem">
				<span className="empty__icon">
					<WarningCircleIcon size={28} aria-hidden />
				</span>
				<h2 className="empty__title">Não deu pra carregar</h2>
				<button
					type="button"
					className="btn-secondary empty__action"
					onClick={() => tx.refetch()}
				>
					Tentar de novo
				</button>
			</div>
		);
	}
	if (!tx.data) {
		return (
			<div role="status" aria-busy="true" aria-label="Carregando">
				<div className="skel !rounded-[var(--radius-md)] size-12" />
				<div className="skel !rounded-[var(--radius-md)] mt-4 h-10 w-[200px]" />
			</div>
		);
	}
	return (
		<TransactionDetail tx={tx.data} onDeleted={onDeleted} variant="panel" />
	);
}

function MonthSummary({
	month,
	balanceCents,
}: {
	month: string;
	balanceCents: number;
}) {
	const summary = useQuery(trpc.summary.month.queryOptions({ month }));
	const data = summary.data;
	const biggest = Math.max(
		...(data?.spending.categories.map((row) => row.totalCents) ?? [1]),
		1,
	);

	return (
		<>
			<header className="detail-panel__head">
				<div>
					<p className="detail-panel__eyebrow">{monthName(month)}</p>
					<h2 className="detail-panel__title">Resumo do mês</h2>
				</div>
			</header>

			{summary.isError ? (
				<p className="text-(length:--text-size-small) text-[var(--color-text-muted)]">
					Não deu pra carregar o resumo.{" "}
					<button
						type="button"
						className="tx-row__retry"
						onClick={() => summary.refetch()}
					>
						Tentar de novo
					</button>
				</p>
			) : !data ? (
				<div
					className="flex flex-col gap-3"
					role="status"
					aria-busy="true"
					aria-label="Carregando"
				>
					{[0, 1, 2, 3, 4].map((i) => (
						<div key={i} className="skel h-5 w-full" />
					))}
				</div>
			) : (
				<>
					<div className="detail-list">
						<Row label="Entrou">
							<span className="text-[var(--color-income-text)]">
								+ {formatMoney(data.totals.entrouCents)}
							</span>
						</Row>
						<Row label="Saiu">− {formatMoney(data.totals.saiuCents)}</Row>
						<Row label="Sobrou">
							<b className="font-semibold">
								{formatMoney(data.totals.sobrouCents)}
							</b>
						</Row>
						{data.totals.guardouCents !== 0 ? (
							<Row label="Guardado nas metas">
								{formatMoney(Math.abs(data.totals.guardouCents))}
							</Row>
						) : null}
						<Row label="Saldo atual">
							<b className="font-semibold">{formatMoney(balanceCents)}</b>
						</Row>
					</div>

					{data.spending.categories.length > 0 ? (
						<section aria-label="Para onde foi">
							<h3 className="sheet__title mb-3">
								{data.isFuture ? "Para onde vai" : "Para onde foi"}
							</h3>
							<div className="cat-bars">
								{data.spending.categories.map((row, index) => (
									<div
										key={row.categoryId}
										className={cn("cat-bar", index === 0 && "cat-bar--top")}
									>
										<div className="cat-bar__top">
											<CategoryIcon
												name={row.category?.icon ?? "tag"}
												size={18}
											/>
											<span className="cat-bar__name">
												{row.category?.name ?? "Sem categoria"}
											</span>
											<span className="cat-bar__value">
												{formatMoney(row.totalCents)}
											</span>
											<span className="cat-bar__pct">{row.percent}%</span>
										</div>
										<div className="cat-bar__track">
											<div
												className="cat-bar__fill"
												style={{
													width: `${(row.totalCents / biggest) * 100}%`,
												}}
											/>
										</div>
									</div>
								))}
							</div>
						</section>
					) : null}
				</>
			)}

			<p className="text-(length:--text-size-small) mt-auto pt-6 text-center text-[var(--color-text-muted)] leading-5">
				Escolha uma transação para ver o detalhe.
			</p>
		</>
	);
}
