import { describe, expect, test } from "bun:test";

import {
	creditHint,
	defaultPayment,
	paymentOptions,
	type RegisterCard,
	repeatSummary,
	samePayment,
	visibleCategories,
} from "./register";

const nubank: RegisterCard = {
	id: "c1",
	name: "Nubank",
	type: "CREDIT",
	closingDay: 20,
	dueDay: 27,
};
const itau: RegisterCard = {
	id: "c2",
	name: "Itaú",
	type: "DEBIT",
	closingDay: null,
	dueDay: null,
};

describe("forma de pagamento", () => {
	test("saída começa no primeiro cartão; sem cartão, no Pix", () => {
		expect(defaultPayment("EXPENSE", [nubank, itau])).toEqual({
			kind: "card",
			cardId: "c1",
		});
		expect(defaultPayment("EXPENSE", [])).toEqual({ kind: "PIX" });
	});

	test("entrada começa no Pix, mesmo com cartões", () => {
		expect(defaultPayment("INCOME", [nubank])).toEqual({ kind: "PIX" });
	});

	test("opções da saída: cartões, Pix e dinheiro", () => {
		expect(
			paymentOptions("EXPENSE", [nubank, itau]).map((o) => o.label),
		).toEqual(["Nubank · crédito", "Itaú · débito", "Pix", "Dinheiro"]);
	});

	test("opções da entrada: Pix, depósito e dinheiro, sem cartão", () => {
		expect(paymentOptions("INCOME", [nubank]).map((o) => o.label)).toEqual([
			"Pix",
			"Depósito",
			"Dinheiro",
		]);
	});

	test("compara formas de pagamento", () => {
		expect(samePayment({ kind: "PIX" }, { kind: "PIX" })).toBe(true);
		expect(
			samePayment({ kind: "card", cardId: "a" }, { kind: "card", cardId: "a" }),
		).toBe(true);
		expect(
			samePayment({ kind: "card", cardId: "a" }, { kind: "card", cardId: "b" }),
		).toBe(false);
		expect(samePayment({ kind: "card", cardId: "a" }, { kind: "PIX" })).toBe(
			false,
		);
	});
});

describe("aviso do crédito", () => {
	test("compra no dia 18 entra na fatura que vence em 27/11", () => {
		expect(creditHint(nubank, "2026-11-18")).toBe(
			"Entra na fatura do Nubank que vence em 27/11. Só sai do saldo nesse dia.",
		);
	});

	test("depois do fechamento vai para a fatura do mês seguinte", () => {
		expect(creditHint(nubank, "2026-11-21")).toContain("vence em 27/12");
	});

	test("débito e Pix não têm aviso", () => {
		expect(creditHint(itau, "2026-11-18")).toBeNull();
		expect(creditHint(undefined, "2026-11-18")).toBeNull();
	});
});

describe("repetir todo mês", () => {
	test("10 meses de R$ 50,00 a partir de nov. de 2026 vão até ago. de 2027", () => {
		expect(
			repeatSummary({ amountCents: 5_000, date: "2026-11-18", count: 10 }),
		).toBe("R$ 50,00 por mês, de nov. de 2026 a ago. de 2027.");
	});

	test("sem fim diz o dia do mês", () => {
		expect(
			repeatSummary({ amountCents: 400_000, date: "2026-11-18", count: null }),
		).toBe("Todo dia 18, sem data para acabar.");
	});

	test("2 meses atravessam o ano", () => {
		expect(
			repeatSummary({ amountCents: 100, date: "2026-12-05", count: 2 }),
		).toContain("de dez. de 2026 a jan. de 2027");
	});
});

describe("chips de categoria", () => {
	const all = Array.from({ length: 9 }, (_, i) => ({ id: `k${i}` }));

	test("mostra as 6 primeiras e o Mais", () => {
		const { shown, hasMore } = visibleCategories(all, null);
		expect(shown.map((c) => c.id)).toEqual([
			"k0",
			"k1",
			"k2",
			"k3",
			"k4",
			"k5",
		]);
		expect(hasMore).toBe(true);
	});

	test("a escolhida na folha Mais continua à vista", () => {
		const { shown } = visibleCategories(all, "k8");
		expect(shown.at(-1)?.id).toBe("k8");
		expect(shown).toHaveLength(7);
	});

	test("com até 6 categorias não há Mais", () => {
		expect(visibleCategories(all.slice(0, 3), null).hasMore).toBe(false);
	});
});
