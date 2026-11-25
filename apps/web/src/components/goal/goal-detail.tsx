import type { AppRouter } from "@arvo/api/routers/index";
import { cn } from "@arvo/ui/lib/utils";
import {
	ArrowUpRightIcon,
	PencilSimpleIcon,
	PiggyBankIcon,
} from "@phosphor-icons/react";
import type { inferRouterOutputs } from "@trpc/server";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { GoalAmountSheet } from "@/components/goal/goal-amount-sheet";
import { GoalCompleteSheet } from "@/components/goal/goal-complete-sheet";
import { GoalFormSheet } from "@/components/goal/goal-form-sheet";
import { GoalRing } from "@/components/goal-ring";
import { formatMoney, formatShortDate } from "@/lib/format";
import type { GoalAmountMode } from "@/lib/goal-amount";

export type Goal = inferRouterOutputs<AppRouter>["goal"]["get"];
type Movement = Goal["movements"][number];

// O detalhe de uma meta (tela 5.2): a página no celular e o painel de 400 px no computador (D3.1).
export function GoalDetail({
	goal,
	availableCents,
	variant = "page",
}: {
	goal: Goal;
	/** Saldo atual; nulo enquanto carrega (sem ele não dá para guardar). */
	availableCents: number | null;
	/** "page": a tela do celular; "panel": o painel de 400 px do computador. */
	variant?: "page" | "panel";
}) {
	const panel = variant === "panel";
	const [sheet, setSheet] = useState<GoalAmountMode | null>(null);
	const [completing, setCompleting] = useState(false);
	const [editing, setEditing] = useState(false);
	const percent = Math.min(
		100,
		Math.floor((goal.savedCents * 100) / goal.targetCents),
	);
	const missingCents = Math.max(0, goal.targetCents - goal.savedCents);
	// "Para gastar" atingida: o rodapé troca Guardar por Concluir meta (5.6).
	const canComplete = goal.reached && goal.kind === "SPEND";
	const canDeposit =
		!goal.completedAt && !canComplete && availableCents !== null;

	// Computador: G abre o Guardar, a não ser que haja um campo ou um diálogo aberto.
	const depositRef = useRef(() => {});
	depositRef.current = () => setSheet("deposit");
	useEffect(() => {
		if (!panel || !canDeposit) return;
		function onKey(event: KeyboardEvent) {
			if (event.key.toLowerCase() !== "g" || event.defaultPrevented) return;
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			const target = event.target as HTMLElement | null;
			if (target?.closest("input, textarea, select, [contenteditable]")) return;
			if (document.querySelector('[role="dialog"]')) return;
			event.preventDefault();
			depositRef.current();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [panel, canDeposit]);

	const badges = (
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
	);
	const note = canComplete ? (
		<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
			Chegou lá! Conclua para o valor voltar ao saldo.
		</p>
	) : goal.hint ? (
		<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
			{formatMoney(goal.hint.monthlyCents)} por mês para chegar lá.
		</p>
	) : null;
	const summary = (
		<p className="text-(length:--text-size-body) text-[var(--color-text-muted)] leading-[var(--text-leading-headline)]">
			<b className="font-semibold text-[var(--color-text)]">
				{formatMoney(goal.savedCents)}
			</b>{" "}
			de {formatMoney(goal.targetCents)}
			{goal.reached ? "" : ` · faltam ${formatMoney(missingCents)}`}
		</p>
	);
	const history =
		goal.movements.length === 0 ? (
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
		);

	return (
		<>
			{panel ? (
				<div className="flex flex-1 flex-col">
					<header className="detail-panel__head">
						<p className="detail-panel__eyebrow">Meta</p>
						<button
							type="button"
							className="icon-btn"
							aria-label="Editar meta"
							onClick={() => setEditing(true)}
						>
							<PencilSimpleIcon size={22} aria-hidden />
						</button>
					</header>
					<section className="flex flex-col items-center gap-2 pt-2 pb-5 text-center">
						<GoalRing percent={percent} size={160} done={goal.reached} />
						<h2 className="detail-panel__title pt-2">{goal.name}</h2>
						{summary}
						{badges}
						{note}
					</section>
					<section aria-label="Histórico">
						<h3 className="sheet__title mb-1">Histórico</h3>
						{history}
					</section>
				</div>
			) : (
				<>
					<section className="flex flex-col items-center gap-2 px-5 pt-2 pb-5 text-center">
						<GoalRing percent={percent} size={160} done={goal.reached} />
						<h1 className="sheet__title pt-2 text-center">{goal.name}</h1>
						{summary}
						{badges}
						{note}
					</section>

					<section className="sheet" aria-label="Histórico">
						<div className="sheet__head">
							<h2 className="sheet__title">Histórico</h2>
						</div>
						{history}
					</section>
				</>
			)}

			{/* Meta concluída não recebe mais movimentos: sem rodapé de ações. */}
			{goal.completedAt ? null : (
				<div className={panel ? "mt-auto flex pt-6" : "footer-float"}>
					<div
						className={cn(
							"flex w-full items-start gap-3",
							!panel && "max-w-[640px] px-2",
						)}
					>
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
								className={cn(
									"flex-1",
									panel ? "btn-secondary" : "btn-primary",
								)}
								onClick={() => setCompleting(true)}
							>
								Concluir meta
							</button>
						) : (
							<button
								type="button"
								className={cn(
									"flex-1",
									panel ? "btn-secondary" : "btn-primary",
								)}
								disabled={availableCents === null}
								onClick={() => setSheet("deposit")}
							>
								{panel ? <PiggyBankIcon size={18} aria-hidden /> : null}
								Guardar
								{panel ? <kbd className="kbd">G</kbd> : null}
							</button>
						)}
					</div>
				</div>
			)}

			{editing ? (
				<GoalFormSheet goal={goal} onClose={() => setEditing(false)} />
			) : null}
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
