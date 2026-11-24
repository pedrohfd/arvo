import { describe, expect, test } from "bun:test";

import { toCents } from "./amount-input";
import { amountHint, centsToRaw, quickAmounts } from "./goal-amount";

const context = {
	availableCents: 251_340,
	savedCents: 40_000,
	targetCents: 50_000,
};

describe("amountHint · guardar", () => {
	test("dentro do disponível e da meta", () => {
		expect(amountHint("deposit", 10_000, context)).toEqual({
			kind: "info",
			text: "Disponível R$ 2.513,40",
			blocked: false,
		});
	});

	test("passa do disponível bloqueia", () => {
		const hint = amountHint("deposit", 300_000, context);
		expect(hint.kind).toBe("error");
		expect(hint.blocked).toBe(true);
		expect(hint.text).toBe("Você só tem R$ 2.513,40 disponível.");
	});

	test("passa da meta avisa mas deixa guardar", () => {
		const hint = amountHint("deposit", 13_000, context);
		expect(hint).toEqual({
			kind: "warn",
			text: "Passa R$ 30,00 da meta. Pode guardar.",
			blocked: false,
		});
	});

	test("chegar exatamente na meta não avisa", () => {
		expect(amountHint("deposit", 10_000, context).kind).toBe("info");
	});

	test("o teto do disponível vale antes do aviso da meta", () => {
		expect(amountHint("deposit", 251_341, context).kind).toBe("error");
	});
});

describe("amountHint · resgatar", () => {
	test("dentro do guardado", () => {
		expect(amountHint("withdraw", 5000, context)).toEqual({
			kind: "info",
			text: "Guardado R$ 400,00",
			blocked: false,
		});
	});

	test("tudo o que está guardado ainda pode", () => {
		expect(amountHint("withdraw", 40_000, context).blocked).toBe(false);
	});

	test("passa do guardado bloqueia", () => {
		const hint = amountHint("withdraw", 50_000, context);
		expect(hint.kind).toBe("error");
		expect(hint.blocked).toBe(true);
		expect(hint.text).toBe("Só tem R$ 400,00 guardado aqui.");
	});
});

describe("quickAmounts", () => {
	test("guardar traz o que falta", () => {
		expect(quickAmounts("deposit", context).map((q) => q.label)).toEqual([
			"R$ 50,00",
			"R$ 100,00",
			"O que falta · R$ 100,00",
		]);
	});

	test("meta já atingida não tem o que falta", () => {
		const reached = { ...context, savedCents: 50_000 };
		expect(quickAmounts("deposit", reached)).toHaveLength(2);
	});

	test("resgatar traz tudo", () => {
		const last = quickAmounts("withdraw", context).at(-1);
		expect(last).toEqual({ label: "Tudo · R$ 400,00", cents: 40_000 });
	});

	test("nada guardado não tem tudo", () => {
		expect(
			quickAmounts("withdraw", { ...context, savedCents: 0 }),
		).toHaveLength(2);
	});
});

describe("centsToRaw", () => {
	test.each([
		[0, ""],
		[12_000, "120"],
		[12_050, "120,5"],
		[12_005, "120,05"],
		[99, "0,99"],
	])("%i vira %p e volta igual", (cents, raw) => {
		expect(centsToRaw(cents)).toBe(raw);
		expect(toCents(raw)).toBe(cents);
	});
});
