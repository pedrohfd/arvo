import { describe, expect, test } from "bun:test";

import { billSub, personHeader, receivableSummary } from "./receivable";

describe("A receber", () => {
	test("resumo no plural e no singular", () => {
		expect(receivableSummary(3, 4)).toBe("de 3 pessoas, em 4 contas divididas");
		expect(receivableSummary(1, 1)).toBe("de 1 pessoa, em 1 conta dividida");
	});

	test("cabeçalho de cada pessoa", () => {
		expect(personHeader("Camilly", 2)).toBe("Camilly · 2 contas");
		expect(personHeader("Ludmila", 1)).toBe("Ludmila · 1 conta");
	});

	test("categoria e data da conta", () => {
		expect(billSub("Lazer", "2026-10-12")).toBe("Lazer · 12/10");
	});
});
