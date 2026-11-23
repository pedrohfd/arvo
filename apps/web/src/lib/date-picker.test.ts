import { describe, expect, test } from "bun:test";

import {
	isPickable,
	lastPickableDate,
	monthGrid,
	monthTitle,
	shiftMonth,
	shortcutDates,
} from "./date-picker";

describe("grade do mês", () => {
	test("novembro de 2026 começa no domingo e tem 5 semanas, como no Figma", () => {
		const grid = monthGrid("2026-11");
		expect(grid).toHaveLength(5);
		expect(grid[0]?.[0]).toEqual({ date: "2026-11-01", inMonth: true });
		expect(grid[4]?.map((c) => c.date)).toEqual([
			"2026-11-29",
			"2026-11-30",
			"2026-12-01",
			"2026-12-02",
			"2026-12-03",
			"2026-12-04",
			"2026-12-05",
		]);
		// 29 e 30 são de novembro; 1 a 5 de dezembro aparecem em cinza
		expect(grid[4]?.map((c) => c.inMonth)).toEqual([
			true,
			true,
			false,
			false,
			false,
			false,
			false,
		]);
	});

	test("dezembro de 2026 começa na terça: 29 e 30 de novembro completam a primeira semana", () => {
		const grid = monthGrid("2026-12");
		expect(grid[0]?.map((c) => c.date)).toEqual([
			"2026-11-29",
			"2026-11-30",
			"2026-12-01",
			"2026-12-02",
			"2026-12-03",
			"2026-12-04",
			"2026-12-05",
		]);
		expect(grid[0]?.slice(0, 2).every((c) => !c.inMonth)).toBe(true);
		expect(grid).toHaveLength(5);
	});

	test("um mês pode ocupar 6 semanas", () => {
		// 1º de agosto de 2026 é sábado e o mês tem 31 dias
		expect(monthGrid("2026-08")).toHaveLength(6);
	});

	test("fevereiro de 2026 cabe em 4 semanas", () => {
		const grid = monthGrid("2026-02");
		expect(grid).toHaveLength(4);
		expect(grid[3]?.at(-1)?.date).toBe("2026-02-28");
	});

	test("ano bissexto tem 29 dias", () => {
		const days = monthGrid("2028-02")
			.flat()
			.filter((c) => c.inMonth);
		expect(days).toHaveLength(29);
	});

	test("toda semana tem 7 dias e os dias seguem em sequência", () => {
		for (const month of ["2026-01", "2026-06", "2027-02", "2026-12"]) {
			const flat = monthGrid(month).flat();
			expect(flat.length % 7).toBe(0);
			for (let i = 1; i < flat.length; i++) {
				expect(flat[i]?.date > (flat[i - 1]?.date ?? "")).toBe(true);
			}
		}
	});
});

describe("navegação entre meses", () => {
	test("vai e volta atravessando o ano", () => {
		expect(shiftMonth("2026-12", 1)).toBe("2027-01");
		expect(shiftMonth("2027-01", -1)).toBe("2026-12");
		expect(shiftMonth("2026-11", 0)).toBe("2026-11");
	});

	test("título do mês", () => {
		expect(monthTitle("2026-11")).toBe("Novembro 2026");
		expect(monthTitle("2027-03")).toBe("Março 2027");
	});
});

describe("limites e atalhos", () => {
	test("dá para agendar até o fim do 24º mês à frente", () => {
		expect(lastPickableDate("2026-11-23")).toBe("2028-11-30");
		expect(isPickable("2028-11-30", "2026-11-23")).toBe(true);
		expect(isPickable("2028-12-01", "2026-11-23")).toBe(false);
	});

	test("datas passadas não têm limite", () => {
		expect(isPickable("2019-01-01", "2026-11-23")).toBe(true);
	});

	test("ontem, hoje e amanhã atravessam a virada de mês", () => {
		expect(shortcutDates("2026-12-01")).toEqual({
			yesterday: "2026-11-30",
			today: "2026-12-01",
			tomorrow: "2026-12-02",
		});
	});
});
