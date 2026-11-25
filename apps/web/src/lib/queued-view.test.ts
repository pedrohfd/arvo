import { describe, expect, test } from "bun:test";

import {
	clockLabel,
	type QueuedTx,
	queuedEffects,
	queuedRowsOfMonth,
} from "./queued-view";

function item(
	id: string,
	overrides: Partial<QueuedTx> & {
		rows?: QueuedTx["display"]["rows"];
		kind?: "EXPENSE" | "INCOME";
	} = {},
): QueuedTx {
	return {
		id,
		userId: "u1",
		createdAt: "2026-11-24T10:00:00Z",
		status: "pending",
		error: null,
		input: {} as QueuedTx["input"],
		display: {
			kind: overrides.kind ?? "EXPENSE",
			title: "Padaria",
			categoryId: "c1",
			categoryName: "Mercado",
			categoryIcon: "shopping-cart",
			cardId: null,
			methodLabel: "Pix",
			rows: overrides.rows ?? [
				{ index: 1, date: "2026-11-24", dueDate: null, amountCents: 1850 },
			],
		},
		...(overrides.status ? { status: overrides.status } : {}),
	};
}

describe("linhas da fila no mês", () => {
	test("só as ocorrências que caem no mês", () => {
		const items = [
			item("a", {
				rows: [
					{ index: 1, date: "2026-11-24", dueDate: null, amountCents: 5000 },
					{ index: 2, date: "2026-12-24", dueDate: null, amountCents: 5000 },
				],
			}),
		];
		expect(queuedRowsOfMonth(items, "2026-11").map((r) => r.date)).toEqual([
			"2026-11-24",
		]);
		expect(queuedRowsOfMonth(items, "2026-12")).toHaveLength(1);
		expect(queuedRowsOfMonth(items, "2026-10")).toHaveLength(0);
	});
});

describe("efeito da fila no saldo e no mês", () => {
	test("saída de hoje tira do saldo e soma em Saiu (Figma 1.6: 2.513,40 vira 2.494,90)", () => {
		const effects = queuedEffects([item("a")], "2026-11", "2026-11-24");
		expect(effects).toEqual({
			balanceDeltaCents: -1850,
			entrouDeltaCents: 0,
			saiuDeltaCents: 1850,
		});
	});

	test("entrada soma no saldo e em Entrou", () => {
		const effects = queuedEffects(
			[item("a", { kind: "INCOME" })],
			"2026-11",
			"2026-11-24",
		);
		expect(effects.balanceDeltaCents).toBe(1850);
		expect(effects.entrouDeltaCents).toBe(1850);
	});

	test("data futura ainda não mexe no saldo", () => {
		const effects = queuedEffects(
			[
				item("a", {
					rows: [
						{ index: 1, date: "2026-12-05", dueDate: null, amountCents: 1850 },
					],
				}),
			],
			"2026-11",
			"2026-11-24",
		);
		expect(effects.balanceDeltaCents).toBe(0);
		expect(effects.saiuDeltaCents).toBe(0);
	});

	test("o que o servidor recusou não entra nas contas", () => {
		const effects = queuedEffects(
			[item("a", { status: "failed" })],
			"2026-11",
			"2026-11-24",
		);
		expect(effects).toEqual({
			balanceDeltaCents: 0,
			entrouDeltaCents: 0,
			saiuDeltaCents: 0,
		});
	});

	test("compra no crédito pesa em Saiu, mas só tira do saldo no vencimento", () => {
		const effects = queuedEffects(
			[
				{
					...item("a", {
						rows: [
							{
								index: 1,
								date: "2026-11-24",
								dueDate: "2026-12-27",
								amountCents: 10000,
							},
						],
					}),
					display: {
						...item("a").display,
						cardId: "nubank",
						rows: [
							{
								index: 1,
								date: "2026-11-24",
								dueDate: "2026-12-27",
								amountCents: 10000,
							},
						],
					},
				},
			],
			"2026-11",
			"2026-11-24",
		);
		expect(effects.saiuDeltaCents).toBe(10000);
		expect(effects.balanceDeltaCents).toBe(0);
	});
});

describe("hora dos dados", () => {
	test("hora de Brasília", () => {
		// 17h20 UTC = 14h20 em Brasília
		expect(clockLabel(Date.UTC(2026, 10, 24, 17, 20))).toBe("14h20");
	});
});
