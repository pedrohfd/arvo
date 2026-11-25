import {
	CaretLeftIcon,
	PencilSimpleIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { GoalDetail } from "@/components/goal/goal-detail";
import { GoalFormSheet } from "@/components/goal/goal-form-sheet";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/metas/$goalId")({
	component: MetaDetalhe,
});

// Tela 5.2 do Figma (página "Arvo · 5 Metas"): detalhe com histórico, editar (5.3), Guardar (5.4)
// Resgatar (5.5) e Concluir meta (5.6).
function MetaDetalhe() {
	const [editing, setEditing] = useState(false);
	const { goalId } = Route.useParams();
	const goal = useQuery(trpc.goal.get.queryOptions({ id: goalId }));
	// O saldo atual é o teto de "Guardar" (o mesmo da Início).
	const home = useQuery(trpc.summary.home.queryOptions());

	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			<div className="flex h-12 items-center justify-between px-2 pt-1">
				<Link to="/metas" className="icon-btn" aria-label="Voltar">
					<CaretLeftIcon size={22} aria-hidden />
				</Link>
				<button
					type="button"
					className="icon-btn"
					aria-label="Editar meta"
					disabled={!goal.data}
					onClick={() => setEditing(true)}
				>
					<PencilSimpleIcon size={22} aria-hidden />
				</button>
			</div>

			{goal.isError ? (
				<Problem onRetry={() => goal.refetch()} />
			) : !goal.data ? (
				<Loading />
			) : (
				<GoalDetail
					goal={goal.data}
					availableCents={home.data?.balance.balanceCents ?? null}
				/>
			)}
			{editing && goal.data ? (
				<GoalFormSheet goal={goal.data} onClose={() => setEditing(false)} />
			) : null}
		</div>
	);
}

function Loading() {
	return (
		<div
			className="flex flex-1 flex-col"
			role="status"
			aria-busy="true"
			aria-label="Carregando"
		>
			<section className="flex flex-col items-center gap-3 px-5 pt-2 pb-5">
				<div className="skel !rounded-full size-40" />
				<div className="skel mt-2 h-5 w-[160px]" />
				<div className="skel h-3 w-[240px]" />
			</section>
			<section className="sheet">
				<div className="sheet__head">
					<h2 className="sheet__title">Histórico</h2>
				</div>
				{[0, 1, 2].map((i) => (
					<div key={i} className="flex h-16 items-center gap-3 px-3">
						<div className="skel !rounded-[var(--radius-md)] size-11" />
						<div className="flex flex-1 flex-col gap-2">
							<div className="skel h-2.5 w-[100px]" />
							<div className="skel h-2.5 w-[140px]" />
						</div>
						<div className="skel h-2.5 w-[80px]" />
					</div>
				))}
			</section>
		</div>
	);
}

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
