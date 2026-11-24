export type CardType = "CREDIT" | "DEBIT";

export type CardFormErrors = {
	name?: string;
	last4?: string;
	closingDay?: string;
	dueDay?: string;
};

// Só dígitos, no máximo 4: o campo "Últimos 4 dígitos" não aceita mais que isso.
export function onlyLast4(text: string) {
	return text.replace(/\D/g, "").slice(0, 4);
}

export function validateCardForm(input: {
	name: string;
	type: CardType;
	last4: string;
	closingDay: number | null;
	dueDay: number | null;
}): CardFormErrors {
	const errors: CardFormErrors = {};
	if (input.name.trim() === "") errors.name = "Dê um nome ao cartão";
	if (input.last4 !== "" && input.last4.length !== 4) {
		errors.last4 = "Use os 4 últimos dígitos";
	}
	if (input.type === "CREDIT") {
		if (input.closingDay === null) errors.closingDay = "Escolha o dia";
		if (input.dueDay === null) errors.dueDay = "Escolha o dia";
	}
	return errors;
}

/** Dica sob o "Vence dia": a partir de que dia a compra cai na fatura seguinte. */
export function closingHint(closingDay: number | null) {
	if (closingDay === null) return null;
	const next = closingDay >= 31 ? 1 : closingDay + 1;
	return `Compras a partir do dia ${next} entram na fatura do mês seguinte. Melhor dia de compra: ${next}.`;
}
