import { type CalendarDate, compareDates } from "./dates";
import { assertCents } from "./money";

// Saldo = entrou − saiu − guardado nas metas + crédito a pagar. Nunca é armazenado.
//
// "Saiu" segue a data da compra, inclusive no crédito; o "crédito a pagar" devolve ao saldo as
// compras que ainda não venceram. Na prática: compra no crédito só reduz o saldo no vencimento
// da fatura, e data futura só entra quando a data chega (inclusive no próprio dia).

export type Flow = "EXPENSE" | "INCOME";

export type BalanceTransaction = {
	kind: Flow;
	amountCents: number;
	/** Dia da compra ou do recebimento. */
	date: CalendarDate;
	/** Compra no crédito: vencimento da fatura que a recebe. Nulo nos demais casos. */
	dueDate?: CalendarDate | null;
};

export type GoalMovementType = "DEPOSIT" | "WITHDRAW" | "COMPLETE";

export type BalanceGoalMovement = {
	type: GoalMovementType;
	amountCents: number;
	date: CalendarDate;
};

export type BalanceBreakdown = {
	balanceCents: number;
	/** Soma das entradas até a data. */
	entrouCents: number;
	/** Soma das saídas até a data (compra no crédito conta na data da compra). */
	saiuCents: number;
	/** Valor reservado nas metas até a data. */
	guardadoCents: number;
	/** Compras no crédito já feitas e ainda não vencidas. */
	creditToPayCents: number;
};

export function isCreditPurchase(transaction: BalanceTransaction) {
	return transaction.kind === "EXPENSE" && Boolean(transaction.dueDate);
}

// Guardar soma ao reservado; resgatar e concluir devolvem ao saldo.
export function goalMovementSign(type: GoalMovementType) {
	return type === "DEPOSIT" ? 1 : -1;
}

export function computeBalance(
	input: {
		transactions: readonly BalanceTransaction[];
		goalMovements?: readonly BalanceGoalMovement[];
	},
	reference: CalendarDate,
): BalanceBreakdown {
	let entrou = 0;
	let saiu = 0;
	let creditToPay = 0;
	for (const transaction of input.transactions) {
		assertCents(transaction.amountCents, "valor da transação");
		if (compareDates(transaction.date, reference) > 0) continue;
		if (transaction.kind === "INCOME") entrou += transaction.amountCents;
		else saiu += transaction.amountCents;
		if (
			isCreditPurchase(transaction) &&
			compareDates(transaction.dueDate as CalendarDate, reference) > 0
		) {
			creditToPay += transaction.amountCents;
		}
	}

	let guardado = 0;
	for (const movement of input.goalMovements ?? []) {
		assertCents(movement.amountCents, "valor do movimento da meta");
		if (compareDates(movement.date, reference) > 0) continue;
		guardado += goalMovementSign(movement.type) * movement.amountCents;
	}

	return {
		balanceCents: entrou - saiu - guardado + creditToPay,
		entrouCents: entrou,
		saiuCents: saiu,
		guardadoCents: guardado,
		creditToPayCents: creditToPay,
	};
}

// "No crédito, a pagar": total ainda não vencido e a fatura que vence primeiro.
export function creditToPaySummary(
	transactions: readonly BalanceTransaction[],
	reference: CalendarDate,
) {
	let totalCents = 0;
	let nextDueDate: CalendarDate | null = null;
	for (const transaction of transactions) {
		if (!isCreditPurchase(transaction)) continue;
		const dueDate = transaction.dueDate as CalendarDate;
		if (compareDates(transaction.date, reference) > 0) continue;
		if (compareDates(dueDate, reference) <= 0) continue;
		totalCents += transaction.amountCents;
		if (nextDueDate === null || compareDates(dueDate, nextDueDate) < 0) {
			nextDueDate = dueDate;
		}
	}
	return { totalCents, nextDueDate };
}
