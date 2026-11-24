import { describe, expect, test } from "bun:test";

import {
	asksScope,
	badgeFor,
	type DetailTransaction,
	dateLabel,
	deletedToast,
	deleteText,
	paidLabel,
	paymentLabel,
	repeatLabel,
	scopeSheet,
	yourShare,
} from "./transaction-detail";

const hoje = "2026-11-18";

function tx(over: Partial<DetailTransaction> = {}): DetailTransaction {
	return {
		today: hoje,
		kind: "EXPENSE",
		amountCents: 12000,
		title: "Mercado",
		category: { name: "Mercado" },
		date: hoje,
		time: "14h32",
		dueDate: null,
		paymentMethod: "PIX",
		cardName: null,
		cardType: null,
		series: null,
		splits: [],
		...over,
	};
}

const credito = {
	paymentMethod: "CARD" as const,
	cardName: "Nubank",
	cardType: "CREDIT" as const,
	dueDate: "2026-11-27",
};

const parcela = {
	kind: "INSTALLMENT" as const,
	index: 3,
	count: 10,
	intervalMonths: 1,
	anchorDay: 17,
	nextDate: "2026-12-17",
	lastDate: "2027-06-17",
};

const dividida = (paid: [string | null, boolean][]) =>
	tx({
		title: "Aniversário da Camilly",
		amountCents: 8550,
		...credito,
		splits: paid.map(([paidAt, reimbursed], i) => ({
			person: { name: ["Camilly", "Thalles"][i] as string },
			amountCents: 2850,
			paidAt,
			reimbursed,
		})),
	});

describe("data e pagamento", () => {
	test("a hora entra só quando existe", () => {
		expect(dateLabel(tx())).toBe("Qua., 18 de nov., 14h32");
		expect(dateLabel(tx({ date: "2026-12-10", time: null }))).toBe(
			"Qui., 10 de dez.",
		);
	});

	test("cartão diz o nome e o tipo; o resto, a forma", () => {
		expect(paymentLabel(tx(credito))).toBe("Nubank · crédito");
		expect(
			paymentLabel(
				tx({ paymentMethod: "CARD", cardName: "Itaú", cardType: "DEBIT" }),
			),
		).toBe("Itaú · débito");
		expect(paymentLabel(tx({ paymentMethod: "CARD" }))).toBe("Cartão");
		expect(paymentLabel(tx())).toBe("Pix");
		expect(paymentLabel(tx({ paymentMethod: "CASH" }))).toBe("Dinheiro");
	});
});

describe("selo", () => {
	test("divisão com alguém devendo mostra quanto falta", () => {
		expect(
			badgeFor(
				dividida([
					["2026-11-18", true],
					[null, false],
				]),
			),
		).toEqual({ text: "Falta R$ 28,50", variant: "neutral" });
	});

	test("todos pagaram: tudo acertado", () => {
		expect(
			badgeFor(
				dividida([
					["2026-11-18", true],
					["2026-11-18", false],
				]),
			),
		).toEqual({ text: "Tudo acertado", variant: "income" });
	});

	test("parcela e data futura", () => {
		expect(badgeFor(tx({ series: parcela }))?.text).toBe("Parcela 3 de 10");
		expect(badgeFor(tx({ date: "2026-12-10" }))?.text).toBe(
			"Ainda não entra no saldo",
		);
		expect(badgeFor(tx())).toBeNull();
	});
});

describe("repete", () => {
	test("parcela: até quando, a próxima e quanto falta", () => {
		expect(repeatLabel(tx({ amountCents: 5000, series: parcela }))).toEqual({
			value: "Todo mês, até jun. de 2027",
			sub: "Próxima em 17 de dez. · faltam R$ 350,00",
		});
	});

	test("sem fim: o dia e sem data para acabar", () => {
		expect(
			repeatLabel(
				tx({
					series: {
						...parcela,
						kind: "RECURRING",
						count: null,
						index: 1,
						lastDate: "2028-10-17",
					},
				}),
			),
		).toEqual({ value: "Todo dia 17", sub: "Sem data para acabar" });
	});

	test("periodicidade e a última vez", () => {
		expect(
			repeatLabel(
				tx({
					series: {
						...parcela,
						kind: "RECURRING",
						intervalMonths: 12,
						count: 3,
						index: 3,
						nextDate: null,
						lastDate: "2026-11-18",
					},
				}),
			),
		).toEqual({ value: "Todo ano, até nov. de 2026", sub: "Última vez" });
		expect(
			repeatLabel(
				tx({ series: { ...parcela, intervalMonths: 3, count: 4, index: 1 } }),
			)?.value,
		).toBe("A cada 3 meses, até jun. de 2027");
		expect(repeatLabel(tx())).toBeNull();
	});
});

describe("divisão", () => {
	test("quem pagou diz quando e como", () => {
		const split = {
			person: { name: "Camilly" },
			amountCents: 2850,
			paidAt: hoje,
			reimbursed: true,
		};
		expect(paidLabel(split, hoje)).toBe("Pagou hoje · na conta");
		expect(
			paidLabel({ ...split, paidAt: "2026-11-17", reimbursed: false }, hoje),
		).toBe("Pagou ontem · em dinheiro");
		expect(paidLabel({ ...split, paidAt: "2026-11-02" }, hoje)).toBe(
			"Pagou em 02/11 · na conta",
		);
		expect(paidLabel({ ...split, paidAt: null }, hoje)).toBe("Ainda não pagou");
	});

	test("a sua parte fica com os centavos que sobram", () => {
		expect(
			yourShare({
				amountCents: 8550,
				splits: [2137, 2137, 2137].map((amountCents) => ({
					person: { name: "x" },
					amountCents,
					paidAt: null,
					reimbursed: false,
				})),
			}),
		).toBe(2139);
	});
});

describe("apagar", () => {
	test("crédito sai da fatura; a divisão leva junto a entrada de quem pagou", () => {
		expect(
			deleteText(
				dividida([
					["2026-11-18", true],
					[null, false],
				]),
			),
		).toBe(
			"“Aniversário da Camilly” sai da lista e da fatura do Nubank (R$ 85,50). A divisão também é apagada — e a entrada de R$ 28,50 de Camilly sai junto do seu saldo.",
		);
	});

	test("pago em dinheiro não tem entrada para levar", () => {
		expect(
			deleteText(
				dividida([
					["2026-11-18", false],
					[null, false],
				]),
			),
		).toMatch(/A divisão também é apagada\.$/);
		expect(
			deleteText(
				dividida([
					["2026-11-18", true],
					["2026-11-18", true],
				]),
			),
		).toMatch(/as entradas de R\$ 57,00 de quem já pagou saem junto/);
	});

	test("saída, entrada e data futura", () => {
		expect(deleteText(tx())).toBe(
			"“Mercado” sai da lista e R$ 120,00 volta para o saldo.",
		);
		expect(deleteText(tx({ kind: "INCOME", title: "Salário" }))).toBe(
			"“Salário” sai da lista e R$ 120,00 sai do saldo.",
		);
		expect(deleteText(tx({ date: "2026-12-10" }))).toBe(
			"“Mercado” sai da lista. Ainda não tinha saído do saldo.",
		);
	});

	test("série pergunta o alcance só se houver próximas", () => {
		expect(asksScope(tx({ series: parcela }))).toBe(true);
		expect(asksScope(tx({ series: { ...parcela, nextDate: null } }))).toBe(
			false,
		);
		expect(asksScope(tx())).toBe(false);
	});

	test("opções da parcela", () => {
		const sheet = scopeSheet(
			tx({ amountCents: 5000, date: "2026-11-17", series: parcela }),
		);
		expect(sheet.title).toBe("Apagar quais parcelas?");
		expect(sheet.only.desc).toBe(
			"Parcela 3 de 10 · R$ 50,00 volta para o saldo",
		);
		expect(sheet.next.desc).toBe("Parcelas 3 a 10 · as anteriores continuam");
		expect(sheet.button("THIS_AND_NEXT")).toBe("Apagar parcelas");
	});

	test("aviso depois de apagar", () => {
		expect(deletedToast("EXPENSE", 1, 8550)).toEqual({
			title: "Saída apagada",
			detail: "R$ 85,50",
		});
		expect(deletedToast("INCOME", 3, 100)).toEqual({
			title: "3 entradas apagadas",
			detail: null,
		});
	});
});
