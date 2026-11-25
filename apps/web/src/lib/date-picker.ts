import {
	addDays,
	addMonths,
	compareDates,
	daysInMonth,
	lastDayOfMonth,
	parseDate,
} from "@arvo/api/rules/dates";

import { monthName } from "./format";

// Seletor de data do Registrar (tela 2.4 do Figma). Tudo em dias de calendário "AAAA-MM-DD";
// meses como "AAAA-MM". O calendário começa no domingo (D S T Q Q S S).

export type DayCell = {
	date: string;
	/** Dia do mês mostrado; os do mês vizinho aparecem em cinza. */
	inMonth: boolean;
};

/** As semanas do mês, de domingo a sábado, com os dias vizinhos completando a primeira e a última. */
export function monthGrid(month: string): DayCell[][] {
	const first = `${month}-01`;
	const { year, month: monthNumber } = parseDate(first);
	const offset = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
	const weeks = Math.ceil((offset + daysInMonth(year, monthNumber)) / 7);
	const start = addDays(first, -offset);
	return Array.from({ length: weeks }, (_, week) =>
		Array.from({ length: 7 }, (_, day) => {
			const date = addDays(start, week * 7 + day);
			return { date, inMonth: date.slice(0, 7) === month };
		}),
	);
}

/** Mês anterior (`delta` negativo) ou seguinte. */
export function shiftMonth(month: string, delta: number) {
	return addMonths(`${month}-01`, delta).slice(0, 7);
}

/** "Novembro 2026" */
export function monthTitle(month: string) {
	return `${monthName(month)} ${month.slice(0, 4)}`;
}

/** Até quando dá para agendar: o fim do 24º mês à frente, como as séries sem fim (P2). */
export function lastPickableDate(today: string) {
	return lastDayOfMonth(addMonths(today, 24));
}

export function isPickable(date: string, today: string) {
	return compareDates(date, lastPickableDate(today)) <= 0;
}

/** Os atalhos "Ontem", "Hoje" e "Amanhã". */
export function shortcutDates(today: string) {
	return {
		yesterday: addDays(today, -1),
		today,
		tomorrow: addDays(today, 1),
	};
}
