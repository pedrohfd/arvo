import {
	dayMonthLabel,
	formatMoney,
	formatShortDate,
	monthName,
	monthShort,
} from "@/lib/format";

// Tela 4.2 (Horizonte de saldos): pontos do gráfico, eixo, aviso do mês negativo e a lista "O que
// vem" por mês. Sem React, para testar.

export type HorizonApiPoint = {
	month: string;
	balanceCents: number;
	belowMinimum: boolean;
};

export type UpcomingApiItem =
	| {
			type: "INVOICE";
			date: string;
			amountCents: number;
			cardName: string | null;
	  }
	| {
			type: "TRANSACTION";
			date: string;
			amountCents: number;
			kind: "EXPENSE" | "INCOME";
			title: string | null;
			paymentMethod: "CARD" | "PIX" | "CASH" | "DEPOSIT";
			cardName: string | null;
			category: { name: string; icon: string } | null;
	  };

export type ChartPoint = {
	label: string;
	month: string | null;
	cents: number;
	belowMinimum: boolean;
};

/**
 * "hoje" com o saldo de agora e, depois, o fim de cada mês seguinte. O fim do mês atual não entra
 * no gráfico (como no Figma: hoje, dez., jan. ...); a fatura dele já pesa nos meses depois.
 */
export function chartPoints(
	todayBalanceCents: number,
	points: readonly HorizonApiPoint[],
	minimumCents: number,
): ChartPoint[] {
	return [
		{
			label: "hoje",
			month: null,
			cents: todayBalanceCents,
			belowMinimum: minimumCents > 0 && todayBalanceCents < minimumCents,
		},
		...points.slice(1).map((point) => ({
			label: monthShort(point.month),
			month: point.month,
			cents: point.balanceCents,
			belowMinimum: point.belowMinimum,
		})),
	];
}

/** Marcas do eixo de valores em centavos, de passo redondo (1, 2 ou 5 vezes 10 elevado a n reais), com o zero. */
export function niceTicks(minCents: number, maxCents: number) {
	const low = Math.min(minCents, 0);
	const high = Math.max(maxCents, 0);
	const spanReais = Math.max((high - low) / 100, 1);
	const raw = spanReais / 4;
	const exponent = 10 ** Math.floor(Math.log10(raw));
	const stepReais =
		[1, 2, 5, 10].map((m) => m * exponent).find((step) => step >= raw) ??
		10 * exponent;
	const step = Math.round(stepReais * 100);
	const first = Math.floor(low / step) * step;
	const last = Math.ceil(high / step) * step;
	const ticks: number[] = [];
	for (let value = first; value <= last; value += step) ticks.push(value);
	return ticks;
}

function groupThousands(value: number) {
	return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "20 mil", "5 mil", "0", "−2 mil", "500". */
export function tickLabel(cents: number) {
	const reais = Math.abs(cents) / 100;
	const sign = cents < 0 ? "−" : "";
	if (reais === 0) return "0";
	if (reais >= 1000 && reais % 1000 === 0) return `${sign}${reais / 1000} mil`;
	return `${sign}${groupThousands(reais)}`;
}

function itemName(item: UpcomingApiItem) {
	if (item.type === "INVOICE") {
		return item.cardName ? `Fatura ${item.cardName}` : "Fatura do cartão";
	}
	return item.title || item.category?.name || "Sem categoria";
}

function signedCents(item: UpcomingApiItem) {
	return item.type === "TRANSACTION" && item.kind === "INCOME"
		? item.amountCents
		: -item.amountCents;
}

/**
 * Aviso do primeiro mês com saldo negativo, no lugar da legenda: o valor e a saída que mais pesa
 * nele. Nulo quando nenhum mês fica negativo.
 */
export function negativeWarning(
	points: readonly ChartPoint[],
	upcoming: readonly UpcomingApiItem[],
) {
	const point = points.find((p) => p.month !== null && p.cents < 0);
	if (!point?.month) return null;
	const text = `Em ${monthName(point.month).toLowerCase()} o saldo fica em ${formatMoney(point.cents)} se nada mudar.`;
	const heaviest = upcoming
		.filter((item) => item.date.startsWith(point.month as string))
		.filter((item) => signedCents(item) < 0)
		.sort((a, b) => b.amountCents - a.amountCents)[0];
	if (!heaviest) return text;
	return `${text} Pesa mais: ${itemName(heaviest)}, ${formatMoney(heaviest.amountCents)}, em ${formatShortDate(heaviest.date)}.`;
}

export type UpcomingRow = {
	key: string;
	name: string;
	sub: string;
	signedCents: number;
	invoice: boolean;
	icon: string | null;
};

const METHOD = { PIX: "Pix", CASH: "Dinheiro", DEPOSIT: "Depósito" } as const;

/** "O que vem" por mês, com o total do mês (entradas menos saídas e faturas). */
export function upcomingByMonth(
	upcoming: readonly UpcomingApiItem[],
	today: string,
) {
	const months: { month: string; netCents: number; rows: UpcomingRow[] }[] = [];
	upcoming.forEach((item, index) => {
		const month = item.date.slice(0, 7);
		let group = months.at(-1);
		if (!group || group.month !== month) {
			group = { month, netCents: 0, rows: [] };
			months.push(group);
		}
		const cents = signedCents(item);
		group.netCents += cents;
		const method =
			item.type === "INVOICE"
				? "crédito"
				: item.paymentMethod === "CARD"
					? (item.cardName ?? "cartão")
					: METHOD[item.paymentMethod];
		group.rows.push({
			key: `${item.date}-${index}`,
			name: itemName(item),
			sub: `${dayMonthLabel(item.date, today)} · ${method}`,
			signedCents: cents,
			invoice: item.type === "INVOICE",
			icon: item.type === "TRANSACTION" ? (item.category?.icon ?? null) : null,
		});
	});
	return months;
}
