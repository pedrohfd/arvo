import {
	addDays,
	addMonths,
	type CalendarDate,
	compareDates,
	daysInMonth,
	formatDate,
	parseDate,
} from "./dates";
import { assertCents } from "./money";

// Fatura do cartão de crédito.
//
// Compra até o dia de fechamento entra na fatura deste mês; depois, na do mês seguinte. A fatura
// vence neste mesmo mês se o dia de vencimento vem depois do fechamento; senão, no mês seguinte
// (fechamento 28, vencimento 5: vence dia 5 do mês seguinte ao do fechamento). Dia que não existe
// no mês (31 em fevereiro) vale o último dia.

function assertDay(day: number, name: string) {
	if (!Number.isInteger(day) || day < 1 || day > 31) {
		throw new Error(`${name} precisa ser um dia de 1 a 31 (recebeu ${day})`);
	}
}

export function invoiceDueDate(
	purchaseDate: CalendarDate,
	closingDay: number,
	dueDay: number,
): CalendarDate {
	assertDay(closingDay, "Dia de fechamento");
	assertDay(dueDay, "Dia de vencimento");
	const { year, month, day } = parseDate(purchaseDate);

	const closesThisMonth = day <= Math.min(closingDay, daysInMonth(year, month));
	const invoiceMonthOffset = closesThisMonth ? 0 : 1;
	const dueMonthOffset = invoiceMonthOffset + (dueDay > closingDay ? 0 : 1);

	return addMonths(formatDate(year, month, 1), dueMonthOffset, dueDay);
}

// Melhor dia de compra: o dia seguinte ao fechamento (num mês em que o fechamento é o último dia,
// é o dia 1 do mês seguinte). `month` é qualquer data do mês de interesse.
export function bestPurchaseDay(
	closingDay: number,
	month: CalendarDate,
): CalendarDate {
	assertDay(closingDay, "Dia de fechamento");
	const { year, month: monthNumber } = parseDate(month);
	const closing = Math.min(closingDay, daysInMonth(year, monthNumber));
	return addDays(formatDate(year, monthNumber, closing), 1);
}

export type PurchaseCard = {
	type: "CREDIT" | "DEBIT";
	closingDay?: number | null;
	dueDay?: number | null;
};

// Vencimento da fatura que recebe uma compra, ou nulo quando não gera fatura (débito, Pix,
// dinheiro: saem na hora). `card` é nulo para Pix e dinheiro.
export function dueDateForPurchase(
	card: PurchaseCard | null,
	purchaseDate: CalendarDate,
): CalendarDate | null {
	if (!card || card.type !== "CREDIT") return null;
	if (card.closingDay == null || card.dueDay == null) {
		throw new Error(
			"Cartão de crédito precisa de dia de fechamento e de vencimento",
		);
	}
	return invoiceDueDate(purchaseDate, card.closingDay, card.dueDay);
}

// Compra parcelada: cada parcela é uma compra no mês seguinte (mesmo dia, ou o último do mês) e
// cai na fatura do seu próprio mês, na ordem.
export function installmentDueDates(
	firstPurchaseDate: CalendarDate,
	count: number,
	card: PurchaseCard,
): { purchaseDate: CalendarDate; dueDate: CalendarDate }[] {
	if (!Number.isInteger(count) || count < 1) {
		throw new Error("Parcelamento precisa de pelo menos 1 parcela");
	}
	return Array.from({ length: count }, (_, index) => {
		const purchaseDate = addMonths(firstPurchaseDate, index);
		const dueDate = dueDateForPurchase(card, purchaseDate);
		if (dueDate === null) throw new Error("Só o cartão de crédito gera fatura");
		return { purchaseDate, dueDate };
	});
}

// Valor de cada fatura: soma das compras que caem nela, por vencimento, em ordem.
export function invoiceTotals(
	purchases: readonly { amountCents: number; dueDate: CalendarDate }[],
) {
	const totals = new Map<CalendarDate, number>();
	for (const purchase of purchases) {
		assertCents(purchase.amountCents, "valor da compra");
		totals.set(
			purchase.dueDate,
			(totals.get(purchase.dueDate) ?? 0) + purchase.amountCents,
		);
	}
	return [...totals.entries()]
		.sort(([a], [b]) => compareDates(a, b))
		.map(([dueDate, totalCents]) => ({ dueDate, totalCents }));
}

// Fatura aberta de um cartão: a que vence primeiro entre as compras já feitas e ainda não
// vencidas (a mesma conta do "No crédito, a pagar"). Nula quando não há nenhuma.
export function openInvoice(
	purchases: readonly {
		amountCents: number;
		date: CalendarDate;
		dueDate: CalendarDate;
	}[],
	today: CalendarDate,
) {
	const open = purchases.filter(
		(purchase) =>
			compareDates(purchase.date, today) <= 0 &&
			compareDates(purchase.dueDate, today) > 0,
	);
	return invoiceTotals(open)[0] ?? null;
}
