import { monthName } from "@/lib/format";

// Seletor de mês (folha 1.10), rótulos do mês e busca da Início, sem React, para testar. Meses são
// "AAAA-MM".

/** Quantos meses à frente o seletor deixa escolher (igual ao seletor de data). */
export const MONTHS_AHEAD = 24;

export function shiftMonth(month: string, delta: number) {
	const year = Number(month.slice(0, 4));
	const index = year * 12 + Number(month.slice(5, 7)) - 1 + delta;
	const newYear = Math.floor(index / 12);
	return `${newYear}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export type MonthCell = { month: string; disabled: boolean };

/**
 * Os 12 meses de `year` na grade. Ficam apagados os anteriores ao mês da primeira transação e os
 * depois do limite à frente. Sem nenhuma transação, só vale do mês atual em diante.
 */
export function monthSheetModel(input: {
	year: number;
	current: string;
	first: string | null;
}) {
	const first =
		input.first && input.first < input.current ? input.first : input.current;
	const limit = shiftMonth(input.current, MONTHS_AHEAD);
	const months: MonthCell[] = Array.from({ length: 12 }, (_, i) => {
		const month = `${input.year}-${String(i + 1).padStart(2, "0")}`;
		return { month, disabled: month < first || month > limit };
	});
	return {
		months,
		canPrev: input.year > Number(first.slice(0, 4)),
		canNext: input.year < Number(limit.slice(0, 4)),
	};
}

/** "Saldo atual" no mês corrente e adiante; "Saldo no fim de outubro" em mês passado. */
export function balanceLabel(month: string, current: string) {
	return month < current
		? `Saldo no fim de ${monthName(month).toLowerCase()}`
		: "Saldo atual";
}

/** Sem acento e sem maiúsculas: "Farmácia" vira "farmacia". */
export function normalizeSearch(text: string) {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

/** A busca acha em qualquer um dos textos ("farmacia" acha "Farmácia"). Busca vazia acha tudo. */
export function matchesSearch(query: string, ...texts: (string | null)[]) {
	const needle = normalizeSearch(query);
	if (!needle) return true;
	return texts.some((text) => text && normalizeSearch(text).includes(needle));
}
