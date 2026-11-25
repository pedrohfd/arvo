import { todayInSaoPaulo } from "@arvo/api/lib/calendar";
import type { AppRouter } from "@arvo/api/routers/index";
import { cn } from "@arvo/ui/lib/utils";
import {
	CaretRightIcon,
	CheckIcon,
	PlusIcon,
	TargetIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";

import { GoalFormSheet } from "@/components/goal/goal-form-sheet";
import { GoalRing } from "@/components/goal-ring";
import {
	dayLabel,
	formatMoney,
	formatShortDate,
	moneyParts,
} from "@/lib/format";
import { useCollapse } from "@/lib/use-collapse";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/metas/")({
	component: Metas,
});

type Goal = inferRouterOutputs<AppRouter>["goal"]["list"][number];

// Tela 5.1 do Figma (página "Arvo · 5 Metas"): lista, vazio, meta atingida, carregando e não
// carregou, com a "Nova meta" (5.3), as "Concluídas" (5.6) e o gesto de recolher o resumo (5.1
// "lista recolhida", no celular). Ainda não existe o aviso de sem internet.
function Metas() {
	const [creating, setCreating] = useState(false);
	const goals = useQuery(trpc.goal.list.queryOptions());
	// "Disponível no saldo" é o saldo atual da Início (o que está guardado já saiu dele).
	const home = useQuery(trpc.summary.home.queryOptions());

	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))] max-sm:h-svh">
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
					goals={goals.data}
					availableCents={home.data.balance.balanceCents}
					onNew={() => setCreating(true)}
				/>
			)}
			{creating ? <GoalFormSheet onClose={() => setCreating(false)} /> : null}
		</div>
	);
}

function Header({
	onNew,
	compactText,
	showCompact,
}: {
	onNew?: () => void;
	/** Valor guardado, compacto ao lado do título; aparece quando o grande saiu da tela. */
	compactText?: string;
	showCompact?: boolean;
}) {
	return (
		<div className="flex h-11 shrink-0 items-center justify-between pt-1 pr-3 pl-5">
			<h1 className="display text-(length:--text-size-display) leading-[var(--text-leading-display)]">
				Metas
			</h1>
			<span
				className={cn(
					"!text-left top-bar__balance",
					!showCompact && "is-hidden",
				)}
				aria-hidden={!showCompact}
			>
				{compactText}
			</span>
			{onNew ? (
				<button
					type="button"
					className="month-btn !h-10 !px-4 !gap-2 font-semibold text-[var(--color-text)]"
					onClick={onNew}
				>
					<PlusIcon size={18} aria-hidden />
					Nova meta
				</button>
			) : null}
		</div>
	);
}

function Ready({
	goals: allGoals,
	availableCents,
	onNew,
}: {
	goals: Goal[];
	availableCents: number;
	onNew: () => void;
}) {
	const goals = allGoals.filter((goal) => !goal.completedAt);
	const completed = allGoals.filter((goal) => goal.completedAt);
	const { scrollRef, targetRef, collapsed } = useCollapse();

	if (allGoals.length === 0) {
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
						<button
							type="button"
							className="btn-secondary empty__action"
							onClick={onNew}
						>
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
			<Header
				onNew={onNew}
				compactText={formatMoney(savedCents)}
				showCompact={collapsed}
			/>
			<div className="collapse-area" ref={scrollRef}>
				<section className="flex flex-col gap-0.5 px-5 pt-4 pb-5">
					<span className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
						Guardado nas metas
					</span>
					<span className="balance__value" ref={targetRef}>
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
					{completed.length > 0 ? (
						<>
							<h2 className="text-(length:--text-size-label) px-1 pt-3 font-semibold text-[var(--color-text-muted)] uppercase leading-[var(--text-leading-label)] tracking-[var(--text-tracking-label)]">
								Concluídas · {completed.length}
							</h2>
							{completed.map((goal) => (
								<CompletedCard key={goal.id} goal={goal} />
							))}
						</>
					) : null}
				</section>
			</div>
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
		<Link
			to="/metas/$goalId"
			params={{ goalId: goal.id }}
			className="goal-card"
		>
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
		</Link>
	);
}

// Meta concluída: o valor já voltou ao saldo (o guardado dela é 0), então "Juntou" mostra o alvo.
// Sem toque: o detalhe de uma meta concluída não tem desenho no Figma.
function CompletedCard({ goal }: { goal: Goal }) {
	const when = goal.completedAt
		? dayLabel(goal.completedAt, todayInSaoPaulo()).toLowerCase()
		: "";
	return (
		<div className="goal-card">
			<span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-fill-1)]">
				<CheckIcon size={26} aria-hidden />
			</span>
			<span className="goal-card__text">
				<span className="goal-card__name">{goal.name}</span>
				<span className="goal-card__amount">
					Juntou {formatMoney(goal.targetCents)}
				</span>
				<span className="goal-card__tag">
					Concluída {when} · voltou ao saldo
				</span>
			</span>
		</div>
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
