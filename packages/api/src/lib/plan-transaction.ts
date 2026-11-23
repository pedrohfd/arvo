import { addMonths, type CalendarDate, parseDate } from "../rules/dates";
import { dueDateForPurchase, type PurchaseCard } from "../rules/invoice";
import { assertPositiveAmount } from "../rules/money";
import { generateOccurrences, type SeriesKind } from "../rules/recurrence";

export type PlanInput = {
	kind: "EXPENSE" | "INCOME";
	amountCents: number;
	date: CalendarDate;
	paymentMethod: "CARD" | "PIX" | "CASH" | "DEPOSIT";
	/** Só no cartão. */
	card: PurchaseCard | null;
	/** "Repetir": o mesmo valor a cada N meses; `count` nulo = sem fim. */
	repeat?: { intervalMonths: number; count: number | null };
	/** Parcelamento (só crédito): `amountCents` é o valor de cada parcela. */
	installments?: { count: number };
};

export type PlannedRow = {
	index: number;
	date: CalendarDate;
	dueDate: CalendarDate | null;
	amountCents: number;
};

export type TransactionPlan = {
	series: {
		kind: SeriesKind;
		intervalMonths: number;
		anchorDay: number;
		startDate: CalendarDate;
		count: number | null;
	} | null;
	rows: PlannedRow[];
};

// Decide, sem tocar no banco, quais transações (e qual série) um registro gera. Lança `Error` com
// mensagem em português para combinações que não existem.
export function planTransaction(
	input: PlanInput,
	today: CalendarDate,
): TransactionPlan {
	assertPositiveAmount(input.amountCents);
	const { day } = parseDate(input.date);

	if (input.paymentMethod === "CARD" && !input.card) {
		throw new Error("Escolha o cartão");
	}
	if (input.paymentMethod !== "CARD" && input.card) {
		throw new Error("Só compras no cartão têm cartão");
	}
	if (input.paymentMethod === "DEPOSIT" && input.kind === "EXPENSE") {
		throw new Error("Depósito é só para entradas");
	}
	if (input.kind === "INCOME" && input.paymentMethod === "CARD") {
		throw new Error("Entrada não é registrada em cartão");
	}
	if (input.repeat && input.installments) {
		throw new Error("Escolha repetir ou parcelar, não os dois");
	}

	const dueFor = (date: CalendarDate) =>
		input.kind === "EXPENSE" ? dueDateForPurchase(input.card, date) : null;

	if (input.installments) {
		if (input.card?.type !== "CREDIT" || input.kind !== "EXPENSE") {
			throw new Error("Só dá para parcelar no cartão de crédito");
		}
		const spec = {
			kind: "INSTALLMENT",
			startDate: input.date,
			intervalMonths: 1,
			count: input.installments.count,
			anchorDay: day,
		} as const;
		return {
			series: { ...spec, anchorDay: day },
			rows: generateOccurrences(spec, today).map((occurrence) => ({
				...occurrence,
				dueDate: dueFor(occurrence.date),
				amountCents: input.amountCents,
			})),
		};
	}

	if (input.repeat) {
		const spec = {
			kind: "RECURRING",
			startDate: input.date,
			intervalMonths: input.repeat.intervalMonths,
			count: input.repeat.count,
			anchorDay: day,
		} as const;
		return {
			series: { ...spec, anchorDay: day },
			rows: generateOccurrences(spec, today).map((occurrence) => ({
				...occurrence,
				dueDate: dueFor(occurrence.date),
				amountCents: input.amountCents,
			})),
		};
	}

	return {
		series: null,
		rows: [
			{
				index: 1,
				date: input.date,
				dueDate: dueFor(input.date),
				amountCents: input.amountCents,
			},
		],
	};
}

// Início do mês "AAAA-MM" (`from`, inclusive) e início do seguinte (`to`, exclusivo).
export function monthRange(month: string): {
	from: CalendarDate;
	to: CalendarDate;
} {
	const from = `${month}-01`;
	parseDate(from);
	const next = addMonths(from, 1);
	return { from, to: next };
}
