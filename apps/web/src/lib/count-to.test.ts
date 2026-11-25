import { describe, expect, test } from "bun:test";

import { countValue, easeOut } from "./count-to";

describe("contagem do saldo", () => {
	test("começa no valor antigo e termina exatamente no novo", () => {
		expect(countValue(251340, 249490, 0)).toBe(251340);
		expect(countValue(251340, 249490, 1)).toBe(249490);
		expect(countValue(251340, 249490, 1.5)).toBe(249490);
	});

	test("desce e sobe sempre em centavos inteiros", () => {
		for (const progress of [0.1, 0.33, 0.5, 0.77, 0.99]) {
			expect(Number.isInteger(countValue(251340, 249490, progress))).toBe(true);
			expect(Number.isInteger(countValue(100, 5000, progress))).toBe(true);
		}
	});

	test("nunca passa dos dois valores", () => {
		for (let step = 0; step <= 100; step++) {
			const value = countValue(251340, 249490, step / 100);
			expect(value).toBeLessThanOrEqual(251340);
			expect(value).toBeGreaterThanOrEqual(249490);
		}
	});

	test("é monotônica (nunca volta atrás) e desacelera no fim", () => {
		let previous = 0;
		for (let step = 0; step <= 100; step++) {
			const eased = easeOut(step / 100);
			expect(eased).toBeGreaterThanOrEqual(previous);
			previous = eased;
		}
		expect(easeOut(0.9) - easeOut(0.8)).toBeLessThan(easeOut(0.1) - easeOut(0));
	});

	test("valor igual não anima", () => {
		expect(countValue(5000, 5000, 0.5)).toBe(5000);
	});
});
