import { cn } from "@arvo/ui/lib/utils";
import { BackspaceIcon, XIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Grabber } from "@/components/register/parts";
import {
	type AmountKey,
	displayParts,
	isAtLimit,
	pressKey,
	toCents,
} from "@/lib/amount-input";
import { formatMoney } from "@/lib/format";
import {
	amountHint,
	centsToRaw,
	type GoalAmountContext,
	type GoalAmountMode,
	quickAmounts,
} from "@/lib/goal-amount";
import { queryClient, trpc } from "@/utils/trpc";

const KEYS: AmountKey[] = [
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	",",
	"0",
	"back",
];

// O valor encolhe conforme cresce, para caber na largura.
function amountSize(text: string) {
	if (text.length <= 9) return 56;
	if (text.length <= 12) return 48;
	return 42;
}

// Guardar e resgatar mexem no saldo e nas metas: tudo o que depende disso recarrega.
function refreshMoney() {
	queryClient.invalidateQueries(trpc.goal.pathFilter());
	queryClient.invalidateQueries(trpc.summary.pathFilter());
}

// Folhas 5.4 (Guardar) e 5.5 (Resgatar) do Figma: valor com teclado, atalhos e o aviso sob o
// valor. O servidor confere os limites de novo; a folha só evita o erro e explica o motivo.
export function GoalAmountSheet({
	mode,
	goal,
	availableCents,
	onClose,
}: {
	mode: GoalAmountMode;
	goal: { id: string; name: string; savedCents: number; targetCents: number };
	availableCents: number;
	onClose: () => void;
}) {
	const [raw, setRaw] = useState("");
	const dialogRef = useRef<HTMLDivElement>(null);
	const deposit = mode === "deposit";

	const context: GoalAmountContext = {
		availableCents,
		savedCents: goal.savedCents,
		targetCents: goal.targetCents,
	};
	const cents = toCents(raw);
	const hint = amountHint(mode, cents, context);
	const atLimit = isAtLimit(raw);
	const canConfirm = cents > 0 && !hint.blocked;
	const { typed, ghost } = displayParts(raw);

	const onSuccess = () => {
		refreshMoney();
		toast.success(
			deposit
				? `${formatMoney(cents)} guardados em ${goal.name}`
				: `${formatMoney(cents)} de volta ao saldo`,
		);
		onClose();
	};
	const onError = (error: { message: string }) => toast.error(error.message);
	const depositMutation = useMutation(
		trpc.goal.deposit.mutationOptions({ onSuccess, onError }),
	);
	const withdrawMutation = useMutation(
		trpc.goal.withdraw.mutationOptions({ onSuccess, onError }),
	);
	const pending = depositMutation.isPending || withdrawMutation.isPending;

	function confirm() {
		if (!canConfirm || pending) return;
		const input = { goalId: goal.id, amountCents: cents };
		if (deposit) depositMutation.mutate(input);
		else withdrawMutation.mutate(input);
	}

	// Segura a rolagem da tela de trás e leva o foco para a folha.
	useEffect(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		dialogRef.current?.focus();
		return () => {
			document.body.style.overflow = previous;
		};
	}, []);

	// Teclado do computador: dígitos, vírgula (ou ponto), Backspace, Enter e Esc.
	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (event.key === "Escape") onClose();
			else if (/^\d$/.test(event.key))
				setRaw((value) => pressKey(value, event.key as AmountKey));
			else if (event.key === "," || event.key === ".")
				setRaw((value) => pressKey(value, ","));
			else if (event.key === "Backspace")
				setRaw((value) => pressKey(value, "back"));
			else if (event.key === "Enter") confirm();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	const title = deposit
		? `Guardar em ${goal.name}`
		: `Resgatar de ${goal.name}`;

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

				<div className="amount-entry flex flex-1 flex-col items-center justify-center">
					<div
						className="amount-entry__value"
						style={{
							fontSize: amountSize(typed + ghost),
							lineHeight: "64px",
						}}
						aria-live="polite"
					>
						{typed}
						<span className="ghost">{ghost}</span>
					</div>
					<p
						className={cn(
							"amount-entry__hint h-5",
							hint.kind === "error" && "amount-entry__hint--problem",
							hint.kind === "warn" && "text-[var(--color-warn-text)]",
						)}
					>
						{atLimit ? "Esse é o valor máximo." : hint.text}
					</p>
					<div className="mt-3 flex max-w-[350px] flex-wrap justify-center gap-2">
						{quickAmounts(mode, context).map((quick) => (
							<button
								key={quick.label}
								type="button"
								aria-pressed={cents === quick.cents}
								className={cn("choice", cents === quick.cents && "is-selected")}
								onClick={() => setRaw(centsToRaw(quick.cents))}
							>
								{quick.label}
							</button>
						))}
					</div>
				</div>

				<div className="keypad shrink-0">
					{KEYS.map((key) => (
						<button
							key={key}
							type="button"
							className="key"
							aria-label={
								key === "back" ? "Apagar" : key === "," ? "Vírgula" : key
							}
							disabled={key !== "back" && atLimit}
							onClick={() => setRaw((value) => pressKey(value, key))}
						>
							{key === "back" ? (
								<BackspaceIcon size={26} aria-hidden />
							) : key === "," ? (
								// A vírgula do teclado fica na linha de baixo, como no Figma.
								<span className="translate-y-2">,</span>
							) : (
								key
							)}
						</button>
					))}
				</div>

				<div className="shrink-0 px-5 pt-3 pb-6">
					<button
						type="button"
						className="btn-primary btn-primary--block"
						disabled={!canConfirm || pending}
						onClick={confirm}
					>
						{deposit ? "Guardar" : "Resgatar"}
					</button>
				</div>
			</div>
		</div>
	);
}
