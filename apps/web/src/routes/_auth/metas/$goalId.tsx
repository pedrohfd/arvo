import type { AppRouter } from "@arvo/api/routers/index";
import {
	ArrowUpRightIcon,
	CaretLeftIcon,
	PencilSimpleIcon,
	PiggyBankIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { type ReactNode, useState } from "react";

import { GoalAmountSheet } from "@/components/goal/goal-amount-sheet";
import { GoalCompleteSheet } from "@/components/goal/goal-complete-sheet";
import { GoalFormSheet } from "@/components/goal/goal-form-sheet";
import { GoalRing } from "@/components/goal-ring";
import { formatMoney, formatShortDate } from "@/lib/format";
import type { GoalAmountMode } from "@/lib/goal-amount";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/metas/$goalId")({
	component: MetaDetalhe,
});

type Goal = inferRouterOutputs<AppRouter>["goal"]["get"];
type Movement = Goal["movements"][number];

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
				<Ready
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

function Ready({
	goal,
	availableCents,
}: {
	goal: Goal;
	/** Saldo atual; nulo enquanto carrega (sem ele não dá para guardar). */
	availableCents: number | null;
}) {
	const [sheet, setSheet] = useState<GoalAmountMode | null>(null);
	const [completing, setCompleting] = useState(false);
	const percent = Math.min(
		100,
		Math.floor((goal.savedCents * 100) / goal.targetCents),
	);
	const missingCents = Math.max(0, goal.targetCents - goal.savedCents);
	// "Para gastar" atingida: o rodapé troca Guardar por Concluir meta (5.6).
	const canComplete = goal.reached && goal.kind === "SPEND";

	return (
		<>
			<section className="flex flex-col items-center gap-2 px-5 pt-2 pb-5 text-center">
				<GoalRing percent={percent} size={160} done={goal.reached} />
				<h1 className="sheet__title pt-2 text-center">{goal.name}</h1>
				<p className="text-(length:--text-size-body) text-[var(--color-text-muted)] leading-[var(--text-leading-headline)]">
					<b className="font-semibold text-[var(--color-text)]">
						{formatMoney(goal.savedCents)}
					</b>{" "}
					de {formatMoney(goal.targetCents)}
					{goal.reached ? "" : ` · faltam ${formatMoney(missingCents)}`}
				</p>
				<div className="flex gap-2">
					{goal.reached ? (
						<span className="badge badge--accent">Meta atingida</span>
					) : null}
					<span className="badge">
						{goal.kind === "KEEP" ? "Vou manter" : "Vou gastar"}
					</span>
					{goal.deadline ? (
						<span className="badge">Até {formatShortDate(goal.deadline)}</span>
					) : null}
				</div>
				{canComplete ? (
					<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
						Chegou lá! Conclua para o valor voltar ao saldo.
					</p>
				) : goal.hint ? (
					<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
						{formatMoney(goal.hint.monthlyCents)} por mês para chegar lá.
					</p>
				) : null}
			</section>

			<section className="sheet" aria-label="Histórico">
				<div className="sheet__head">
					<h2 className="sheet__title">Histórico</h2>
				</div>
				{goal.movements.length === 0 ? (
					<p className="text-(length:--text-size-small) px-3 py-4 text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
						Nada guardado ainda. Toque em Guardar para separar um valor do seu
						saldo.
					</p>
				) : (
					<div className="tx-list">
						{goal.movements.map((movement) => (
							<MovementRow key={movement.id} movement={movement} />
						))}
					</div>
				)}
			</section>

			{/* Meta concluída não recebe mais movimentos: sem rodapé de ações. */}
			{goal.completedAt ? null : (
				<div className="footer-float">
					<div className="flex w-full max-w-[640px] items-start gap-3 px-2">
						<button
							type="button"
							className="btn-secondary flex-1"
							disabled={goal.savedCents <= 0}
							onClick={() => setSheet("withdraw")}
						>
							<ArrowUpRightIcon size={18} aria-hidden />
							Resgatar
						</button>
						{canComplete ? (
							<button
								type="button"
								className="btn-primary flex-1"
								onClick={() => setCompleting(true)}
							>
								Concluir meta
							</button>
						) : (
							<button
								type="button"
								className="btn-primary flex-1"
								disabled={availableCents === null}
								onClick={() => setSheet("deposit")}
							>
								Guardar
							</button>
						)}
					</div>
				</div>
			)}

			{completing ? (
				<GoalCompleteSheet goal={goal} onClose={() => setCompleting(false)} />
			) : null}

			{sheet && availableCents !== null ? (
				<GoalAmountSheet
					mode={sheet}
					goal={goal}
					availableCents={availableCents}
					onClose={() => setSheet(null)}
				/>
			) : null}
		</>
	);
}

function MovementRow({ movement }: { movement: Movement }) {
	const deposit = movement.type === "DEPOSIT";
	const title = deposit
		? "Guardado"
		: movement.type === "WITHDRAW"
			? "Resgatado"
			: "Meta concluída";
	const detail = deposit ? "do seu saldo" : "de volta ao saldo";
	const icon: ReactNode = deposit ? (
		<PiggyBankIcon size={22} aria-hidden />
	) : (
		<ArrowUpRightIcon size={22} aria-hidden />
	);
	return (
		<div className="tx-row">
			<span className="tx-row__icon">{icon}</span>
			<div className="tx-row__text">
				<span className="tx-row__title">{title}</span>
				<span className="tx-row__meta">
					<span>
						{formatShortDate(movement.date)} · {detail}
					</span>
				</span>
			</div>
			<div className="tx-row__amount">
				<span className="tx-row__value">
					{deposit ? "+" : "−"} {formatMoney(movement.amountCents)}
				</span>
			</div>
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
