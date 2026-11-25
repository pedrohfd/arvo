import { describe, expect, test } from "bun:test";

import {
	bestPurchaseDay,
	dueDateForPurchase,
	installmentDueDates,
	invoiceDueDate,
	invoiceTotals,
	openInvoice,
} from "./invoice";

// Cartão de exemplo do DESIGN.md: fecha dia 20, vence dia 27.
const NUBANK = { type: "CREDIT", closingDay: 20, dueDay: 27 } as const;

describe("fatura do cartão de crédito", () => {
	test("vence dia 27 do mesmo mês para compra no dia do fechamento (fecha 20, vence 27)", () => {
		expect(invoiceDueDate("2026-11-20", 20, 27)).toBe("2026-11-27");
	});

	test("vence dia 27 do mês seguinte para compra no dia 21 (fecha 20, vence 27)", () => {
		expect(invoiceDueDate("2026-11-21", 20, 27)).toBe("2026-12-27");
	});

	test("vence neste mês para compra no dia 1", () => {
		expect(invoiceDueDate("2026-11-01", 20, 27)).toBe("2026-11-27");
	});

	test("vira o ano: compra em 25/12 com fechamento dia 20 vence em janeiro do ano seguinte", () => {
		expect(invoiceDueDate("2026-12-25", 20, 27)).toBe("2027-01-27");
	});

	test("vence no mês seguinte ao do fechamento quando o vencimento vem antes dele (fecha 28, vence 5)", () => {
		expect(invoiceDueDate("2026-11-10", 28, 5)).toBe("2026-12-05");
		expect(invoiceDueDate("2026-11-28", 28, 5)).toBe("2026-12-05");
		// Depois do fechamento a compra vai para a fatura seguinte, que vence um mês depois.
		expect(invoiceDueDate("2026-11-29", 28, 5)).toBe("2027-01-05");
	});

	test("vence no mês seguinte quando fechamento e vencimento caem no mesmo dia (fecha 20, vence 20)", () => {
		expect(invoiceDueDate("2026-11-20", 20, 20)).toBe("2026-12-20");
		expect(invoiceDueDate("2026-11-21", 20, 20)).toBe("2027-01-20");
	});

	test("usa o último dia do mês quando o dia de vencimento não existe (30 em fevereiro)", () => {
		expect(invoiceDueDate("2027-02-10", 15, 30)).toBe("2027-02-28");
		expect(invoiceDueDate("2028-02-10", 15, 30)).toBe("2028-02-29");
	});

	test("usa o último dia do mês quando o dia de fechamento não existe (31 em fevereiro)", () => {
		// Em fevereiro o fechamento 31 vale 28: a compra do dia 28 ainda entra nesta fatura.
		expect(invoiceDueDate("2027-02-28", 31, 5)).toBe("2027-03-05");
		expect(invoiceDueDate("2027-03-01", 31, 5)).toBe("2027-04-05");
	});

	test("dá erro com dia de fechamento ou vencimento fora de 1 a 31", () => {
		expect(() => invoiceDueDate("2026-11-10", 0, 27)).toThrow();
		expect(() => invoiceDueDate("2026-11-10", 20, 32)).toThrow();
		expect(() => invoiceDueDate("2026-11-10", 20.5, 27)).toThrow();
	});

	test("indica como melhor dia de compra o dia seguinte ao fechamento", () => {
		expect(bestPurchaseDay(20, "2026-11-05")).toBe("2026-11-21");
	});

	test("indica o dia 1 do mês seguinte quando o fechamento é o último dia do mês (31 em mês de 30 dias)", () => {
		expect(bestPurchaseDay(31, "2026-11-05")).toBe("2026-12-01");
		expect(bestPurchaseDay(31, "2027-02-05")).toBe("2027-03-01");
		expect(bestPurchaseDay(31, "2026-12-05")).toBe("2027-01-01");
	});

	test("soma o valor da fatura com as compras que caem nela, em ordem de vencimento", () => {
		const faturas = invoiceTotals([
			{ amountCents: 10_000, dueDate: "2026-12-27" },
			{ amountCents: 20_000, dueDate: "2026-11-27" },
			{ amountCents: 5_050, dueDate: "2026-11-27" },
		]);
		expect(faturas).toEqual([
			{ dueDate: "2026-11-27", totalCents: 25_050 },
			{ dueDate: "2026-12-27", totalCents: 10_000 },
		]);
	});

	test("não gera fatura para débito, Pix e dinheiro (saem na hora)", () => {
		expect(dueDateForPurchase({ type: "DEBIT" }, "2026-11-10")).toBeNull();
		expect(dueDateForPurchase(null, "2026-11-10")).toBeNull(); // Pix ou dinheiro
	});

	test("gera fatura para crédito, e dá erro se o cartão não tem fechamento e vencimento", () => {
		expect(dueDateForPurchase(NUBANK, "2026-11-10")).toBe("2026-11-27");
		expect(() =>
			dueDateForPurchase({ type: "CREDIT" }, "2026-11-10"),
		).toThrow();
	});

	test("lança cada parcela na fatura do seu mês, na ordem", () => {
		expect(installmentDueDates("2026-11-18", 3, NUBANK)).toEqual([
			{ purchaseDate: "2026-11-18", dueDate: "2026-11-27" },
			{ purchaseDate: "2026-12-18", dueDate: "2026-12-27" },
			{ purchaseDate: "2027-01-18", dueDate: "2027-01-27" },
		]);
	});

	test("começa a primeira parcela na fatura seguinte quando a compra passa do fechamento", () => {
		const parcelas = installmentDueDates("2026-11-25", 3, NUBANK);
		expect(parcelas.map((p) => p.dueDate)).toEqual([
			"2026-12-27",
			"2027-01-27",
			"2027-02-27",
		]);
	});

	test("mantém o dia nas parcelas e usa o último do mês nos meses curtos", () => {
		const parcelas = installmentDueDates("2026-01-31", 3, {
			type: "CREDIT",
			closingDay: 31,
			dueDay: 10,
		});
		expect(parcelas.map((p) => p.purchaseDate)).toEqual([
			"2026-01-31",
			"2026-02-28",
			"2026-03-31",
		]);
	});

	test("dá erro com parcelamento de menos de 1 parcela ou em cartão de débito", () => {
		expect(() => installmentDueDates("2026-11-18", 0, NUBANK)).toThrow();
		expect(() =>
			installmentDueDates("2026-11-18", 2, { type: "DEBIT" }),
		).toThrow();
	});
});

describe("fatura aberta", () => {
	const purchases = [
		{ amountCents: 100_00, date: "2026-11-05", dueDate: "2026-11-27" },
		{ amountCents: 50_00, date: "2026-11-21", dueDate: "2026-12-27" },
		{ amountCents: 30_00, date: "2026-10-10", dueDate: "2026-10-27" },
		{ amountCents: 70_00, date: "2026-11-30", dueDate: "2026-12-27" },
	];

	test("é a que vence primeiro, só com compras já feitas e ainda não vencidas", () => {
		expect(openInvoice(purchases, "2026-11-24")).toEqual({
			dueDate: "2026-11-27",
			totalCents: 100_00,
		});
	});

	test("depois do vencimento passa para a próxima, sem as compras de data futura", () => {
		expect(openInvoice(purchases, "2026-11-28")).toEqual({
			dueDate: "2026-12-27",
			totalCents: 50_00,
		});
	});

	test("é nula quando nada está em aberto", () => {
		expect(openInvoice(purchases, "2026-12-27")).toBeNull();
		expect(openInvoice([], "2026-11-24")).toBeNull();
	});
});
