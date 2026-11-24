import { monthlyHint } from "@arvo/api/rules/goals";

import { pressKey, toCents } from "@/lib/amount-input";
import { formatMoney, formatShortDate } from "@/lib/format";

// Formulário de nova/editar meta (tela 5.3 do Figma): o valor digitado no campo, os erros e a dica
// sob a data limite. O servidor confere tudo de novo (`goal.create` e `goal.update`).

/**
 * O texto do campo "Valor da meta" vira o mesmo texto do teclado do Registrar ("1.500,5" →
 * "1500,5"): só dígitos e uma vírgula, com o limite e as 2 casas de lá. O ponto é separador de
 * milhar ("1.500,00"), salvo sem vírgula e com 1 ou 2 dígitos no fim ("12.5" é 12,5).
 */
export function typedToRaw(text: string) {
	const normalized =
		!text.includes(",") && /\.\d{1,2}$/.test(text)
			? text.replace(/\.(\d{1,2})$/, ",$1")
			: text;
	let raw = "";
	for (const char of normalized) {
		if (/^\d$/.test(char)) raw = pressKey(raw, char as "0");
		else if (char === ",") raw = pressKey(raw, ",");
	}
	return raw;
}

/** "500,00" (com milhar, "1.500,00"): como o valor fica no campo depois de sair dele. */
export function formatTarget(raw: string) {
	const cents = toCents(raw);
	if (cents === 0) return "";
	return (cents / 100).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export type GoalFormErrors = { name?: string; target?: string };

export function validateGoalForm(input: {
	name: string;
	targetCents: number;
}): GoalFormErrors {
	const errors: GoalFormErrors = {};
	if (input.name.trim() === "") errors.name = "Dê um nome para a meta.";
	if (input.targetCents <= 0) errors.target = "Diga quanto você quer juntar.";
	return errors;
}

/** "R$ 250,00 por mês, de agora até 15/01." Vazio sem data, com a data já passada ou meta batida. */
export function deadlineHint(input: {
	targetCents: number;
	savedCents: number;
	deadline: string | null;
	today: string;
}) {
	// `monthlyHint` recusa meta sem valor.
	if (input.targetCents <= 0) return null;
	const hint = monthlyHint({
		targetCents: input.targetCents,
		savedCents: input.savedCents,
		deadline: input.deadline,
		reference: input.today,
	});
	if (!hint) return null;
	return `${formatMoney(hint.monthlyCents)} por mês, de agora até ${formatShortDate(hint.deadline)}.`;
}
