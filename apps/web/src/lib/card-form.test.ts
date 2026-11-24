import { describe, expect, test } from "bun:test";

import { closingHint, onlyLast4, validateCardForm } from "./card-form";

const valid = {
	name: "Nubank",
	type: "CREDIT" as const,
	last4: "4821",
	closingDay: 20,
	dueDay: 27,
};

describe("formulário de cartão", () => {
	test("cartão de crédito completo não tem erro", () => {
		expect(validateCardForm(valid)).toEqual({});
	});

	test("nome vazio ou só espaços é erro", () => {
		expect(validateCardForm({ ...valid, name: "   " }).name).toBeDefined();
	});

	test("crédito exige os dois dias; débito não", () => {
		const credit = validateCardForm({
			...valid,
			closingDay: null,
			dueDay: null,
		});
		expect(credit.closingDay).toBeDefined();
		expect(credit.dueDay).toBeDefined();
		expect(
			validateCardForm({
				...valid,
				type: "DEBIT",
				closingDay: null,
				dueDay: null,
			}),
		).toEqual({});
	});

	test("os 4 dígitos são opcionais, mas incompletos são erro", () => {
		expect(validateCardForm({ ...valid, last4: "" })).toEqual({});
		expect(validateCardForm({ ...valid, last4: "48" }).last4).toBeDefined();
	});

	test("o campo dos dígitos só guarda números, no máximo 4", () => {
		expect(onlyLast4("48a2-1999")).toBe("4821");
	});

	test("dica do melhor dia: dia seguinte ao fechamento, ou dia 1 se fecha no 31", () => {
		expect(closingHint(20)).toBe(
			"Compras a partir do dia 21 entram na fatura do mês seguinte. Melhor dia de compra: 21.",
		);
		expect(closingHint(31)).toContain("Melhor dia de compra: 1.");
		expect(closingHint(null)).toBeNull();
	});
});
