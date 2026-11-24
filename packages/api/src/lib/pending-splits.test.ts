import { describe, expect, test } from "bun:test";

import { groupPendingSplits, type PendingSplitRow } from "./pending-splits";

function row(
	overrides: Partial<PendingSplitRow> & { splitId: string },
): PendingSplitRow {
	return {
		transactionId: `t-${overrides.splitId}`,
		personId: "p1",
		personName: "Camilly",
		amountCents: 1000,
		title: null,
		categoryName: "Lazer",
		categoryIcon: "film",
		date: "2026-10-12",
		...overrides,
	};
}

describe("groupPendingSplits", () => {
	test("sem partes não pagas, tudo zerado", () => {
		expect(groupPendingSplits([])).toEqual({
			totalCents: 0,
			billCount: 0,
			people: [],
		});
	});

	test("agrupa por pessoa, soma e ordena por quem deve mais", () => {
		const result = groupPendingSplits([
			row({
				splitId: "a",
				personId: "l",
				personName: "Ludmila",
				amountCents: 4300,
			}),
			row({ splitId: "b", amountCents: 5700, date: "2026-10-12" }),
			row({ splitId: "c", amountCents: 2850, date: "2026-10-08" }),
			row({
				splitId: "d",
				personId: "t",
				personName: "Thalles",
				amountCents: 2850,
			}),
		]);
		expect(result.totalCents).toBe(15700);
		expect(result.billCount).toBe(4);
		expect(result.people.map((p) => [p.name, p.totalCents])).toEqual([
			["Camilly", 8550],
			["Ludmila", 4300],
			["Thalles", 2850],
		]);
	});

	test("dentro da pessoa, a conta mais recente vem primeiro", () => {
		const result = groupPendingSplits([
			row({ splitId: "old", date: "2026-10-08" }),
			row({ splitId: "new", date: "2026-10-12" }),
		]);
		expect(result.people[0]?.items.map((i) => i.splitId)).toEqual([
			"new",
			"old",
		]);
	});

	test("empate no total desempata pelo nome", () => {
		const result = groupPendingSplits([
			row({
				splitId: "z",
				personId: "z",
				personName: "Zeca",
				amountCents: 500,
			}),
			row({ splitId: "a", personId: "a", personName: "Ana", amountCents: 500 }),
		]);
		expect(result.people.map((p) => p.name)).toEqual(["Ana", "Zeca"]);
	});

	test("a mesma conta dividida com duas pessoas conta uma vez", () => {
		const result = groupPendingSplits([
			row({ splitId: "a", transactionId: "t1", personId: "p1" }),
			row({
				splitId: "b",
				transactionId: "t1",
				personId: "p2",
				personName: "Ludmila",
			}),
		]);
		expect(result.billCount).toBe(1);
		expect(result.people).toHaveLength(2);
	});
});
