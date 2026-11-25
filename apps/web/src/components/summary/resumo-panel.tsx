import { WarningCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { CategoryIcon } from "@/components/category-icon";
import { UpcomingList } from "@/components/summary/upcoming-list";
import { paymentLine } from "@/lib/category-detail";
import {
	formatMoney,
	formatShortDate,
	formatSigned,
	monthName,
} from "@/lib/format";
import { upcomingByMonth } from "@/lib/horizon";
import { trpc } from "@/utils/trpc";

export type SelectedCategory = {
	categoryId: string;
	name: string;
	totalCents: number;
	percent: number;
};

// Painel de detalhe do Resumo no computador (Figma D4.1 e D4.2): sem categoria escolhida, o "O que
// vem" do Horizonte; com uma categoria, as saídas dela no mês. Esc volta para o "O que vem".
export function ResumoPanel({
	month,
	selected,
	onClear,
}: {
	month: string;
	selected: SelectedCategory | null;
	onClear: () => void;
}) {
	useEffect(() => {
		if (!selected) return;
		function onKey(event: KeyboardEvent) {
			if (event.key !== "Escape" || event.defaultPrevented) return;
			if (document.querySelector('[role="dialog"]')) return;
			onClear();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [selected, onClear]);

	return (
		<div className="detail-panel">
			{selected ? (
				<>
					<CategoryPanel month={month} selected={selected} />
					<p className="text-(length:--text-size-small) mt-auto pt-6 text-center text-[var(--color-text-muted)] leading-5">
						Esc volta para “O que vem”.
					</p>
				</>
			) : (
				<Upcoming />
			)}
		</div>
	);
}

function Upcoming() {
	const horizon = useQuery(trpc.summary.horizon.queryOptions());
	const data = horizon.data;
	return (
		<>
			<header className="detail-panel__head">
				<div>
					<p className="detail-panel__eyebrow">Horizonte</p>
					<h2 className="detail-panel__title">O que vem</h2>
				</div>
			</header>
			{horizon.isError ? (
				<p className="text-(length:--text-size-small) text-[var(--color-text-muted)]">
					Não deu pra carregar.{" "}
					<button
						type="button"
						className="tx-row__retry"
						onClick={() => horizon.refetch()}
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
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="skel h-10 w-full" />
					))}
				</div>
			) : data.upcoming.length === 0 ? (
				<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-5">
					Nada agendado ainda.
				</p>
			) : (
				<UpcomingList months={upcomingByMonth(data.upcoming, data.today)} />
			)}
		</>
	);
}

function CategoryPanel({
	month,
	selected,
}: {
	month: string;
	selected: SelectedCategory;
}) {
	const list = useQuery(trpc.transaction.list.queryOptions({ month }));
	const today = new Date().toLocaleDateString("sv-SE");
	const rows = (list.data ?? []).filter(
		(tx) => tx.kind === "EXPENSE" && tx.category.id === selected.categoryId,
	);
	return (
		<>
			<header className="detail-panel__head">
				<div>
					<p className="detail-panel__eyebrow">Categoria</p>
					<h2 className="detail-panel__title">{selected.name}</h2>
				</div>
			</header>
			<div className="text-(length:--text-size-small) flex items-baseline justify-between pb-3 text-[var(--color-text-muted)]">
				<span>Em {monthName(month).toLowerCase()}</span>
				<b className="font-semibold text-[var(--color-text)]">
					{formatMoney(selected.totalCents)} · {selected.percent}%
				</b>
			</div>
			{list.isError ? (
				<p className="text-(length:--text-size-small) flex items-center gap-2 text-[var(--color-text-muted)]">
					<WarningCircleIcon size={18} aria-hidden />
					Não deu pra carregar.{" "}
					<button
						type="button"
						className="tx-row__retry"
						onClick={() => list.refetch()}
					>
						Tentar de novo
					</button>
				</p>
			) : !list.data ? (
				<div
					className="flex flex-col gap-3"
					role="status"
					aria-busy="true"
					aria-label="Carregando"
				>
					{[0, 1].map((i) => (
						<div key={i} className="skel h-12 w-full" />
					))}
				</div>
			) : rows.length === 0 ? (
				<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-5">
					Nenhuma saída de {selected.name} neste mês.
				</p>
			) : (
				<div className="tx-list">
					{rows.map((row) => (
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
								<span className="tx-row__sub">
									{row.date === today ? "Hoje" : formatShortDate(row.date)} ·{" "}
									{paymentLine(row)}
								</span>
							</span>
							<span className="tx-row__value">
								{formatSigned(-row.amountCents)}
							</span>
						</Link>
					))}
				</div>
			)}
		</>
	);
}
