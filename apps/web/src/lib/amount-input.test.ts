import { describe, expect, test } from "bun:test";

import {
	type AmountKey,
	displayParts,
	isAtLimit,
	pressKey,
	toCents,
} from "./amount-input";

// Digita uma sequência de teclas, como a pessoa faria.
function type(keys: string): string {
	let value = "";
	for (const key of keys) value = pressKey(value, key as AmountKey);
	return value;
}

describe("valor digitado", () => {
	test('"120" vira R$ 120,00', () => {
		expect(toCents(type("120"))).toBe(12_000);
	});

	test('"120,5" e "120,50" viram R$ 120,50', () => {
		expect(toCents(type("120,5"))).toBe(12_050);
		expect(toCents(type("120,50"))).toBe(12_050);
	});

	test("uma segunda vírgula é ignorada", () => {
		expect(type("12,3,4")).toBe("12,34");
	});

	test("o terceiro dígito depois da vírgula é ignorado", () => {
		expect(type("1,999")).toBe("1,99");
	});

	test("começar pela vírgula vale 0,", () => {
		expect(type(",5")).toBe("0,5");
		expect(toCents(type(",5"))).toBe(50);
	});

	test('zeros à esquerda são ignorados ("007" vira 7)', () => {
		expect(type("007")).toBe("7");
		expect(type("000")).toBe("0");
		expect(toCents(type("0"))).toBe(0);
	});

	test("apagar remove o último dígito e, em vazio, continua vazio", () => {
		expect(pressKey("120", "back")).toBe("12");
		expect(pressKey("1,5", "back")).toBe("1,");
		expect(pressKey("1,", "back")).toBe("1");
		expect(pressKey("", "back")).toBe("");
	});

	test("9.999.999,99 é aceito; um dígito a mais é ignorado", () => {
		const max = type("9999999,99");
		expect(toCents(max)).toBe(999_999_999);
		expect(isAtLimit(max)).toBe(true);
		expect(pressKey(max, "1")).toBe(max);
		expect(pressKey(max, ",")).toBe(max);
	});

	test("10.000.000,00 não é aceito", () => {
		expect(type("10000000")).toBe("1000000");
		expect(toCents(type("10000000"))).toBe(100_000_000);
	});

	test("só 8 dígitos inteiros passam se os centavos não estouram o limite", () => {
		// 9.999.999 + qualquer dígito na casa seguinte passaria do máximo
		expect(type("99999999")).toBe("9999999");
	});

	test("abaixo do limite não está no limite", () => {
		expect(isAtLimit("9999999,98")).toBe(false);
		expect(isAtLimit("")).toBe(false);
	});
});

describe("exibição", () => {
	test("vazio é R$ 0,00 todo em cinza", () => {
		expect(displayParts("")).toEqual({ typed: "", ghost: "R$ 0,00" });
	});

	test("inteiro mostra os centavos que faltam em cinza", () => {
		expect(displayParts("120")).toEqual({ typed: "R$ 120", ghost: ",00" });
		expect(displayParts("4000")).toEqual({ typed: "R$ 4.000", ghost: ",00" });
	});

	test("com vírgula, só falta o que não foi digitado", () => {
		expect(displayParts("120,")).toEqual({ typed: "R$ 120,", ghost: "00" });
		expect(displayParts("120,5")).toEqual({ typed: "R$ 120,5", ghost: "0" });
		expect(displayParts("120,50")).toEqual({ typed: "R$ 120,50", ghost: "" });
	});
});
