// Datas de calendário (dia, sem hora, sem fuso) como texto "AAAA-MM-DD".
//
// Por que não `Date`: as regras de dinheiro trabalham com o dia em que algo acontece, e `Date`
// mistura isso com fuso e horário de verão. Aqui só há aritmética de calendário, o que também
// deixa os testes independentes da máquina (P3). Quem chama passa a data de "hoje" calculada
// em America/Sao_Paulo; nada aqui lê o relógio.

export type CalendarDate = string;

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number) {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number) {
	if (month === 2) return isLeapYear(year) ? 29 : 28;
	return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function parseDate(date: CalendarDate) {
	const match = PATTERN.exec(date);
	if (!match) throw new Error(`Data inválida: "${date}" (use AAAA-MM-DD)`);
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
		throw new Error(`Data inexistente: "${date}"`);
	}
	return { year, month, day };
}

export function formatDate(
	year: number,
	month: number,
	day: number,
): CalendarDate {
	const pad = (value: number, size: number) =>
		String(value).padStart(size, "0");
	return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

// Compara como texto: "AAAA-MM-DD" ordena igual ao calendário. Negativo se a < b.
export function compareDates(a: CalendarDate, b: CalendarDate) {
	parseDate(a);
	parseDate(b);
	return a < b ? -1 : a > b ? 1 : 0;
}

// Posição do mês numa linha do tempo contínua (ano × 12 + mês − 1).
export function monthIndex(date: CalendarDate) {
	const { year, month } = parseDate(date);
	return year * 12 + month - 1;
}

// Quantos meses de calendário separam a de b (b − a), ignorando o dia.
export function monthsBetween(a: CalendarDate, b: CalendarDate) {
	return monthIndex(b) - monthIndex(a);
}

// "AAAA-MM" do mês da data.
export function monthKey(date: CalendarDate) {
	const { year, month } = parseDate(date);
	return formatDate(year, month, 1).slice(0, 7);
}

export function lastDayOfMonth(date: CalendarDate): CalendarDate {
	const { year, month } = parseDate(date);
	return formatDate(year, month, daysInMonth(year, month));
}

// Soma meses mantendo o "dia âncora": em mês mais curto cai no último dia, sem perder o dia
// original nos meses seguintes (31/01 → 28/02 → 31/03). Sem `anchorDay`, usa o dia da própria data.
export function addMonths(
	date: CalendarDate,
	months: number,
	anchorDay?: number,
): CalendarDate {
	const { year, month, day } = parseDate(date);
	const anchor = anchorDay ?? day;
	if (!Number.isInteger(months)) throw new Error("Meses precisa ser inteiro");
	if (!Number.isInteger(anchor) || anchor < 1 || anchor > 31) {
		throw new Error(`Dia âncora inválido: ${anchor}`);
	}
	const index = year * 12 + month - 1 + months;
	const newYear = Math.floor(index / 12);
	const newMonth = (index % 12) + 1;
	return formatDate(
		newYear,
		newMonth,
		Math.min(anchor, daysInMonth(newYear, newMonth)),
	);
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
	const { year, month, day } = parseDate(date);
	// Aritmética de calendário via UTC: sem fuso nem horário de verão.
	const result = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);
	return formatDate(
		result.getUTCFullYear(),
		result.getUTCMonth() + 1,
		result.getUTCDate(),
	);
}
