import {
	type CalendarDate,
	compareDates,
	lastDayOfMonth,
} from "../rules/dates";

// "Hoje" é sempre o dia em Brasília (P3), nunca o do servidor.
export function todayInSaoPaulo(now: Date = new Date()): CalendarDate {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
	}).format(now);
}

// Colunas `@db.Date` do Prisma: dia de calendário ↔ `Date` à meia-noite UTC.
export function toDbDate(date: CalendarDate) {
	return new Date(`${date}T00:00:00.000Z`);
}

export function fromDbDate(date: Date): CalendarDate {
	return date.toISOString().slice(0, 10);
}

// Data de referência de um mês escolhido: mês passado usa o último dia dele ("saldo no fim de
// <mês>"); o mês de hoje e os futuros usam hoje.
export function referenceForMonth(
	month: string,
	today: CalendarDate,
): CalendarDate {
	const end = lastDayOfMonth(`${month}-01`);
	return compareDates(end, today) < 0 ? end : today;
}

// Hora de registro ("08h10", em Brasília), só quando o registro foi feito no próprio dia da
// transação. Em lançamento agendado ou retroativo a hora não diz nada e não aparece.
export function entryTime(createdAt: Date, date: CalendarDate): string | null {
	if (todayInSaoPaulo(createdAt) !== date) return null;
	const parts = new Intl.DateTimeFormat("pt-BR", {
		timeZone: "America/Sao_Paulo",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(createdAt);
	const get = (type: string) =>
		parts.find((p) => p.type === type)?.value ?? "00";
	return `${get("hour")}h${get("minute")}`;
}
