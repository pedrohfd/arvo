import { describe, expect, test } from "bun:test";

import {
	entryTime,
	fromDbDate,
	referenceForMonth,
	toDbDate,
	todayInSaoPaulo,
} from "./calendar";

describe("calendar", () => {
	test("hoje é o dia de Brasília, não o do servidor", () => {
		// 02:30 UTC de 24/11 ainda é 23:30 de 23/11 em Brasília (UTC−3).
		expect(todayInSaoPaulo(new Date("2026-11-24T02:30:00Z"))).toBe(
			"2026-11-23",
		);
		expect(todayInSaoPaulo(new Date("2026-11-24T03:00:00Z"))).toBe(
			"2026-11-24",
		);
	});

	test("converte dia de calendário de ida e volta", () => {
		expect(fromDbDate(toDbDate("2027-02-28"))).toBe("2027-02-28");
	});

	test("referência do mês: passado termina no último dia, atual e futuro usam hoje", () => {
		expect(referenceForMonth("2026-10", "2026-11-23")).toBe("2026-10-31");
		expect(referenceForMonth("2026-11", "2026-11-23")).toBe("2026-11-23");
		expect(referenceForMonth("2027-03", "2026-11-23")).toBe("2026-11-23");
	});
});

describe("entryTime", () => {
	test("hora de Brasília quando o registro foi no próprio dia", () => {
		// 11:10 UTC = 08:10 em Brasília
		expect(entryTime(new Date("2026-11-23T11:10:00Z"), "2026-11-23")).toBe(
			"08h10",
		);
	});

	test("sem hora em registro agendado ou retroativo", () => {
		expect(
			entryTime(new Date("2026-11-23T11:10:00Z"), "2026-12-05"),
		).toBeNull();
		expect(
			entryTime(new Date("2026-11-23T11:10:00Z"), "2026-11-20"),
		).toBeNull();
	});

	test("usa o dia de Brasília, não o UTC", () => {
		// 02:30 UTC de 24/11 ainda é 23h30 de 23/11 em Brasília
		expect(entryTime(new Date("2026-11-24T02:30:00Z"), "2026-11-23")).toBe(
			"23h30",
		);
	});
});
