import type { AppRouter } from "@arvo/api/routers/index";
import {
	CaretRightIcon,
	PlusIcon,
	TargetIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";

import { GoalRing } from "@/components/goal-ring";
import { formatMoney, formatShortDate, moneyParts } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/metas")({
	component: Metas,
});

type Goal = inferRouterOutputs<AppRouter>["goal"]["list"][number];

// Tela 5.1 do Figma (página "Arvo · 5 Metas"): lista, vazio, meta atingida, carregando e não
// carregou. Ainda não existem: detalhe (5.2), nova/editar meta (5.3), guardar e resgatar (5.4,
// 5.5), concluir (5.6), o gesto de recolher o resumo e o aviso de sem internet.
function Metas() {
	const goals = useQuery(trpc.goal.list.queryOptions());
	// "Disponível no saldo" é o saldo atual da Início (o que está guardado já saiu dele).
	const home = useQuery(trpc.summary.home.queryOptions());

	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			{goals.isError || home.isError ? (
				<>
					<Header />
					<Problem
						onRetry={() => {
							goals.refetch();
							home.refetch();
						}}
					/>
				</>
			) : !goals.data || !home.data ? (
				<>
					<Header />
					<Loading />
				</>
			) : (
				<Ready
					goals={goals.data.filter((goal) => !goal.completedAt)}
					availableCents={home.data.balance.balanceCents}
				/>
			)}
		</div>
	);
}

function Header({ showNew = false }: { showNew?: boolean }) {
	return (
		<div className="flex h-11 items-center justify-between pt-1 pr-3 pl-5">
			<h1 className="display text-(length:--text-size-display) leading-[var(--text-leading-display)]">
				Metas
			</h1>
			{showNew ? (
				<button
					type="button"
					className="month-btn !h-10 !px-4 !gap-2 font-semibold text-[var(--color-text)]"
				>
					<PlusIcon size={18} aria-hidden />
					Nova meta
				</button>
			) : null}
		</div>
	);
}

function Ready({
	goals,
	availableCents,
}: {
	goals: Goal[];
	availableCents: number;
}) {
	if (goals.length === 0) {
		return (
			<>
				<Header />
				<div className="flex flex-1 items-center justify-center pb-24">
					<div className="empty">
						<span className="empty__icon">
							<TargetIcon size={28} aria-hidden />
						</span>
						<h2 className="empty__title">Você ainda não tem metas</h2>
						<p className="empty__text max-w-[340px] [text-wrap:wrap]">
							Uma meta separa dinheiro do seu saldo para uma viagem, uma compra
							ou uma reserva.
						</p>
						<button type="button" className="btn-secondary empty__action">
							Criar meta
						</button>
					</div>
				</div>
			</>
		);
	}

	const savedCents = goals.reduce((sum, goal) => sum + goal.savedCents, 0);
	const parts = moneyParts(savedCents);

	return (
		<>
			<Header showNew />
			<section className="flex flex-col gap-0.5 px-5 pt-4 pb-5">
				<span className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
					Guardado nas metas
				</span>
				<span className="balance__value">
					{parts.integer}
					<span className="balance__cents text-[22px] leading-7">
						{parts.cents}
					</span>
				</span>
				<p className="text-(length:--text-size-small) pt-2 text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
					Disponível no saldo{" "}
					<b className="font-semibold text-[var(--color-text)]">
						{formatMoney(availableCents)}
					</b>
				</p>
			</section>
			<section
				className="flex flex-col gap-2 px-5 pb-32"
				aria-label="Suas metas"
			>
				{goals.map((goal) => (
					<GoalCard key={goal.id} goal={goal} />
				))}
			</section>
		</>
	);
}

// Linha de apoio sob o valor: data limite com a dica por mês, ou "Para manter guardado".
function tagFor(goal: Goal) {
	if (goal.reached) return null;
	if (goal.deadline) {
		const until = `Até ${formatShortDate(goal.deadline)}`;
		return goal.hint
			? `${until} · ${formatMoney(goal.hint.monthlyCents)} por mês`
			: until;
	}
	return goal.kind === "KEEP" ? "Para manter guardado" : null;
}

function GoalCard({ goal }: { goal: Goal }) {
	const percent = Math.min(
		100,
		Math.floor((goal.savedCents * 100) / goal.targetCents),
	);
	const tag = tagFor(goal);
	return (
		<button type="button" className="goal-card">
			<GoalRing percent={percent} done={goal.reached} />
			<span className="goal-card__text">
				<span className="goal-card__name">{goal.name}</span>
				<span className="goal-card__amount">
					<b>{formatMoney(goal.savedCents)}</b> de{" "}
					{formatMoney(goal.targetCents)}
				</span>
				{goal.reached ? (
					<span className="goal-card__tag">
						<span className="badge badge--accent">Meta atingida</span>
					</span>
				) : tag ? (
					<span className="goal-card__tag">{tag}</span>
				) : null}
			</span>
			<CaretRightIcon size={18} className="goal-card__chevron" aria-hidden />
		</button>
	);
}

// Carregando, com o mesmo desenho da tela pronta.
function Loading() {
	return (
		<div
			className="flex flex-1 flex-col"
			role="status"
			aria-busy="true"
			aria-label="Carregando"
		>
			<section className="flex flex-col gap-0.5 px-5 pt-4 pb-5">
				<span className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
					Guardado nas metas
				</span>
				<div className="skel !rounded-[var(--radius-md)] mt-2 h-10 w-[210px]" />
				<div className="skel mt-4 h-3 w-[220px]" />
			</section>
			<section className="flex flex-col gap-2 px-5">
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4"
					>
						<div className="skel !rounded-full size-14" />
						<div className="flex flex-1 flex-col gap-2">
							<div className="skel h-3 w-[140px]" />
							<div className="skel h-2.5 w-[170px]" />
						</div>
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
