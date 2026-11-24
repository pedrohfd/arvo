import { todayInSaoPaulo } from "@arvo/api/lib/calendar";
import { cn } from "@arvo/ui/lib/utils";
import {
	CalendarBlankIcon,
	CaretDownIcon,
	CheckCircleIcon,
	WarningCircleIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DEFAULT_GOAL_ICON, GOAL_ICONS } from "@/components/goal/goal-icon";
import { DateSheet } from "@/components/register/date-sheet";
import { Grabber } from "@/components/register/parts";
import { toCents } from "@/lib/amount-input";
import { centsToRaw } from "@/lib/goal-amount";
import {
	deadlineHint,
	formatTarget,
	type GoalFormErrors,
	typedToRaw,
	validateGoalForm,
} from "@/lib/goal-form";
import { dateFieldLabel } from "@/lib/register";
import { queryClient, trpc } from "@/utils/trpc";

type GoalKind = "SPEND" | "KEEP";

export type EditableGoal = {
	id: string;
	name: string;
	kind: GoalKind;
	targetCents: number;
	deadline: string | null;
	savedCents: number;
};

const KINDS: { kind: GoalKind; title: string; description: string }[] = [
	{
		kind: "SPEND",
		title: "Vou gastar",
		description: "O valor volta para o seu saldo quando você concluir",
	},
	{
		kind: "KEEP",
		title: "Vou manter guardado",
		description: "Fica reservado até você resgatar numa necessidade",
	},
];

// Telas 5.3 do Figma: "Nova meta" (ícone, nome, valor, data limite e o que acontece ao chegar lá)
// e "Editar meta" (sem o ícone e com o tipo travado). Fica de fora o "Apagar meta" da edição: o
// Figma ainda não tem a folha de confirmação.
export function GoalFormSheet({
	goal,
	onClose,
}: {
	/** Sem meta é "Nova meta"; com meta é "Editar meta". */
	goal?: EditableGoal;
	onClose: () => void;
}) {
	const editing = goal !== undefined;
	const today = todayInSaoPaulo();
	const dialogRef = useRef<HTMLDivElement>(null);

	const [icon, setIcon] = useState(DEFAULT_GOAL_ICON);
	const [name, setName] = useState(goal?.name ?? "");
	const [targetText, setTargetText] = useState(
		goal ? formatTarget(centsToRaw(goal.targetCents)) : "",
	);
	const [deadline, setDeadline] = useState<string | null>(
		goal?.deadline ?? null,
	);
	const [kind, setKind] = useState<GoalKind>(goal?.kind ?? "SPEND");
	const [dateOpen, setDateOpen] = useState(false);
	// Os erros só aparecem depois de tocar no botão, e saem sozinhos conforme o campo é corrigido.
	const [submitted, setSubmitted] = useState(false);

	const targetCents = toCents(typedToRaw(targetText));
	const errors: GoalFormErrors = submitted
		? validateGoalForm({ name, targetCents })
		: {};
	const hint = deadlineHint({
		targetCents,
		savedCents: goal?.savedCents ?? 0,
		deadline,
		today,
	});

	const onSuccess = () => {
		queryClient.invalidateQueries(trpc.goal.pathFilter());
		toast.success(editing ? "Meta atualizada" : "Meta criada");
		onClose();
	};
	const onError = (error: { message: string }) => toast.error(error.message);
	const create = useMutation(
		trpc.goal.create.mutationOptions({ onSuccess, onError }),
	);
	const update = useMutation(
		trpc.goal.update.mutationOptions({ onSuccess, onError }),
	);
	const pending = create.isPending || update.isPending;

	function submit() {
		setSubmitted(true);
		if (Object.keys(validateGoalForm({ name, targetCents })).length > 0) return;
		if (pending) return;
		if (goal) {
			update.mutate({
				id: goal.id,
				name: name.trim(),
				targetCents,
				deadline,
			});
		} else {
			create.mutate({ name: name.trim(), icon, kind, targetCents, deadline });
		}
	}

	// Fecha com Esc (a folha de data, por cima, pega o Esc antes), segura a rolagem da tela de trás
	// e leva o foco para a folha.
	useEffect(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		dialogRef.current?.focus();
		function onKey(event: KeyboardEvent) {
			if (event.key === "Escape" && !event.defaultPrevented) onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = previous;
			window.removeEventListener("keydown", onKey);
		};
	}, [onClose]);

	const title = editing ? "Editar meta" : "Nova meta";

	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)]">
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label={title}
				tabIndex={-1}
				className="relative flex h-[calc(100svh-56px)] w-full max-w-[480px] flex-col rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-strong)] outline-none"
			>
				<Grabber />
				<div className="flex h-14 shrink-0 items-center gap-2 px-3 pt-1 pb-2">
					<button
						type="button"
						className="icon-btn"
						aria-label="Fechar"
						onClick={onClose}
					>
						<XIcon size={22} aria-hidden />
					</button>
					<h2 className="text-(length:--text-size-headline) min-w-0 flex-1 truncate text-center font-semibold leading-[var(--text-leading-headline)]">
						{title}
					</h2>
					<span className="size-11" aria-hidden />
				</div>

				<div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-4">
					{editing ? null : (
						<fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
							<legend className="field__label mb-2 p-0">Ícone</legend>
							<div className="icon-grid">
								{GOAL_ICONS.map((option) => {
									const selected = option.name === icon;
									return (
										<button
											key={option.name}
											type="button"
											aria-pressed={selected}
											aria-label={option.label}
											className={cn(
												"icon-opt",
												selected &&
													"is-selected shadow-[inset_0_0_0_1px_var(--color-focus)]",
											)}
											onClick={() => setIcon(option.name)}
										>
											<option.Icon
												size={24}
												weight={selected ? "fill" : "regular"}
												aria-hidden
											/>
										</button>
									);
								})}
							</div>
						</fieldset>
					)}

					<div className={cn("field", errors.name && "field--error")}>
						<label className="field__label" htmlFor="goal-name">
							Nome
						</label>
						<div className="field__control">
							<input
								id="goal-name"
								value={name}
								maxLength={40}
								placeholder="Ex.: Viagem, Notebook, Reserva"
								aria-invalid={errors.name ? true : undefined}
								aria-describedby={errors.name ? "goal-name-error" : undefined}
								onChange={(event) => setName(event.target.value)}
							/>
						</div>
						{errors.name ? (
							<p className="field__error" id="goal-name-error" role="alert">
								<WarningCircleIcon size={16} aria-hidden />
								{errors.name}
							</p>
						) : null}
					</div>

					<div className={cn("field", errors.target && "field--error")}>
						<label className="field__label" htmlFor="goal-target">
							Valor da meta
						</label>
						<div className="field__control !h-[52px]">
							<span aria-hidden>R$</span>
							<input
								id="goal-target"
								inputMode="decimal"
								value={targetText}
								placeholder="0,00"
								aria-invalid={errors.target ? true : undefined}
								aria-describedby={
									errors.target ? "goal-target-error" : undefined
								}
								onFocus={() => setTargetText(typedToRaw(targetText))}
								onChange={(event) =>
									setTargetText(typedToRaw(event.target.value))
								}
								onBlur={() =>
									setTargetText(formatTarget(typedToRaw(targetText)))
								}
							/>
						</div>
						{errors.target ? (
							<p className="field__error" id="goal-target-error" role="alert">
								<WarningCircleIcon size={16} aria-hidden />
								{errors.target}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-2">
						<div className="field field--select">
							<span className="field__label" id="goal-deadline-label">
								Data limite <small>· opcional</small>
							</span>
							<button
								type="button"
								className="field__control !h-[52px] !gap-3 text-left"
								aria-labelledby="goal-deadline-label"
								aria-haspopup="dialog"
								onClick={() => setDateOpen(true)}
							>
								<CalendarBlankIcon size={24} aria-hidden />
								<span className="field__value">
									{deadline
										? dateFieldLabel(deadline, today)
										: "Sem data limite"}
								</span>
								<CaretDownIcon size={24} aria-hidden />
							</button>
						</div>
						{hint ? (
							<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
								{hint}
							</p>
						) : null}
					</div>

					<fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
						<legend className="field__label mb-2 p-0">
							O que acontece quando chegar lá?
						</legend>
						<div>
							{KINDS.map((option) => {
								const selected = option.kind === kind;
								return (
									<button
										key={option.kind}
										type="button"
										aria-pressed={selected}
										disabled={editing}
										className={cn(
											"option-card",
											selected &&
												"is-selected shadow-[inset_0_0_0_1px_var(--color-focus)]",
										)}
										onClick={() => setKind(option.kind)}
									>
										<span className="option-card__text">
											<span className="option-card__title">{option.title}</span>
											<span className="option-card__desc">
												{option.description}
											</span>
										</span>
										<span className="option-card__mark" aria-hidden>
											{selected ? (
												<CheckCircleIcon size={24} weight="fill" />
											) : (
												<i />
											)}
										</span>
									</button>
								);
							})}
						</div>
						{editing ? (
							<p className="text-(length:--text-size-small) pt-2 text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
								O tipo não muda depois do primeiro depósito.
							</p>
						) : null}
					</fieldset>
				</div>

				<div className="shrink-0 px-5 pt-3 pb-6">
					<button
						type="button"
						className={cn(
							"btn-primary btn-primary--block",
							pending && "is-loading",
						)}
						disabled={pending}
						onClick={submit}
					>
						<span>{editing ? "Salvar alterações" : "Criar meta"}</span>
						{pending ? (
							<span className="spinner" role="status" aria-label="Salvando" />
						) : null}
					</button>
				</div>

				{dateOpen ? (
					<DateSheet
						title="Data limite"
						value={deadline}
						today={today}
						shortcuts={false}
						minDate={today}
						onSelect={(picked) => {
							setDeadline(picked);
							setDateOpen(false);
						}}
						onClear={() => {
							setDeadline(null);
							setDateOpen(false);
						}}
						onClose={() => setDateOpen(false)}
					/>
				) : null}
			</div>
		</div>
	);
}
