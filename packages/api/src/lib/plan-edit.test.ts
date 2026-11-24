import { describe, expect, test } from "bun:test";

import { addMonths } from "../rules/dates";
import { planDateShift } from "./plan-edit";

describe("planDateShift", () => {
	test("a ocorrência editada vai para a nova data e as seguintes acompanham", () => {
		const shift = planDateShift({
			editedIndex: 3,
			newDate: "2026-11-20",
			intervalMonths: 1,
		});
		expect(shift.dateFor(3)).toBe("2026-11-20");
		expect(shift.dateFor(4)).toBe("2026-12-20");
		expect(shift.dateFor(5)).toBe("2027-01-20");
		expect(shift.anchorDay).toBe(20);
	});

	test("dia 31 cai no último dia dos meses curtos sem perder o dia", () => {
		const shift = planDateShift({
			editedIndex: 1,
			newDate: "2026-01-31",
			intervalMonths: 1,
		});
		expect(shift.dateFor(2)).toBe("2026-02-28");
		expect(shift.dateFor(3)).toBe("2026-03-31");
	});

	test("periodicidade maior que 1 mês", () => {
		const shift = planDateShift({
			editedIndex: 2,
			newDate: "2026-06-10",
			intervalMonths: 3,
		});
		expect(shift.dateFor(3)).toBe("2026-09-10");
		expect(shift.dateFor(4)).toBe("2026-12-10");
	});

	test("o início reconstruído reproduz as datas da série", () => {
		for (const [editedIndex, newDate, interval] of [
			[1, "2026-11-20", 1],
			[3, "2026-11-30", 1],
			[5, "2026-03-31", 1],
			[2, "2026-05-31", 3],
			[4, "2026-08-29", 12],
		] as const) {
			const shift = planDateShift({
				editedIndex,
				newDate,
				intervalMonths: interval,
			});
			for (let index = editedIndex; index < editedIndex + 30; index++) {
				expect(
					addMonths(shift.startDate, (index - 1) * interval, shift.anchorDay),
				).toBe(shift.dateFor(index));
			}
		}
	});
});
