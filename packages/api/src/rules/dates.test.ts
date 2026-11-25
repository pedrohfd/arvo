import { describe, expect, test } from "bun:test";

import {
	addDays,
	addMonths,
	compareDates,
	daysInMonth,
	lastDayOfMonth,
	monthKey,
	monthsBetween,
	parseDate,
} from "./dates";

describe("datas de calendário", () => {
	test("rejeita texto que não é AAAA-MM-DD", () => {
		expect(() => parseDate("18/11/2026")).toThrow();
		expect(() => parseDate("2026-1-5")).toThrow();
	});

	test("rejeita dia que não existe no calendário", () => {
		expect(() => parseDate("2026-02-29")).toThrow();
		expect(() => parseDate("2026-04-31")).toThrow();
		expect(() => parseDate("2026-13-01")).toThrow();
	});

	test("aceita 29/02 em ano bissexto", () => {
		expect(parseDate("2028-02-29")).toEqual({ year: 2028, month: 2, day: 29 });
	});

	test("conta os dias de cada mês, com fevereiro bissexto", () => {
		expect(daysInMonth(2026, 2)).toBe(28);
		expect(daysInMonth(2028, 2)).toBe(29);
		expect(daysInMonth(2100, 2)).toBe(28);
		expect(daysInMonth(2000, 2)).toBe(29);
		expect(daysInMonth(2026, 4)).toBe(30);
		expect(daysInMonth(2026, 12)).toBe(31);
	});

	test("compara datas na ordem do calendário", () => {
		expect(compareDates("2026-11-18", "2026-11-19")).toBe(-1);
		expect(compareDates("2027-01-01", "2026-12-31")).toBe(1);
		expect(compareDates("2026-11-18", "2026-11-18")).toBe(0);
	});

	test("soma meses mantendo o dia, e vira o ano", () => {
		expect(addMonths("2026-11-15", 1)).toBe("2026-12-15");
		expect(addMonths("2026-11-15", 2)).toBe("2027-01-15");
		expect(addMonths("2026-11-15", 14)).toBe("2028-01-15");
	});

	test("soma meses para trás", () => {
		expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
		expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
	});

	test("cai no último dia do mês quando o dia não existe, sem perder o dia âncora", () => {
		expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
		expect(addMonths("2026-01-31", 1, 31)).toBe("2026-02-28");
		// A partir de uma data já ajustada, o âncora devolve o 31 nos meses que têm.
		expect(addMonths("2026-02-28", 1, 31)).toBe("2026-03-31");
		expect(addMonths("2026-02-28", 2, 31)).toBe("2026-04-30");
	});

	test("soma dias atravessando mês e ano", () => {
		expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
		expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
		expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
	});

	test("acha o último dia do mês e a chave AAAA-MM", () => {
		expect(lastDayOfMonth("2026-11-05")).toBe("2026-11-30");
		expect(lastDayOfMonth("2028-02-10")).toBe("2028-02-29");
		expect(monthKey("2026-11-05")).toBe("2026-11");
	});

	test("conta meses de diferença ignorando o dia", () => {
		expect(monthsBetween("2026-11-30", "2027-03-01")).toBe(4);
		expect(monthsBetween("2026-11-01", "2026-11-30")).toBe(0);
		expect(monthsBetween("2027-03-01", "2026-11-30")).toBe(-4);
	});
});
