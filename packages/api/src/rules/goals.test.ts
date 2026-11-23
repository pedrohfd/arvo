import { describe, expect, test } from "bun:test";

import { computeBalance } from "./balance";
import {
	assertCanDeposit,
	assertCanWithdraw,
	completeGoal,
	isGoalReached,
	monthlyHint,
	savedCents,
} from "./goals";

describe("metas", () => {
	test("deixa guardar até o valor disponível e dá erro acima dele", () => {
		expect(() => assertCanDeposit(100_000, 100_000)).not.toThrow();
		expect(() => assertCanDeposit(100_000, 100_001)).toThrow();
		expect(() => assertCanDeposit(-5_000, 1)).toThrow(); // saldo negativo: nada disponível
	});

	test("deixa resgatar até o valor guardado naquela meta e dá erro acima dele", () => {
		expect(() => assertCanWithdraw(30_000, 30_000)).not.toThrow();
		expect(() => assertCanWithdraw(30_000, 30_001)).toThrow();
		expect(() => assertCanWithdraw(0, 1)).toThrow();
	});

	test("calcula o guardado: guardar soma, resgatar e concluir subtraem", () => {
		expect(
			savedCents([
				{ type: "DEPOSIT", amountCents: 50_000 },
				{ type: "DEPOSIT", amountCents: 20_000 },
				{ type: "WITHDRAW", amountCents: 10_000 },
			]),
		).toBe(60_000);
		expect(savedCents([])).toBe(0);
	});

	test("atinge o alvo quando o guardado é maior ou igual ao valor da meta", () => {
		expect(isGoalReached(49_999, 50_000)).toBe(false);
		expect(isGoalReached(50_000, 50_000)).toBe(true);
		expect(isGoalReached(60_000, 50_000)).toBe(true);
	});

	test('devolve ao saldo o valor guardado ao concluir uma meta "para gastar" atingida', () => {
		const concluir = completeGoal(
			{ kind: "SPEND", savedCents: 50_000, targetCents: 50_000 },
			"2026-11-20",
		);
		expect(concluir).toEqual({
			type: "COMPLETE",
			amountCents: 50_000,
			date: "2026-11-20",
		});

		const entrada = [
			{ kind: "INCOME" as const, amountCents: 300_000, date: "2026-11-01" },
		];
		const antes = computeBalance(
			{
				transactions: entrada,
				goalMovements: [
					{ type: "DEPOSIT", amountCents: 50_000, date: "2026-11-05" },
				],
			},
			"2026-11-20",
		);
		const depois = computeBalance(
			{
				transactions: entrada,
				goalMovements: [
					{ type: "DEPOSIT", amountCents: 50_000, date: "2026-11-05" },
					concluir,
				],
			},
			"2026-11-20",
		);
		expect(antes.balanceCents).toBe(250_000);
		expect(depois.balanceCents).toBe(300_000);
	});

	test('não tem concluir na meta "para manter", mesmo atingida: o valor só sai por resgate', () => {
		expect(() =>
			completeGoal(
				{ kind: "KEEP", savedCents: 600_000, targetCents: 600_000 },
				"2026-11-20",
			),
		).toThrow();
	});

	test("não conclui uma meta que ainda não foi atingida", () => {
		expect(() =>
			completeGoal(
				{ kind: "SPEND", savedCents: 40_000, targetCents: 50_000 },
				"2026-11-20",
			),
		).toThrow();
	});

	test("dá o valor mensal da dica: (alvo − guardado) ÷ meses restantes", () => {
		expect(
			monthlyHint({
				targetCents: 50_000,
				savedCents: 20_000,
				deadline: "2027-03-15",
				reference: "2026-11-23",
			}),
		).toEqual({ monthlyCents: 7_500, months: 4, deadline: "2027-03-15" });
	});

	test("arredonda o valor mensal para cima em centavos", () => {
		const dica = monthlyHint({
			targetCents: 30_001,
			savedCents: 20_000,
			deadline: "2027-02-10",
			reference: "2026-11-23",
		});
		// 10.001 ÷ 3 meses = 3.333,67 centavos → 3.334
		expect(dica?.monthlyCents).toBe(3_334);
		expect(
			(dica?.monthlyCents ?? 0) * (dica?.months ?? 0),
		).toBeGreaterThanOrEqual(10_001);
	});

	test("conta 1 mês quando a data limite cai no mês de hoje", () => {
		expect(
			monthlyHint({
				targetCents: 50_000,
				savedCents: 20_000,
				deadline: "2026-11-30",
				reference: "2026-11-23",
			})?.monthlyCents,
		).toBe(30_000);
	});

	test("ainda gera dica quando a data limite é hoje", () => {
		expect(
			monthlyHint({
				targetCents: 50_000,
				savedCents: 20_000,
				deadline: "2026-11-23",
				reference: "2026-11-23",
			})?.monthlyCents,
		).toBe(30_000);
	});

	test("não gera dica quando a data limite já passou", () => {
		expect(
			monthlyHint({
				targetCents: 50_000,
				savedCents: 20_000,
				deadline: "2026-11-22",
				reference: "2026-11-23",
			}),
		).toBeNull();
	});

	test("não gera dica sem data limite ou com a meta já atingida", () => {
		expect(
			monthlyHint({
				targetCents: 50_000,
				savedCents: 20_000,
				deadline: null,
				reference: "2026-11-23",
			}),
		).toBeNull();
		expect(
			monthlyHint({
				targetCents: 50_000,
				savedCents: 50_000,
				deadline: "2027-03-15",
				reference: "2026-11-23",
			}),
		).toBeNull();
	});

	test("dá erro ao guardar ou resgatar valor zero ou negativo", () => {
		expect(() => assertCanDeposit(100_000, 0)).toThrow();
		expect(() => assertCanDeposit(100_000, -100)).toThrow();
		expect(() => assertCanWithdraw(100_000, 0)).toThrow();
		expect(() => assertCanWithdraw(100_000, -100)).toThrow();
	});
});
