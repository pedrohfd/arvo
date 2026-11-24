import { describe, expect, test } from "bun:test";

import { toCents } from "./amount-input";
import {
	deadlineHint,
	formatTarget,
	typedToRaw,
	validateGoalForm,
} from "./goal-form";

describe("typedToRaw", () => {
	test("aceita dígitos e vírgula", () => {
		expect(typedToRaw("500,00")).toBe("500,00");
		expect(typedToRaw("120,5")).toBe("120,5");
	});

	test("o ponto vale como vírgula e o separador de milhar some", () => {
		expect(typedToRaw("1.500,00")).toBe("1500,00");
		expect(typedToRaw("12.5")).toBe("12,5");
	});

	test("ignora letras e símbolos", () => {
		expect(typedToRaw("R$ 30abc")).toBe("30");
	});

	test("corta a 3ª casa decimal e respeita o limite", () => {
		expect(typedToRaw("10,999")).toBe("10,99");
		expect(toCents(typedToRaw("99999999"))).toBe(999_999_900);
		expect(toCents(typedToRaw("999999999"))).toBe(999_999_900);
	});

	test("vazio continua vazio", () => {
		expect(typedToRaw("")).toBe("");
	});
});

describe("formatTarget", () => {
	test("duas casas e milhar", () => {
		expect(formatTarget("500")).toBe("500,00");
		expect(formatTarget("1500,5")).toBe("1.500,50");
	});

	test("zero ou vazio deixa o campo vazio", () => {
		expect(formatTarget("")).toBe("");
		expect(formatTarget("0")).toBe("");
	});
});

describe("validateGoalForm", () => {
	test("tudo certo", () => {
		expect(validateGoalForm({ name: "Viagem", targetCents: 50_000 })).toEqual(
			{},
		);
	});

	test("nome em branco e valor zero", () => {
		expect(validateGoalForm({ name: "   ", targetCents: 0 })).toEqual({
			name: "Dê um nome para a meta.",
			target: "Diga quanto você quer juntar.",
		});
	});
});

describe("deadlineHint", () => {
	const base = { targetCents: 50_000, savedCents: 0, today: "2026-11-18" };

	test("sem data não há dica", () => {
		expect(deadlineHint({ ...base, deadline: null })).toBeNull();
	});

	test("divide o que falta pelos meses até a data", () => {
		expect(deadlineHint({ ...base, deadline: "2027-01-15" })).toBe(
			"R$ 250,00 por mês, de agora até 15/01.",
		);
	});

	test("desconta o que já está guardado", () => {
		expect(
			deadlineHint({ ...base, savedCents: 40_000, deadline: "2027-01-15" }),
		).toBe("R$ 50,00 por mês, de agora até 15/01.");
	});

	test("sem valor ou com a meta batida não há dica", () => {
		expect(
			deadlineHint({ ...base, targetCents: 0, deadline: "2027-01-15" }),
		).toBeNull();
		expect(
			deadlineHint({ ...base, savedCents: 50_000, deadline: "2027-01-15" }),
		).toBeNull();
	});
});
