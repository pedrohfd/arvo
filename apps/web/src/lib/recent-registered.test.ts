import { describe, expect, test } from "bun:test";

import { createRecentStore } from "./recent-registered";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("registros de agora", () => {
	test("o id fica marcado e some depois do tempo", async () => {
		const store = createRecentStore(20);
		store.mark(["a"]);
		expect(store.get().has("a")).toBe(true);
		await sleep(40);
		expect(store.get().has("a")).toBe(false);
	});

	test("vários ids, e um novo registro não apaga o anterior antes da hora", async () => {
		const store = createRecentStore(30);
		store.mark(["a", "b"]);
		await sleep(15);
		store.mark(["c"]);
		expect([...store.get()].sort()).toEqual(["a", "b", "c"]);
		await sleep(25);
		expect([...store.get()]).toEqual(["c"]);
	});

	test("avisa quem está olhando quando muda", async () => {
		const store = createRecentStore(10);
		let calls = 0;
		const stop = store.subscribe(() => {
			calls++;
		});
		store.mark(["a"]);
		await sleep(30);
		expect(calls).toBe(2);
		stop();
	});

	test("sem ids não faz nada", () => {
		const store = createRecentStore(10);
		let calls = 0;
		store.subscribe(() => {
			calls++;
		});
		store.mark([]);
		expect(calls).toBe(0);
	});
});
