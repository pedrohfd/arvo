import { describe, expect, test } from "bun:test";

import {
	balanceLabel,
	matchesSearch,
	monthSheetModel,
	normalizeSearch,
	shiftMonth,
} from "./home-month";

describe("shiftMonth", () => {
	test("anda entre anos", () => {
		expect(shiftMonth("2026-11", 1)).toBe("2026-12");
		expect(shiftMonth("2026-12", 1)).toBe("2027-01");
		expect(shiftMonth("2026-01", -1)).toBe("2025-12");
		expect(shiftMonth("2026-11", 24)).toBe("2028-11");
	});
});

describe("monthSheetModel", () => {
	const disabled = (year: number, first: string | null) =>
		monthSheetModel({ year, current: "2026-11", first })
			.months.filter((m) => m.disabled)
			.map((m) => m.month.slice(5));

	test("meses antes do primeiro registro ficam apagados (Figma: desde setembro)", () => {
		expect(disabled(2026, "2026-09")).toEqual([
			"01",
			"02",
			"03",
			"04",
			"05",
			"06",
			"07",
			"08",
		]);
	});

	test("limite à frente: 24 meses depois do atual (Figma: dezembro de 2028 apagado)", () => {
		expect(disabled(2028, "2026-09")).toEqual(["12"]);
	});

	test("setas do ano: não passam do primeiro registro nem do limite", () => {
		const first = monthSheetModel({
			year: 2026,
			current: "2026-11",
			first: "2026-09",
		});
		expect(first.canPrev).toBe(false);
		expect(first.canNext).toBe(true);
		const last = monthSheetModel({
			year: 2028,
			current: "2026-11",
			first: "2026-09",
		});
		expect(last.canPrev).toBe(true);
		expect(last.canNext).toBe(false);
	});

	test("sem nenhuma transação, só vale do mês atual em diante", () => {
		expect(disabled(2026, null)).toEqual([
			"01",
			"02",
			"03",
			"04",
			"05",
			"06",
			"07",
			"08",
			"09",
			"10",
		]);
	});
});

describe("rótulo do saldo", () => {
	test("mês passado diz o fim do mês; o resto, atual", () => {
		expect(balanceLabel("2026-10", "2026-11")).toBe("Saldo no fim de outubro");
		expect(balanceLabel("2026-11", "2026-11")).toBe("Saldo atual");
		expect(balanceLabel("2027-01", "2026-11")).toBe("Saldo atual");
	});
});

describe("busca", () => {
	test("ignora acento e maiúsculas", () => {
		expect(normalizeSearch("  Farmácia ")).toBe("farmacia");
		expect(matchesSearch("farmacia", "Farmácia")).toBe(true);
		expect(matchesSearch("FARMÁCIA", "farmacia da esquina")).toBe(true);
	});
	test("procura em qualquer um dos textos, ignorando os vazios", () => {
		expect(matchesSearch("mercado", null, "Mercado")).toBe(true);
		expect(matchesSearch("academia", "Mercado", null)).toBe(false);
	});
	test("busca vazia acha tudo", () => {
		expect(matchesSearch("  ", "qualquer")).toBe(true);
	});
});
