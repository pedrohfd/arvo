import { addMonths, parseDate } from "@arvo/api/rules/dates";
import { dueDateForPurchase } from "@arvo/api/rules/invoice";

import { dayLabel, formatMoney, formatShortDate, monthShort } from "./format";

// Regras de tela do Registrar (série 2 do Figma): textos de apoio e escolhas padrão.

export type Flow = "EXPENSE" | "INCOME";

export type RegisterCard = {
	id: string;
	name: string;
	type: "CREDIT" | "DEBIT";
	closingDay: number | null;
	dueDay: number | null;
};

/** Forma de pagamento escolhida: um cartão ou uma das formas sem cartão. */
export type Payment =
	| { kind: "card"; cardId: string }
	| { kind: "PIX" | "CASH" | "DEPOSIT" };

export function samePayment(a: Payment, b: Payment) {
	return (
		a.kind === b.kind &&
		(a.kind !== "card" || a.cardId === (b as typeof a).cardId)
	);
}

/** Saída começa no primeiro cartão (se houver); entrada, no Pix. */
export function defaultPayment(
	flow: Flow,
	cards: readonly RegisterCard[],
): Payment {
	const first = cards[0];
	return flow === "EXPENSE" && first
		? { kind: "card", cardId: first.id }
		: { kind: "PIX" };
}

/** Rótulo do cartão no chip: "Nubank · crédito", "Itaú · débito". */
export function cardLabel(card: RegisterCard) {
	return `${card.name} · ${card.type === "CREDIT" ? "crédito" : "débito"}`;
}

/** Entrada só tem Pix, depósito e dinheiro; saída tem os cartões, Pix e dinheiro. */
export function paymentOptions(flow: Flow, cards: readonly RegisterCard[]) {
	const options: { payment: Payment; label: string }[] = [];
	if (flow === "EXPENSE") {
		for (const card of cards) {
			options.push({
				payment: { kind: "card", cardId: card.id },
				label: cardLabel(card),
			});
		}
	}
	options.push({ payment: { kind: "PIX" }, label: "Pix" });
	if (flow === "INCOME") {
		options.push({ payment: { kind: "DEPOSIT" }, label: "Depósito" });
	}
	options.push({ payment: { kind: "CASH" }, label: "Dinheiro" });
	return options;
}

/** Aviso sob a forma de pagamento quando é crédito. Outras formas não têm aviso. */
export function creditHint(
	card: RegisterCard | undefined,
	purchaseDate: string,
): string | null {
	if (!card || card.type !== "CREDIT") return null;
	const due = dueDateForPurchase(card, purchaseDate);
	if (!due) return null;
	return `Entra na fatura do ${card.name} que vence em ${formatShortDate(due)}. Só sai do saldo nesse dia.`;
}

/** "nov. de 2026" */
function monthAndYear(date: string) {
	const { year } = parseDate(date);
	return `${monthShort(date.slice(0, 7))} de ${year}`;
}

/** Linha de resumo do "Repetir todo mês": o valor de cada mês e até quando vai. */
export function repeatSummary(input: {
	amountCents: number;
	date: string;
	/** Quantos meses; nulo = sem fim. */
	count: number | null;
}) {
	if (input.count === null) {
		return `Todo dia ${parseDate(input.date).day}, sem data para acabar.`;
	}
	const last = addMonths(
		input.date,
		input.count - 1,
		parseDate(input.date).day,
	);
	return `${formatMoney(input.amountCents)} por mês, de ${monthAndYear(input.date)} a ${monthAndYear(last)}.`;
}

/** Quantas categorias aparecem como chip antes do "Mais". */
export const VISIBLE_CATEGORIES = 6;

/**
 * Chips de categoria: as primeiras e, se a escolhida veio da folha "Mais", ela também, para a
 * escolha não sumir da tela. "Mais" só existe quando sobram categorias.
 */
export function visibleCategories<T extends { id: string }>(
	all: readonly T[],
	selectedId: string | null,
) {
	const shown = all.slice(0, VISIBLE_CATEGORIES);
	const picked = all.find((category) => category.id === selectedId);
	if (picked && !shown.includes(picked)) shown.push(picked);
	return { shown, hasMore: all.length > VISIBLE_CATEGORIES };
}

/** Números de meses oferecidos em "Por quantos meses" (além de "Sem fim"). */
export const REPEAT_COUNTS = [2, 3, 6, 10, 12] as const;

/**
 * Texto do campo Data: "Hoje, 18 de nov." e "Qui., 10 de dez."; ontem e amanhã levam a data junto
 * ("Ontem, 17 de nov."), e o ano aparece quando não é o de hoje.
 */
export function dateFieldLabel(date: string, today: string) {
	const label = dayLabel(date, today);
	if (label !== "Hoje" && label !== "Ontem" && label !== "Amanhã") return label;
	const { day } = parseDate(date);
	return `${label}, ${day} de ${monthShort(date.slice(0, 7))}`;
}

/** Aviso sob o campo Data quando a data é futura: só entra no saldo quando o dia chega. */
export function futureDateHint(date: string, today: string): string | null {
	if (date <= today) return null;
	const { day, year } = parseDate(date);
	const sameYear = year === parseDate(today).year;
	// A abreviação do mês já termina em ponto: "10 de dez." fecha a frase.
	const when = `${day} de ${monthShort(date.slice(0, 7))}`;
	return `Ainda não entra no saldo. Entra em ${sameYear ? when : `${when} de ${year}.`}`;
}
