import { describe, expect, test } from "bun:test";

import { splitBill } from "./split";

const soma = (valores: number[]) => valores.reduce((a, b) => a + b, 0);

describe("divisão da conta", () => {
	test("divide 85,50 entre 4 pessoas: cada uma 21,37 e você 21,39", () => {
		const { othersCents, yourShareCents } = splitBill(8_550, 4);
		expect(othersCents).toEqual([2_137, 2_137, 2_137]);
		expect(yourShareCents).toBe(2_139);
	});

	test("fecha a soma das partes com o total para vários totais e quantidades", () => {
		for (let total = 1; total <= 600; total++) {
			for (let pessoas = 1; pessoas <= 12; pessoas++) {
				const { othersCents, yourShareCents } = splitBill(total, pessoas);
				expect(soma(othersCents) + yourShareCents).toBe(total);
				expect(othersCents.length).toBe(pessoas - 1);
			}
		}
	});

	test("divide 100,00 entre 2 em 50,00 e 50,00, sem sobra", () => {
		const { othersCents, yourShareCents } = splitBill(10_000, 2);
		expect(othersCents).toEqual([5_000]);
		expect(yourShareCents).toBe(5_000);
	});

	test("deixa as outras duas com 0,00 e você com 0,01 ao dividir 0,01 entre 3", () => {
		const { othersCents, yourShareCents } = splitBill(1, 3);
		expect(othersCents).toEqual([0, 0]);
		expect(yourShareCents).toBe(1);
	});

	test("devolve uma parte igual ao total ao dividir só com você", () => {
		const { othersCents, yourShareCents } = splitBill(12_345, 1);
		expect(othersCents).toEqual([]);
		expect(yourShareCents).toBe(12_345);
	});

	test("dá erro com quantidade de pessoas menor que 1", () => {
		expect(() => splitBill(1_000, 0)).toThrow();
		expect(() => splitBill(1_000, -2)).toThrow();
		expect(() => splitBill(1_000, 1.5)).toThrow();
	});

	test("dá erro com total zero ou negativo", () => {
		expect(() => splitBill(0, 2)).toThrow();
		expect(() => splitBill(-100, 2)).toThrow();
	});

	test("dá erro com total que não é inteiro em centavos", () => {
		expect(() => splitBill(85.5, 4)).toThrow();
	});
});
