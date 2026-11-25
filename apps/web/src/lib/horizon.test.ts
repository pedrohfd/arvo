import { describe, expect, test } from "bun:test";

import {
	chartPoints,
	negativeWarning,
	niceTicks,
	tickLabel,
	type UpcomingApiItem,
	upcomingByMonth,
} from "./horizon";

const point = (month: string, balanceCents: number, belowMinimum = false) => ({
	month,
	balanceCents,
	belowMinimum,
});

describe("chartPoints", () => {
	test("começa em hoje e pula o fim do mês atual", () => {
		const points = chartPoints(
			251340,
			[
				point("2026-11", 104340),
				point("2026-12", 480000),
				point("2027-01", 560000),
			],
			50000,
		);
		expect(points.map((p) => p.label)).toEqual(["hoje", "dez.", "jan."]);
		expect(points[0]?.cents).toBe(251340);
	});

	test("hoje abaixo do mínimo fica marcado; sem mínimo, nunca", () => {
		expect(
			chartPoints(30000, [point("2026-11", 0)], 50000)[0]?.belowMinimum,
		).toBe(true);
		expect(chartPoints(30000, [point("2026-11", 0)], 0)[0]?.belowMinimum).toBe(
			false,
		);
	});
});

describe("eixo", () => {
	test("tela normal do Figma: 0 a 20 mil de 5 em 5", () => {
		expect(niceTicks(251340, 1770700)).toEqual([
			0, 500000, 1000000, 1500000, 2000000,
		]);
	});

	test("tela negativa do Figma: -4 mil a 4 mil de 2 em 2", () => {
		expect(niceTicks(-229300, 251340)).toEqual([
			-400000, -200000, 0, 200000, 400000,
		]);
	});

	test("sempre inclui o zero, mesmo com tudo positivo ou tudo negativo", () => {
		expect(niceTicks(100000, 120000)).toContain(0);
		expect(niceTicks(-120000, -100000)).toContain(0);
	});

	test("rótulos", () => {
		expect(tickLabel(0)).toBe("0");
		expect(tickLabel(2000000)).toBe("20 mil");
		expect(tickLabel(-200000)).toBe("−2 mil");
		expect(tickLabel(50000)).toBe("500");
		expect(tickLabel(250000)).toBe("2.500");
	});
});

const upcoming: UpcomingApiItem[] = [
	{
		type: "INVOICE",
		date: "2026-11-27",
		amountCents: 149040,
		cardName: "Nubank",
	},
	{
		type: "TRANSACTION",
		date: "2026-12-10",
		amountCents: 18640,
		kind: "EXPENSE",
		title: null,
		paymentMethod: "PIX",
		cardName: null,
		category: { name: "Conta de luz", icon: "house" },
	},
	{
		type: "TRANSACTION",
		date: "2026-12-17",
		amountCents: 400000,
		kind: "INCOME",
		title: "Salário",
		paymentMethod: "PIX",
		cardName: null,
		category: { name: "Salário", icon: "briefcase" },
	},
	{
		type: "TRANSACTION",
		date: "2027-01-15",
		amountCents: 290000,
		kind: "EXPENSE",
		title: "IPVA",
		paymentMethod: "PIX",
		cardName: null,
		category: { name: "Transporte", icon: "car" },
	},
];

describe("O que vem", () => {
	test("agrupa por mês com o total do mês e o texto de cada linha", () => {
		const months = upcomingByMonth(upcoming, "2026-11-24");
		expect(months.map((m) => [m.month, m.netCents])).toEqual([
			["2026-11", -149040],
			["2026-12", 381360],
			["2027-01", -290000],
		]);
		expect(months[0]?.rows[0]).toMatchObject({
			name: "Fatura Nubank",
			sub: "27 de nov. · crédito",
			invoice: true,
			signedCents: -149040,
		});
		expect(months[1]?.rows[0]).toMatchObject({
			name: "Conta de luz",
			sub: "10 de dez. · Pix",
		});
	});
});

describe("aviso do mês negativo", () => {
	test("diz o mês, o saldo e a saída que mais pesa", () => {
		const points = chartPoints(
			251340,
			[
				point("2026-11", 0),
				point("2026-12", 81000),
				point("2027-01", -214300, true),
				point("2027-02", -220000, true),
			],
			50000,
		);
		expect(negativeWarning(points, upcoming)).toBe(
			"Em janeiro o saldo fica em −R$ 2.143,00 se nada mudar. Pesa mais: IPVA, R$ 2.900,00, em 15/01.",
		);
	});

	test("sem mês negativo, sem aviso", () => {
		const points = chartPoints(
			251340,
			[point("2026-11", 0), point("2026-12", 5000)],
			0,
		);
		expect(negativeWarning(points, upcoming)).toBeNull();
	});
});
