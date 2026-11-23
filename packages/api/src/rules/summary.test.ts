import { describe, expect, test } from "bun:test";

import {
	type BalanceGoalMovement,
	computeBalance,
	creditToPaySummary,
} from "./balance";
import {
	forecastHorizon,
	isFutureMonth,
	monthTotals,
	type SummaryTransaction,
	spendingByCategory,
	upcomingItems,
} from "./summary";

const HOJE = "2026-11-18";

const tx = (
	kind: "INCOME" | "EXPENSE",
	amountCents: number,
	date: string,
	categoryId = "cat-mercado",
	extra: Partial<SummaryTransaction> = {},
): SummaryTransaction => ({ kind, amountCents, date, categoryId, ...extra });

const credito = (
	amountCents: number,
	date: string,
	dueDate: string,
	categoryId = "cat-mercado",
	cardId = "nubank",
) => tx("EXPENSE", amountCents, date, categoryId, { dueDate, cardId });

const guardar = (
	amountCents: number,
	date: string,
	type: BalanceGoalMovement["type"] = "DEPOSIT",
): BalanceGoalMovement => ({ type, amountCents, date });

// Novembro de exemplo: entrou 4.000,00; saiu 1.200,00 (Pix) + 1.490,40 (crédito); guardou 1.470,00.
const novembro = [
	tx("INCOME", 400_000, "2026-11-01", "cat-salario"),
	tx("EXPENSE", 120_000, "2026-11-05"),
	credito(149_040, "2026-11-10", "2026-11-27"),
];
const metas = [guardar(147_000, "2026-11-06")];

describe("resumo do mês", () => {
	test('calcula "sobrou" = entrou − saiu do mês, com a linha "guardou" e o crédito', () => {
		expect(monthTotals(novembro, metas, "2026-11")).toEqual({
			month: "2026-11",
			entrouCents: 400_000,
			saiuCents: 269_040,
			sobrouCents: 130_960,
			guardouCents: 147_000,
			creditCents: 149_040,
		});
	});

	test("fecha com o saldo: sobrou − guardou + crédito a pagar = saldo", () => {
		const totais = monthTotals(novembro, metas, "2026-11");
		const { balanceCents } = computeBalance(
			{ transactions: novembro, goalMovements: metas },
			HOJE,
		);
		const { totalCents: creditoAPagar } = creditToPaySummary(novembro, HOJE);
		expect(totais.sobrouCents - totais.guardouCents + creditoAPagar).toBe(
			balanceCents,
		);
		expect(balanceCents).toBe(133_000);
	});

	test('mostra "faltou" como sobra negativa quando saiu mais do que entrou', () => {
		const totais = monthTotals(
			[tx("INCOME", 10_000, "2026-11-01"), tx("EXPENSE", 25_000, "2026-11-02")],
			[],
			"2026-11",
		);
		expect(totais.sobrouCents).toBe(-15_000);
	});

	test('segue a data da compra em "saiu", inclusive no crédito', () => {
		// Comprou em 25/10 e a fatura vence em 27/11: conta como saída de outubro, não de novembro.
		const transacoes = [credito(50_000, "2026-10-25", "2026-11-27")];
		expect(monthTotals(transacoes, [], "2026-10").saiuCents).toBe(50_000);
		expect(monthTotals(transacoes, [], "2026-11").saiuCents).toBe(0);
	});

	test('não conta guardar nem resgatar em "saiu" nem em "para onde foi"', () => {
		const movimentos = [
			guardar(80_000, "2026-11-06"),
			guardar(10_000, "2026-11-07", "WITHDRAW"),
		];
		const sem = monthTotals(novembro, [], "2026-11");
		const com = monthTotals(novembro, movimentos, "2026-11");
		expect(com.saiuCents).toBe(sem.saiuCents);
		expect(com.guardouCents).toBe(70_000);
		expect(spendingByCategory(novembro, "2026-11").totalCents).toBe(
			sem.saiuCents,
		);
	});

	test("usa só o que está agendado num mês futuro", () => {
		const agendado = [
			tx("INCOME", 400_000, "2026-12-17", "cat-salario"),
			tx("EXPENSE", 5_000, "2026-12-05", "cat-saude"),
		];
		expect(isFutureMonth("2026-12", HOJE)).toBe(true);
		expect(isFutureMonth("2026-11", HOJE)).toBe(false);
		expect(isFutureMonth("2026-10", HOJE)).toBe(false);
		expect(monthTotals(agendado, [], "2026-12").sobrouCents).toBe(395_000);
	});

	test("rejeita mês fora do formato AAAA-MM", () => {
		expect(() => monthTotals([], [], "2026-13")).toThrow();
		expect(() => monthTotals([], [], "2026-1")).toThrow();
		expect(() => monthTotals([], [], "2026-11-01")).toThrow();
	});
});

describe('"para onde foi"', () => {
	const categorias = (valores: number[]) =>
		valores.map((valor, i) =>
			tx("EXPENSE", valor, "2026-11-10", `cat-${i + 1}`),
		);

	test('mostra as 5 maiores categorias mais "Outras", e a soma sempre fecha com o total', () => {
		const r = spendingByCategory(
			categorias([500, 1_000, 900, 800, 700, 600, 300]),
			"2026-11",
		);
		expect(r.categories.map((c) => c.totalCents)).toEqual([
			1_000, 900, 800, 700, 600,
		]);
		expect(r.others).toEqual({ count: 2, totalCents: 800, percent: 17 });
		const soma =
			r.categories.reduce((s, c) => s + c.totalCents, 0) +
			(r.others?.totalCents ?? 0);
		expect(soma).toBe(r.totalCents);
		expect(r.totalCents).toBe(4_800);
	});

	test('não mostra "Outras" com menos de 6 categorias', () => {
		expect(
			spendingByCategory(categorias([500, 1_000, 900, 800, 700]), "2026-11")
				.others,
		).toBeNull();
		expect(spendingByCategory(categorias([500]), "2026-11").others).toBeNull();
	});

	test("soma várias compras da mesma categoria e calcula a parte de cada uma", () => {
		const r = spendingByCategory(
			[
				tx("EXPENSE", 600, "2026-11-02", "cat-mercado"),
				tx("EXPENSE", 400, "2026-11-20", "cat-mercado"),
				tx("EXPENSE", 1_000, "2026-11-10", "cat-casa"),
			],
			"2026-11",
		);
		expect(r.categories).toEqual([
			{ categoryId: "cat-casa", totalCents: 1_000, percent: 50 },
			{ categoryId: "cat-mercado", totalCents: 1_000, percent: 50 },
		]);
	});

	test("ignora entradas e transações de outros meses", () => {
		const r = spendingByCategory(
			[
				tx("EXPENSE", 1_000, "2026-11-10", "cat-a"),
				tx("INCOME", 9_999, "2026-11-11", "cat-salario"),
				tx("EXPENSE", 7_777, "2026-10-31", "cat-b"),
			],
			"2026-11",
		);
		expect(r.totalCents).toBe(1_000);
		expect(r.categories).toHaveLength(1);
	});

	test("devolve total 0 e nenhuma linha num mês sem saídas", () => {
		expect(spendingByCategory([], "2026-11")).toEqual({
			totalCents: 0,
			categories: [],
			others: null,
		});
	});
});

describe("o que vem e horizonte de saldos", () => {
	// Saldo disponível de hoje: 2.533,80 (já sem 1.000,00 guardados nas metas), com 1.490,40 no crédito.
	const base = [
		tx("INCOME", 353_380, "2026-11-01", "cat-salario"),
		credito(149_040, "2026-11-10", "2026-11-27"),
	];
	const guardado = [guardar(100_000, "2026-11-05")];
	const agendado = [
		tx("EXPENSE", 5_000, "2026-12-05", "cat-saude"), // farmácia
		tx("EXPENSE", 18_640, "2026-12-10", "cat-casa"), // conta de luz
		tx("INCOME", 400_000, "2026-12-17", "cat-salario"), // salário
		tx("EXPENSE", 290_000, "2027-01-15", "cat-carro"), // IPVA
	];
	const todas = [...base, ...agendado];

	test("parte do saldo disponível, já sem o guardado nas metas", () => {
		const { balanceCents } = computeBalance(
			{ transactions: todas, goalMovements: guardado },
			HOJE,
		);
		expect(balanceCents).toBe(253_380);
	});

	test("mostra o saldo previsto no fim de cada mês, de hoje até hoje + 5 meses", () => {
		const pontos = forecastHorizon({
			transactions: todas,
			goalMovements: guardado,
			reference: HOJE,
		});
		expect(pontos.map((p) => p.month)).toEqual([
			"2026-11",
			"2026-12",
			"2027-01",
			"2027-02",
			"2027-03",
			"2027-04",
		]);
		expect(pontos.map((p) => p.endDate)).toEqual([
			"2026-11-30",
			"2026-12-31",
			"2027-01-31",
			"2027-02-28",
			"2027-03-31",
			"2027-04-30",
		]);
	});

	test("inclui a fatura no mês do vencimento", () => {
		const pontos = forecastHorizon({
			transactions: todas,
			goalMovements: guardado,
			reference: HOJE,
		});
		// 2.533,80 − fatura de 1.490,40 (vence 27/11) = 1.043,40 no fim de novembro.
		expect(pontos[0]?.balanceCents).toBe(104_340);
		// Dezembro: − 50,00 − 186,40 + 4.000,00
		expect(pontos[1]?.balanceCents).toBe(480_700);
		// Janeiro: − IPVA de 2.900,00, e os meses seguintes ficam retos.
		expect(pontos.slice(2).map((p) => p.balanceCents)).toEqual([
			190_700, 190_700, 190_700, 190_700,
		]);
	});

	test("coloca a fatura de uma compra depois do fechamento no mês seguinte", () => {
		const pontos = forecastHorizon({
			transactions: [
				tx("INCOME", 500_000, "2026-11-01"),
				credito(100_000, "2026-11-25", "2026-12-27"),
			],
			goalMovements: [],
			reference: HOJE,
			monthsAhead: 1,
		});
		expect(pontos[0]?.balanceCents).toBe(500_000); // a compra é futura: nada sai em novembro
		expect(pontos[1]?.balanceCents).toBe(400_000);
	});

	test("marca os meses abaixo do saldo mínimo", () => {
		const pontos = forecastHorizon({
			transactions: todas,
			goalMovements: guardado,
			reference: HOJE,
			minimumCents: 200_000,
		});
		expect(pontos.map((p) => p.belowMinimum)).toEqual([
			true, // 1.043,40
			false, // 4.807,00
			true, // 1.907,00
			true,
			true,
			true,
		]);
	});

	test("não marca nenhum mês com saldo mínimo 0 ou sem configuração", () => {
		for (const minimumCents of [0, null, undefined]) {
			const pontos = forecastHorizon({
				transactions: todas,
				goalMovements: guardado,
				reference: HOJE,
				minimumCents,
			});
			expect(pontos.every((p) => !p.belowMinimum)).toBe(true);
		}
	});

	test("não marca um mês que fica exatamente no saldo mínimo", () => {
		const pontos = forecastHorizon({
			transactions: [tx("INCOME", 50_000, "2026-11-01")],
			goalMovements: [],
			reference: HOJE,
			minimumCents: 50_000,
			monthsAhead: 0,
		});
		expect(pontos[0]?.belowMinimum).toBe(false);
	});

	test("mantém a linha reta no saldo atual quando não há nada agendado", () => {
		const pontos = forecastHorizon({
			transactions: [
				tx("INCOME", 120_000, "2026-11-01"),
				tx("EXPENSE", 20_000, "2026-11-05"),
			],
			goalMovements: [],
			reference: HOJE,
		});
		expect(pontos).toHaveLength(6);
		expect(pontos.every((p) => p.balanceCents === 100_000)).toBe(true);
	});

	test("conta no mês o que está agendado para o último dia dele", () => {
		const pontos = forecastHorizon({
			transactions: [
				tx("INCOME", 100_000, "2026-11-01"),
				tx("EXPENSE", 10_000, "2026-12-31"),
			],
			goalMovements: [],
			reference: HOJE,
			monthsAhead: 1,
		});
		expect(pontos[0]?.balanceCents).toBe(100_000);
		expect(pontos[1]?.balanceCents).toBe(90_000);
	});

	test("não conta duas vezes o que é de hoje nem a fatura que vence hoje: já estão no saldo atual", () => {
		const transacoes = [
			tx("INCOME", 100_000, "2026-11-01"),
			tx("EXPENSE", 10_000, HOJE),
			credito(30_000, "2026-11-02", HOJE),
		];
		expect(upcomingItems(transacoes, HOJE)).toEqual([]);
		const pontos = forecastHorizon({
			transactions: transacoes,
			goalMovements: [],
			reference: HOJE,
			monthsAhead: 1,
		});
		// 1.000,00 − 100,00 − 300,00 = 600,00, e a linha continua reta.
		expect(pontos.map((p) => p.balanceCents)).toEqual([60_000, 60_000]);
	});

	test("agrupa as compras no crédito em uma fatura por cartão e vencimento, em ordem de data", () => {
		const itens = upcomingItems(
			[
				credito(100_000, "2026-11-02", "2026-11-27"),
				credito(49_040, "2026-11-10", "2026-11-27"),
				credito(30_000, "2026-11-12", "2026-11-27", "cat-casa", "itau"),
				tx("EXPENSE", 5_000, "2026-11-20", "cat-saude"),
				tx("EXPENSE", 9_999, "2026-11-01"), // já passou
				credito(1_000, "2026-10-01", "2026-11-05"), // fatura já venceu
			],
			HOJE,
		);
		expect(itens.map((i) => [i.type, i.date])).toEqual([
			["TRANSACTION", "2026-11-20"],
			["INVOICE", "2026-11-27"],
			["INVOICE", "2026-11-27"],
		]);
		const faturas = itens.flatMap((i) => (i.type === "INVOICE" ? [i] : []));
		expect(faturas.find((f) => f.cardId === "nubank")?.amountCents).toBe(
			149_040,
		);
		expect(faturas.find((f) => f.cardId === "itau")?.amountCents).toBe(30_000);
	});

	test('limita "o que vem" até uma data', () => {
		const itens = upcomingItems(agendado, HOJE, "2026-12-31");
		expect(itens.map((i) => i.date)).toEqual([
			"2026-12-05",
			"2026-12-10",
			"2026-12-17",
		]);
	});
});
