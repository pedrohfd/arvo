import { describe, expect, test } from "bun:test";

import { minimumBalanceWarning } from "./minimum-balance";

const pix = (
	balanceCents: number,
	minimumCents: number | null,
	amountCents: number,
) =>
	minimumBalanceWarning({
		balanceCents,
		minimumCents,
		amountCents,
		kind: "EXPENSE",
		isCredit: false,
	});

describe("aviso de saldo mínimo", () => {
	test("avisa quando o gasto deixaria o saldo abaixo do mínimo (2.533,80, mínimo 500,00, Pix de 2.100,00 → 433,80)", () => {
		const r = pix(253_380, 50_000, 210_000);
		expect(r.warn).toBe(true);
		expect(r.balanceAfterCents).toBe(43_380);
	});

	test("não avisa quando o gasto deixa o saldo exatamente no mínimo", () => {
		expect(pix(100_000, 50_000, 50_000).warn).toBe(false);
	});

	test("não avisa para gasto no crédito, que não sai do saldo agora", () => {
		const r = minimumBalanceWarning({
			balanceCents: 253_380,
			minimumCents: 50_000,
			amountCents: 210_000,
			kind: "EXPENSE",
			isCredit: true,
		});
		expect(r.warn).toBe(false);
	});

	test("nunca avisa para entrada", () => {
		const r = minimumBalanceWarning({
			balanceCents: 10_000,
			minimumCents: 50_000,
			amountCents: 5_000,
			kind: "INCOME",
			isCredit: false,
		});
		expect(r.warn).toBe(false);
	});

	test("nunca avisa sem saldo mínimo configurado", () => {
		expect(pix(10_000, 0, 9_000).warn).toBe(false);
		expect(pix(10_000, null, 9_000).warn).toBe(false);
	});

	test("avisa quando o saldo já está abaixo do mínimo e o gasto o reduz mais", () => {
		expect(pix(30_000, 50_000, 1_000).warn).toBe(true);
	});

	test("dá erro com valores que não são inteiros em centavos", () => {
		expect(() => pix(100.5, 50_000, 1_000)).toThrow();
		expect(() => pix(100_000, 50_000, 10.5)).toThrow();
	});
});
