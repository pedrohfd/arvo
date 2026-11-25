import { describe, expect, test } from "bun:test";

import {
	dayLabel,
	formatMoney,
	formatShortDate,
	formatSigned,
	moneyParts,
	monthName,
	monthShort,
} from "./format";

describe("dinheiro", () => {
	test("formata em reais com milhar e vírgula", () => {
		expect(formatMoney(248_490)).toBe("R$ 2.484,90");
		expect(formatMoney(5)).toBe("R$ 0,05");
		expect(formatMoney(999_999_999)).toBe("R$ 9.999.999,99");
	});

	test("negativo usa o sinal de menos", () => {
		expect(formatMoney(-1_250)).toBe("−R$ 12,50");
		expect(moneyParts(-1_250).negative).toBe(true);
	});

	test("separa os centavos para o saldo grande", () => {
		expect(moneyParts(251_340)).toEqual({
			negative: false,
			integer: "R$ 2.513",
			cents: ",40",
		});
	});

	test("valor com sinal e espaço, como nas linhas do Figma", () => {
		expect(formatSigned(-12_000)).toBe("− R$ 120,00");
		expect(formatSigned(400_000)).toBe("+ R$ 4.000,00");
		expect(formatSigned(0)).toBe("R$ 0,00");
	});
});

describe("datas", () => {
	test("rótulos do dia", () => {
		const hoje = "2026-11-23";
		expect(dayLabel("2026-11-23", hoje)).toBe("Hoje");
		expect(dayLabel("2026-11-22", hoje)).toBe("Ontem");
		expect(dayLabel("2026-11-24", hoje)).toBe("Amanhã");
		// 16/11/2026 é segunda-feira: o Figma mostra "Seg., 16 de nov."
		expect(dayLabel("2026-11-16", hoje)).toBe("Seg., 16 de nov.");
		expect(dayLabel("2025-12-31", hoje)).toBe("Qua., 31 de dez. 2025");
	});

	test("ontem atravessa a virada de mês e de ano", () => {
		expect(dayLabel("2026-12-31", "2027-01-01")).toBe("Ontem");
		expect(dayLabel("2026-02-28", "2026-03-01")).toBe("Ontem");
	});

	test("nomes do mês", () => {
		expect(monthName("2026-11")).toBe("Novembro");
		expect(monthName("2026-03")).toBe("Março");
		expect(monthShort("2026-11")).toBe("nov.");
	});

	test("data curta", () => {
		expect(formatShortDate("2026-11-27")).toBe("27/11");
	});
});
