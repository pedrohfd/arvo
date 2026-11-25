import { describe, expect, test } from "bun:test";

import { monthRange, planTransaction } from "./plan-transaction";

const hoje = "2026-11-23";
const credito = { type: "CREDIT", closingDay: 28, dueDay: 5 } as const;

describe("planTransaction", () => {
	test("registro simples gera uma linha sem série", () => {
		const plan = planTransaction(
			{
				kind: "EXPENSE",
				amountCents: 8_550,
				date: "2026-11-20",
				paymentMethod: "PIX",
				card: null,
			},
			hoje,
		);
		expect(plan.series).toBeNull();
		expect(plan.rows).toEqual([
			{ index: 1, date: "2026-11-20", dueDate: null, amountCents: 8_550 },
		]);
	});

	test("compra no crédito grava o vencimento da fatura", () => {
		const plan = planTransaction(
			{
				kind: "EXPENSE",
				amountCents: 1_000,
				date: "2026-11-29",
				paymentMethod: "CARD",
				card: credito,
			},
			hoje,
		);
		expect(plan.rows[0]?.dueDate).toBe("2027-01-05");
	});

	test("parcelamento: N parcelas do mesmo valor, cada uma na fatura do seu mês", () => {
		const plan = planTransaction(
			{
				kind: "EXPENSE",
				amountCents: 5_000,
				date: "2026-11-10",
				paymentMethod: "CARD",
				card: credito,
				installments: { count: 3 },
			},
			hoje,
		);
		expect(plan.series?.kind).toBe("INSTALLMENT");
		expect(plan.rows.map((r) => r.date)).toEqual([
			"2026-11-10",
			"2026-12-10",
			"2027-01-10",
		]);
		expect(plan.rows.map((r) => r.dueDate)).toEqual([
			"2026-12-05",
			"2027-01-05",
			"2027-02-05",
		]);
		expect(plan.rows.every((r) => r.amountCents === 5_000)).toBe(true);
	});

	test("repetir por 3 meses mantém o dia âncora em mês curto", () => {
		const plan = planTransaction(
			{
				kind: "INCOME",
				amountCents: 400_000,
				date: "2027-01-31",
				paymentMethod: "DEPOSIT",
				card: null,
				repeat: { intervalMonths: 1, count: 3 },
			},
			hoje,
		);
		expect(plan.rows.map((r) => r.date)).toEqual([
			"2027-01-31",
			"2027-02-28",
			"2027-03-31",
		]);
	});

	test("repetir sem fim gera 24 meses à frente", () => {
		const plan = planTransaction(
			{
				kind: "EXPENSE",
				amountCents: 18_640,
				date: "2026-11-10",
				paymentMethod: "PIX",
				card: null,
				repeat: { intervalMonths: 1, count: null },
			},
			hoje,
		);
		expect(plan.series?.count).toBeNull();
		expect(plan.rows.at(-1)?.date).toBe("2028-11-10");
	});

	test("rejeita combinações que não existem", () => {
		const base = { amountCents: 100, date: "2026-11-20", card: null } as const;
		expect(() =>
			planTransaction(
				{ ...base, kind: "EXPENSE", paymentMethod: "CARD" },
				hoje,
			),
		).toThrow("Escolha o cartão");
		expect(() =>
			planTransaction(
				{ ...base, kind: "EXPENSE", paymentMethod: "DEPOSIT" },
				hoje,
			),
		).toThrow("Depósito");
		expect(() =>
			planTransaction(
				{
					...base,
					kind: "EXPENSE",
					paymentMethod: "PIX",
					installments: { count: 2 },
				},
				hoje,
			),
		).toThrow("parcelar");
		expect(() =>
			planTransaction(
				{
					...base,
					kind: "EXPENSE",
					paymentMethod: "PIX",
					repeat: { intervalMonths: 1, count: 2 },
					installments: { count: 2 },
				},
				hoje,
			),
		).toThrow("não os dois");
		expect(() =>
			planTransaction(
				{ ...base, amountCents: 0, kind: "EXPENSE", paymentMethod: "PIX" },
				hoje,
			),
		).toThrow();
	});
});

describe("monthRange", () => {
	test("início do mês e início do seguinte", () => {
		expect(monthRange("2026-12")).toEqual({
			from: "2026-12-01",
			to: "2027-01-01",
		});
	});
});
