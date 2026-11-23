import type { CalendarDate } from "../rules/dates";

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
