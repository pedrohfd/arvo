import {
	type BalanceGoalMovement,
	type BalanceTransaction,
	computeBalance,
	goalMovementSign,
	isCreditPurchase,
} from "./balance";
import {
	addMonths,
	type CalendarDate,
	compareDates,
	lastDayOfMonth,
	monthKey,
} from "./dates";
import { assertCents } from "./money";

// Resumo do mês e Horizonte de saldos.
//
// "Saiu" e "Para onde foi" seguem a data da compra, inclusive no crédito. Guardar e resgatar não
// são gasto nem entrada: ficam fora de "Saiu" e de "Para onde foi", e o Resumo mostra a linha
// "Guardou" para a conta fechar (sobrou − guardou = saldo). Mês futuro usa só o que está agendado.

export type SummaryTransaction = BalanceTransaction & {
	categoryId: string;
	/** Cartão da compra no crédito (agrupa a fatura no Horizonte). */
	cardId?: string | null;
};

/** Mês como "AAAA-MM". */
export type MonthKey = string;

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function assertMonthKey(month: MonthKey) {
	if (!MONTH_PATTERN.test(month)) {
		throw new Error(`Mês inválido: "${month}" (use AAAA-MM)`);
	}
}

export function isFutureMonth(month: MonthKey, reference: CalendarDate) {
	assertMonthKey(month);
	return month > monthKey(reference);
}

export type MonthTotals = {
	month: MonthKey;
	/** Entrou no mês. */
	entrouCents: number;
	/** Saiu no mês, pela data da compra (o crédito conta aqui). */
	saiuCents: number;
	/** Entrou − saiu. Pode ser negativo ("Faltou"). */
	sobrouCents: number;
	/** Guardado nas metas no mês: guardar menos resgatar e concluir. */
	guardouCents: number;
	/** Compras no crédito feitas no mês (já incluídas em `saiuCents`). */
	creditCents: number;
};

export function monthTotals(
	transactions: readonly SummaryTransaction[],
	goalMovements: readonly BalanceGoalMovement[],
	month: MonthKey,
): MonthTotals {
	assertMonthKey(month);
	let entrou = 0;
	let saiu = 0;
	let credit = 0;
	for (const transaction of transactions) {
		assertCents(transaction.amountCents, "valor da transação");
		if (monthKey(transaction.date) !== month) continue;
		if (transaction.kind === "INCOME") {
			entrou += transaction.amountCents;
			continue;
		}
		saiu += transaction.amountCents;
		if (isCreditPurchase(transaction)) credit += transaction.amountCents;
	}

	let guardou = 0;
	for (const movement of goalMovements) {
		assertCents(movement.amountCents, "valor do movimento da meta");
		if (monthKey(movement.date) !== month) continue;
		guardou += goalMovementSign(movement.type) * movement.amountCents;
	}

	return {
		month,
		entrouCents: entrou,
		saiuCents: saiu,
		sobrouCents: entrou - saiu,
		guardouCents: guardou,
		creditCents: credit,
	};
}

export type CategorySpending = {
	categoryId: string;
	totalCents: number;
	/** Parte do total do mês, arredondada (0 a 100). */
	percent: number;
};

// "Para onde foi": as maiores categorias de saída do mês e uma linha "Outras" com o resto. A soma
// das linhas sempre fecha com o total. Com até `topN` categorias não há "Outras".
export function spendingByCategory(
	transactions: readonly SummaryTransaction[],
	month: MonthKey,
	topN = 5,
) {
	assertMonthKey(month);
	if (!Number.isInteger(topN) || topN < 1) {
		throw new Error("topN precisa ser um inteiro a partir de 1");
	}
	const byCategory = new Map<string, number>();
	let totalCents = 0;
	for (const transaction of transactions) {
		if (transaction.kind !== "EXPENSE") continue;
		if (monthKey(transaction.date) !== month) continue;
		assertCents(transaction.amountCents, "valor da transação");
		totalCents += transaction.amountCents;
		byCategory.set(
			transaction.categoryId,
			(byCategory.get(transaction.categoryId) ?? 0) + transaction.amountCents,
		);
	}

	const percentOf = (value: number) =>
		totalCents === 0 ? 0 : Math.round((value * 100) / totalCents);
	const sorted = [...byCategory.entries()].sort(
		([idA, a], [idB, b]) => b - a || (idA < idB ? -1 : 1),
	);
	const toRow = ([categoryId, value]: [string, number]): CategorySpending => ({
		categoryId,
		totalCents: value,
		percent: percentOf(value),
	});

	const categories = sorted.slice(0, topN).map(toRow);
	const rest = sorted.slice(topN);
	const othersTotal = rest.reduce((sum, [, value]) => sum + value, 0);
	return {
		totalCents,
		categories,
		others:
			rest.length > 0
				? {
						count: rest.length,
						totalCents: othersTotal,
						percent: percentOf(othersTotal),
					}
				: null,
	};
}

export type UpcomingItem<T extends SummaryTransaction = SummaryTransaction> =
	| { type: "TRANSACTION"; date: CalendarDate; transaction: T }
	| {
			type: "INVOICE";
			/** Vencimento da fatura: dia em que o saldo diminui. */
			date: CalendarDate;
			cardId: string | null;
			amountCents: number;
	  };

// "O que vem": o que está agendado depois da data de referência. Compra no crédito vira uma
// "Fatura" por cartão e vencimento (soma das compras que caem nela); o resto, uma linha cada.
export function upcomingItems<T extends SummaryTransaction>(
	transactions: readonly T[],
	reference: CalendarDate,
	until?: CalendarDate,
): UpcomingItem<T>[] {
	const items: UpcomingItem<T>[] = [];
	const invoices = new Map<
		string,
		{ date: CalendarDate; cardId: string | null; amountCents: number }
	>();

	for (const transaction of transactions) {
		assertCents(transaction.amountCents, "valor da transação");
		if (isCreditPurchase(transaction)) {
			const date = transaction.dueDate as CalendarDate;
			if (compareDates(date, reference) <= 0) continue;
			if (until && compareDates(date, until) > 0) continue;
			const key = `${transaction.cardId ?? ""}|${date}`;
			const invoice = invoices.get(key) ?? {
				date,
				cardId: transaction.cardId ?? null,
				amountCents: 0,
			};
			invoice.amountCents += transaction.amountCents;
			invoices.set(key, invoice);
			continue;
		}
		if (compareDates(transaction.date, reference) <= 0) continue;
		if (until && compareDates(transaction.date, until) > 0) continue;
		items.push({ type: "TRANSACTION", date: transaction.date, transaction });
	}
	for (const invoice of invoices.values()) {
		items.push({ type: "INVOICE", ...invoice });
	}
	return items.sort((a, b) => compareDates(a.date, b.date));
}

export type HorizonPoint = {
	month: MonthKey;
	/** Último dia do mês. */
	endDate: CalendarDate;
	balanceCents: number;
	belowMinimum: boolean;
};

// Horizonte: saldo previsto no fim de cada mês, de hoje até hoje + `monthsAhead`, contando só o
// que está agendado. Parte do saldo disponível de hoje (já sem o guardado nas metas) e tira a
// fatura no mês do vencimento. Sem nada agendado a linha fica reta no saldo atual.
export function forecastHorizon(input: {
	transactions: readonly SummaryTransaction[];
	goalMovements: readonly BalanceGoalMovement[];
	reference: CalendarDate;
	/** Saldo mínimo; 0 ou ausente = nenhum mês é marcado. */
	minimumCents?: number | null;
	monthsAhead?: number;
}): HorizonPoint[] {
	const monthsAhead = input.monthsAhead ?? 5;
	if (!Number.isInteger(monthsAhead) || monthsAhead < 0) {
		throw new Error("monthsAhead precisa ser um inteiro a partir de 0");
	}
	const minimum = input.minimumCents ?? 0;
	const start = computeBalance(
		{ transactions: input.transactions, goalMovements: input.goalMovements },
		input.reference,
	).balanceCents;
	const scheduled = upcomingItems(input.transactions, input.reference);

	return Array.from({ length: monthsAhead + 1 }, (_, offset) => {
		const endDate = lastDayOfMonth(addMonths(input.reference, offset));
		let balanceCents = start;
		for (const item of scheduled) {
			if (compareDates(item.date, endDate) > 0) break;
			if (item.type === "INVOICE") balanceCents -= item.amountCents;
			else if (item.transaction.kind === "INCOME") {
				balanceCents += item.transaction.amountCents;
			} else balanceCents -= item.transaction.amountCents;
		}
		return {
			month: monthKey(endDate),
			endDate,
			balanceCents,
			belowMinimum: minimum > 0 && balanceCents < minimum,
		};
	});
}
