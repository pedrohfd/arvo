import { describe, expect, test } from "bun:test";

import {
	categoryShare,
	categoryTitle,
	paymentLine,
	transactionCount,
} from "./category-detail";

describe("Resumo · categoria", () => {
	test("título com o mês, e o ano só quando não é o de hoje", () => {
		expect(categoryTitle("Mercado", "2026-11", "2026-11-24")).toBe(
			"Mercado em novembro",
		);
		expect(categoryTitle("Mercado", "2027-02", "2026-11-24")).toBe(
			"Mercado em fevereiro de 2027",
		);
	});

	test("participação arredondada como no Para onde foi (Figma: 81%)", () => {
		expect(categoryShare(140490, 173660)).toBe(81);
		expect(categoryShare(14750, 173660)).toBe(8);
		expect(categoryShare(5000, 0)).toBe(0);
	});

	test("singular e plural", () => {
		expect(transactionCount(1)).toBe("transação");
		expect(transactionCount(2)).toBe("transações");
	});

	test("forma de pagamento na linha", () => {
		const base = {
			date: "2026-11-16",
			amountCents: 100,
			cardName: null,
			dueDate: null,
		};
		expect(
			paymentLine({
				...base,
				paymentMethod: "CARD",
				cardName: "Nubank",
				dueDate: "2026-11-27",
			}),
		).toBe("Nubank · fatura 27/11");
		expect(
			paymentLine({ ...base, paymentMethod: "CARD", cardName: "Itaú" }),
		).toBe("Itaú");
		expect(paymentLine({ ...base, paymentMethod: "PIX" })).toBe("Pix");
		expect(paymentLine({ ...base, paymentMethod: "CASH" })).toBe("Dinheiro");
	});
});
