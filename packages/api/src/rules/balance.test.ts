import { describe, expect, test } from "bun:test";

import {
	type BalanceTransaction,
	computeBalance,
	creditToPaySummary,
} from "./balance";
import { lastDayOfMonth } from "./dates";

const HOJE = "2026-11-18";

const entrada = (
	amountCents: number,
	date = "2026-11-01",
): BalanceTransaction => ({ kind: "INCOME", amountCents, date });
const saida = (
	amountCents: number,
	date = "2026-11-02",
): BalanceTransaction => ({ kind: "EXPENSE", amountCents, date });
const credito = (
	amountCents: number,
	date: string,
	dueDate: string,
): BalanceTransaction => ({ kind: "EXPENSE", amountCents, date, dueDate });

describe("saldo", () => {
	test("dá saldo 0 numa conta nova, sem transações", () => {
		expect(computeBalance({ transactions: [] }, HOJE).balanceCents).toBe(0);
	});

	test("entrou 5.000,00 e saiu 2.000,00: saldo 3.000,00", () => {
		const { balanceCents } = computeBalance(
			{ transactions: [entrada(500_000), saida(200_000)] },
			HOJE,
		);
		expect(balanceCents).toBe(300_000);
	});

	test("mostra saldo negativo como número negativo, sem truncar em 0", () => {
		const { balanceCents } = computeBalance(
			{ transactions: [entrada(1_000), saida(5_000)] },
			HOJE,
		);
		expect(balanceCents).toBe(-4_000);
	});

	test("reduz o saldo ao guardar 500,00 numa meta e devolve ao resgatar", () => {
		const base = [entrada(300_000)];
		const guardou = computeBalance(
			{
				transactions: base,
				goalMovements: [
					{ type: "DEPOSIT", amountCents: 50_000, date: "2026-11-05" },
				],
			},
			HOJE,
		);
		expect(guardou.balanceCents).toBe(250_000);

		const resgatou = computeBalance(
			{
				transactions: base,
				goalMovements: [
					{ type: "DEPOSIT", amountCents: 50_000, date: "2026-11-05" },
					{ type: "WITHDRAW", amountCents: 50_000, date: "2026-11-10" },
				],
			},
			HOJE,
		);
		expect(resgatou.balanceCents).toBe(300_000);
	});

	test("devolve ao saldo o guardado ao concluir a meta", () => {
		const { balanceCents } = computeBalance(
			{
				transactions: [entrada(300_000)],
				goalMovements: [
					{ type: "DEPOSIT", amountCents: 40_000, date: "2026-11-05" },
					{ type: "COMPLETE", amountCents: 40_000, date: "2026-11-10" },
				],
			},
			HOJE,
		);
		expect(balanceCents).toBe(300_000);
	});

	test("não conta guardar nem resgatar como entrou nem como saiu", () => {
		const r = computeBalance(
			{
				transactions: [entrada(300_000), saida(10_000)],
				goalMovements: [
					{ type: "DEPOSIT", amountCents: 50_000, date: "2026-11-05" },
					{ type: "WITHDRAW", amountCents: 20_000, date: "2026-11-06" },
				],
			},
			HOJE,
		);
		expect(r.entrouCents).toBe(300_000);
		expect(r.saiuCents).toBe(10_000);
		expect(r.guardadoCents).toBe(30_000);
	});

	test("não reduz o saldo na data de uma compra no crédito", () => {
		const { balanceCents, creditToPayCents } = computeBalance(
			{
				transactions: [
					entrada(100_000),
					credito(10_000, "2026-11-10", "2026-11-27"),
				],
			},
			HOJE,
		);
		expect(balanceCents).toBe(100_000);
		expect(creditToPayCents).toBe(10_000);
	});

	test("reduz o saldo no vencimento da fatura", () => {
		const transactions = [
			entrada(100_000),
			credito(10_000, "2026-11-10", "2026-11-27"),
		];
		expect(computeBalance({ transactions }, "2026-11-26").balanceCents).toBe(
			100_000,
		);
		const noVencimento = computeBalance({ transactions }, "2026-11-27");
		expect(noVencimento.balanceCents).toBe(90_000);
		expect(noVencimento.creditToPayCents).toBe(0);
	});

	test("soma em 'crédito a pagar' só as compras ainda não vencidas", () => {
		const transactions = [
			entrada(500_000),
			credito(10_000, "2026-10-05", "2026-11-05"), // já venceu
			credito(20_000, "2026-11-10", "2026-11-27"),
			credito(5_000, "2026-11-12", "2026-12-27"),
		];
		const r = computeBalance({ transactions }, HOJE);
		expect(r.creditToPayCents).toBe(25_000);
		expect(r.balanceCents).toBe(500_000 - 10_000);
	});

	test("resume o crédito a pagar com a próxima fatura a vencer", () => {
		const transactions = [
			credito(10_000, "2026-10-05", "2026-11-05"),
			credito(20_000, "2026-11-10", "2026-11-27"),
			credito(5_000, "2026-11-12", "2026-12-27"),
			saida(1_000),
		];
		expect(creditToPaySummary(transactions, HOJE)).toEqual({
			totalCents: 25_000,
			nextDueDate: "2026-11-27",
		});
		expect(creditToPaySummary([], HOJE)).toEqual({
			totalCents: 0,
			nextDueDate: null,
		});
	});

	test("não conta no saldo atual uma transação com data futura", () => {
		const { balanceCents } = computeBalance(
			{ transactions: [entrada(100_000), saida(30_000, "2026-12-01")] },
			HOJE,
		);
		expect(balanceCents).toBe(100_000);
	});

	test("passa a contar a transação futura quando a data de referência chega nela, inclusive no próprio dia", () => {
		const transactions = [entrada(100_000), saida(30_000, "2026-12-01")];
		expect(computeBalance({ transactions }, "2026-11-30").balanceCents).toBe(
			100_000,
		);
		expect(computeBalance({ transactions }, "2026-12-01").balanceCents).toBe(
			70_000,
		);
		expect(computeBalance({ transactions }, "2026-12-02").balanceCents).toBe(
			70_000,
		);
	});

	test("não conta uma compra no crédito com data futura, nem no crédito a pagar", () => {
		const r = computeBalance(
			{
				transactions: [
					entrada(100_000),
					credito(10_000, "2026-11-25", "2026-12-27"),
				],
			},
			HOJE,
		);
		expect(r.balanceCents).toBe(100_000);
		expect(r.creditToPayCents).toBe(0);
	});

	test("calcula o saldo 'no fim de' um mês passado somando só até o último dia dele", () => {
		const transactions = [
			entrada(100_000, "2026-09-10"),
			saida(20_000, "2026-09-30"),
			saida(50_000, "2026-10-01"),
			entrada(70_000, "2026-10-15"),
		];
		const fimDeSetembro = lastDayOfMonth("2026-09-10");
		expect(computeBalance({ transactions }, fimDeSetembro).balanceCents).toBe(
			80_000,
		);
		expect(
			computeBalance({ transactions }, lastDayOfMonth("2026-10-01"))
				.balanceCents,
		).toBe(100_000);
	});

	test("conta como entrada o reembolso de uma divisão", () => {
		const { balanceCents, entrouCents } = computeBalance(
			{
				transactions: [saida(8_550), { ...entrada(2_850), date: "2026-11-05" }],
			},
			HOJE,
		);
		expect(entrouCents).toBe(2_850);
		expect(balanceCents).toBe(2_850 - 8_550);
	});

	test("recusa valor que não é inteiro em centavos", () => {
		expect(() =>
			computeBalance({ transactions: [entrada(10.5)] }, HOJE),
		).toThrow();
	});
});
