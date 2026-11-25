import type { QueueStorage } from "@/lib/offline-queue";

// A fila offline guardada no IndexedDB do aparelho: um banco "arvo" com a loja "outbox", cada item
// pelo seu `id`. Sem IndexedDB (navegação privada em alguns navegadores), a fila vive só em memória
// até a página fechar.

const DB_NAME = "arvo";
const STORE = "outbox";

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore(STORE, { keyPath: "id" });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function wrap<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function memoryStorage<Item extends { id: string }>(): QueueStorage<Item> {
	const items = new Map<string, Item>();
	return {
		async all() {
			return [...items.values()];
		},
		async put(item) {
			items.set(item.id, item);
		},
		async remove(id) {
			items.delete(id);
		},
	};
}

export function indexedDbStorage<
	Item extends { id: string },
>(): QueueStorage<Item> {
	if (typeof indexedDB === "undefined") return memoryStorage<Item>();

	let database: Promise<IDBDatabase> | null = null;
	const store = async (mode: IDBTransactionMode) => {
		database ??= openDatabase();
		const db = await database;
		return db.transaction(STORE, mode).objectStore(STORE);
	};

	return {
		async all() {
			return wrap<Item[]>((await store("readonly")).getAll());
		},
		async put(item) {
			await wrap((await store("readwrite")).put(item));
		},
		async remove(id) {
			await wrap((await store("readwrite")).delete(id));
		},
	};
}
