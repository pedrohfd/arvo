import { describe, expect, test } from "bun:test";

import {
	classifySendError,
	createQueue,
	type QueuedItem,
	type QueueStorage,
	type SendOutcome,
} from "./offline-queue";

type Item = QueuedItem<{ amountCents: number }, { label: string }>;

function memoryStorage(): QueueStorage<Item> & { items: Map<string, Item> } {
	const items = new Map<string, Item>();
	return {
		items,
		async all() {
			return [...items.values()].map((item) => ({ ...item }));
		},
		async put(item) {
			items.set(item.id, { ...item });
		},
		async remove(id) {
			items.delete(id);
		},
	};
}

const base = (id: string, createdAt: string) => ({
	id,
	userId: "u1",
	input: { amountCents: 1850 },
	display: { label: id },
	createdAt,
});

function setup(outcomes: (item: Item) => SendOutcome) {
	const storage = memoryStorage();
	const sent: string[] = [];
	const queue = createQueue<Item["input"], Item["display"]>({
		storage,
		send: async (item) => {
			sent.push(item.id);
			return outcomes(item);
		},
	});
	return { storage, queue, sent };
}

describe("fila offline", () => {
	test("registrar sem rede coloca na fila como pendente", async () => {
		const { queue, storage } = setup(() => ({ type: "network" }));
		await queue.enqueue(base("a", "2026-11-24T10:00:00Z"));
		expect(storage.items.get("a")?.status).toBe("pending");
		expect((await queue.list()).map((item) => item.id)).toEqual(["a"]);
	});

	test("ao voltar a rede envia na ordem em que foram registrados", async () => {
		const { queue, sent } = setup(() => ({ type: "sent" }));
		await queue.enqueue(base("b", "2026-11-24T10:05:00Z"));
		await queue.enqueue(base("a", "2026-11-24T10:00:00Z"));
		await queue.enqueue(base("c", "2026-11-24T10:10:00Z"));
		await queue.flush();
		expect(sent).toEqual(["a", "b", "c"]);
	});

	test("envio com sucesso remove o item da fila", async () => {
		const { queue, storage } = setup(() => ({ type: "sent" }));
		await queue.enqueue(base("a", "2026-11-24T10:00:00Z"));
		await queue.flush();
		expect(storage.items.size).toBe(0);
	});

	test("erro de rede mantém o item e para; o resto espera na mesma ordem", async () => {
		const { queue, storage, sent } = setup(() => ({ type: "network" }));
		await queue.enqueue(base("a", "2026-11-24T10:00:00Z"));
		await queue.enqueue(base("b", "2026-11-24T10:05:00Z"));
		await queue.flush();
		expect(sent).toEqual(["a"]);
		expect(storage.items.get("a")?.status).toBe("pending");
		expect(storage.items.get("b")?.status).toBe("pending");

		await queue.flush();
		expect(sent).toEqual(["a", "a"]);
	});

	test("recusa do servidor marca Não foi salvo, mantém o item e segue para o próximo", async () => {
		const { queue, storage, sent } = setup((item) =>
			item.id === "a"
				? { type: "rejected", message: "Escolha uma categoria" }
				: { type: "sent" },
		);
		await queue.enqueue(base("a", "2026-11-24T10:00:00Z"));
		await queue.enqueue(base("b", "2026-11-24T10:05:00Z"));
		await queue.flush();
		expect(sent).toEqual(["a", "b"]);
		expect(storage.items.get("a")).toMatchObject({
			status: "failed",
			error: "Escolha uma categoria",
		});
		expect(storage.items.has("b")).toBe(false);
	});

	test("item recusado não é reenviado sozinho; Tentar de novo manda de novo", async () => {
		let accept = false;
		const { queue, storage, sent } = setup(() =>
			accept
				? { type: "sent" }
				: { type: "rejected", message: "Escolha uma categoria" },
		);
		await queue.enqueue(base("a", "2026-11-24T10:00:00Z"));
		await queue.flush();
		await queue.flush();
		expect(sent).toEqual(["a"]);

		accept = true;
		await queue.retry("a");
		expect(sent).toEqual(["a", "a"]);
		expect(storage.items.size).toBe(0);
	});

	test("reenviar um item que o servidor já salvou não duplica: o id do aparelho é sempre o mesmo", async () => {
		const received: string[] = [];
		const { queue } = setup((item) => {
			received.push(item.id);
			return { type: "network" };
		});
		await queue.enqueue(base("a", "2026-11-24T10:00:00Z"));
		await queue.flush();
		await queue.flush();
		expect(new Set(received)).toEqual(new Set(["a"]));
	});

	test("fila vazia não faz nenhuma chamada", async () => {
		const { queue, sent } = setup(() => ({ type: "sent" }));
		await queue.flush();
		expect(sent).toEqual([]);
	});

	test("item que ficou enviando de uma sessão interrompida volta a esperar e é enviado", async () => {
		const { queue, storage, sent } = setup(() => ({ type: "sent" }));
		storage.items.set("a", {
			...base("a", "2026-11-24T10:00:00Z"),
			status: "sending",
			error: null,
		});
		await queue.flush();
		expect(sent).toEqual(["a"]);
		expect(storage.items.size).toBe(0);
	});

	test("duas chamadas juntas viram um envio só", async () => {
		const { queue, sent } = setup(() => ({ type: "sent" }));
		await queue.enqueue(base("a", "2026-11-24T10:00:00Z"));
		await Promise.all([queue.flush(), queue.flush()]);
		expect(sent).toEqual(["a"]);
	});

	test("Apagar tira o item da fila sem enviar", async () => {
		const { queue, storage, sent } = setup(() => ({ type: "sent" }));
		await queue.enqueue(base("a", "2026-11-24T10:00:00Z"));
		await queue.discard("a");
		await queue.flush();
		expect(storage.items.size).toBe(0);
		expect(sent).toEqual([]);
	});

	test("avisa quem está olhando a cada mudança", async () => {
		const { queue } = setup(() => ({ type: "sent" }));
		let calls = 0;
		const stop = queue.subscribe(() => {
			calls++;
		});
		await queue.enqueue(base("a", "2026-11-24T10:00:00Z"));
		expect(calls).toBeGreaterThan(0);
		stop();
		const before = calls;
		await queue.discard("a");
		expect(calls).toBe(before);
	});
});

describe("classifySendError", () => {
	test("sem resposta do servidor é rede", () => {
		expect(classifySendError(new TypeError("Failed to fetch"))).toEqual({
			type: "network",
		});
	});
	test("sessão expirada e falha do servidor tentam de novo depois", () => {
		expect(classifySendError({ data: { code: "UNAUTHORIZED" } })).toEqual({
			type: "network",
		});
		expect(
			classifySendError({ data: { code: "INTERNAL_SERVER_ERROR" } }),
		).toEqual({ type: "network" });
	});
	test("dados inválidos são recusa, com a mensagem do servidor", () => {
		expect(
			classifySendError({
				data: { code: "BAD_REQUEST" },
				message: "Escolha uma categoria",
			}),
		).toEqual({ type: "rejected", message: "Escolha uma categoria" });
	});
});
