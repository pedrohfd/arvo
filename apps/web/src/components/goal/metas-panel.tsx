import { WarningCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { GoalDetail } from "@/components/goal/goal-detail";
import { Row } from "@/components/transaction/transaction-detail";
import { formatMoney } from "@/lib/format";
import { trpc } from "@/utils/trpc";

// Painel de detalhe das Metas no computador (Figma D3.1 e D3.2): com uma meta escolhida, o detalhe
// dela; sem escolha, o "Resumo das metas".
export function MetasPanel({
	selectedId,
	savedCents,
	availableCents,
	inProgress,
	onClear,
}: {
	selectedId: string | null;
	savedCents: number;
	availableCents: number;
	inProgress: number;
	onClear: () => void;
}) {
	return (
		<div className="detail-panel">
			{selectedId ? (
				<Selected
					id={selectedId}
					availableCents={availableCents}
					onClear={onClear}
				/>
			) : (
				<>
					<header className="detail-panel__head">
						<div>
							<p className="detail-panel__eyebrow">Metas</p>
							<h2 className="detail-panel__title">Resumo das metas</h2>
						</div>
					</header>
					<div className="detail-list">
						<Row label="Guardado nas metas">
							<b className="font-semibold">{formatMoney(savedCents)}</b>
						</Row>
						<Row label="Disponível no saldo">
							<b className="font-semibold">{formatMoney(availableCents)}</b>
						</Row>
						<Row label="Em andamento">
							<b className="font-semibold">
								{inProgress} {inProgress === 1 ? "meta" : "metas"}
							</b>
						</Row>
					</div>
					<p className="text-(length:--text-size-small) mt-auto pt-6 text-center text-[var(--color-text-muted)] leading-5">
						Escolha uma meta para ver o detalhe.
					</p>
				</>
			)}
		</div>
	);
}

function Selected({
	id,
	availableCents,
	onClear,
}: {
	id: string;
	availableCents: number;
	onClear: () => void;
}) {
	const goal = useQuery({
		...trpc.goal.get.queryOptions({ id }),
		retry: (count, error) => error.data?.code !== "NOT_FOUND" && count < 2,
	});
	const notFound = goal.error?.data?.code === "NOT_FOUND";

	useEffect(() => {
		if (notFound) onClear();
	}, [notFound, onClear]);

	if (goal.isError && !notFound) {
		return (
			<div className="empty empty--problem">
				<span className="empty__icon">
					<WarningCircleIcon size={28} aria-hidden />
				</span>
				<h2 className="empty__title">Não deu pra carregar</h2>
				<button
					type="button"
					className="btn-secondary empty__action"
					onClick={() => goal.refetch()}
				>
					Tentar de novo
				</button>
			</div>
		);
	}
	if (!goal.data) {
		return (
			<div role="status" aria-busy="true" aria-label="Carregando">
				<div className="skel !rounded-full mx-auto mt-10 size-40" />
				<div className="skel mx-auto mt-6 h-5 w-[160px]" />
			</div>
		);
	}
	return (
		<GoalDetail
			goal={goal.data}
			availableCents={availableCents}
			variant="panel"
		/>
	);
}
