import { formatMoney } from "@/lib/format";

// Guardar e Resgatar (telas 5.4 e 5.5 do Figma): o que a folha diz sob o valor e quais atalhos
// mostra. Os limites reais são conferidos de novo no servidor (`goal.deposit` e `goal.withdraw`).

export type GoalAmountMode = "deposit" | "withdraw";

export type GoalAmountContext = {
	/** Saldo atual: o teto de "Guardar". */
	availableCents: number;
	/** Guardado nesta meta: o teto de "Resgatar". */
	savedCents: number;
	targetCents: number;
};

export type AmountHint = {
	kind: "info" | "warn" | "error";
	text: string;
	/** Com o valor digitado não dá para confirmar. */
	blocked: boolean;
};

export function amountHint(
	mode: GoalAmountMode,
	cents: number,
	context: GoalAmountContext,
): AmountHint {
	if (mode === "withdraw") {
		if (cents > context.savedCents) {
			return {
				kind: "error",
				text: `Só tem ${formatMoney(context.savedCents)} guardado aqui.`,
				blocked: true,
			};
		}
		return {
			kind: "info",
			text: `Guardado ${formatMoney(context.savedCents)}`,
			blocked: false,
		};
	}

	if (cents > context.availableCents) {
		return {
			kind: "error",
			text: `Você só tem ${formatMoney(context.availableCents)} disponível.`,
			blocked: true,
		};
	}
	const over = context.savedCents + cents - context.targetCents;
	if (over > 0) {
		return {
			kind: "warn",
			text: `Passa ${formatMoney(over)} da meta. Pode guardar.`,
			blocked: false,
		};
	}
	return {
		kind: "info",
		text: `Disponível ${formatMoney(context.availableCents)}`,
		blocked: false,
	};
}

export type QuickAmount = { label: string; cents: number };

const FIXED = [5000, 10_000];

/** Atalhos sob o valor: R$ 50 e R$ 100, mais "O que falta" (guardar) ou "Tudo" (resgatar). */
export function quickAmounts(
	mode: GoalAmountMode,
	context: GoalAmountContext,
): QuickAmount[] {
	const fixed = FIXED.map((cents) => ({ label: formatMoney(cents), cents }));
	if (mode === "withdraw") {
		return context.savedCents > 0
			? [
					...fixed,
					{
						label: `Tudo · ${formatMoney(context.savedCents)}`,
						cents: context.savedCents,
					},
				]
			: fixed;
	}
	const missing = context.targetCents - context.savedCents;
	return missing > 0
		? [
				...fixed,
				{ label: `O que falta · ${formatMoney(missing)}`, cents: missing },
			]
		: fixed;
}

/** Centavos de volta para o texto do teclado (12050 → "120,5"; 12000 → "120"). */
export function centsToRaw(cents: number) {
	if (cents <= 0) return "";
	const reais = Math.floor(cents / 100);
	const rest = cents % 100;
	if (rest === 0) return String(reais);
	return `${reais},${String(rest).padStart(2, "0").replace(/0$/, "")}`;
}
