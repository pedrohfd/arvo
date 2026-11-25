// Fila offline do "+": o que é registrado sem rede fica guardado no aparelho e vai para o servidor
// quando a rede volta. A lógica (ordem, reenvio, recusa) é independente de onde se guarda e de como
// se envia; o app usa o IndexedDB e o tRPC, os testes usam memória.

export type QueueStatus = "pending" | "sending" | "failed";

export type QueuedItem<Input, Display> = {
	/** Gerado no aparelho; é o `clientId` que o servidor usa para não duplicar. */
	id: string;
	userId: string;
	/** O que vai para o servidor. */
	input: Input;
	/** O que a lista mostra enquanto o item não foi salvo. */
	display: Display;
	createdAt: string;
	status: QueueStatus;
	/** Por que o servidor recusou ("Não foi salvo"). */
	error: string | null;
};

export type SendOutcome =
	| { type: "sent" }
	| { type: "network" }
	| { type: "rejected"; message: string };

export type QueueStorage<Item> = {
	all(): Promise<Item[]>;
	put(item: Item): Promise<void>;
	remove(id: string): Promise<void>;
};

// Erro de rede, sessão expirada e falha do servidor mantêm o item para tentar depois; só uma
// recusa do servidor ("dados inválidos") marca "Não foi salvo".
const RETRY_LATER = new Set([
	"UNAUTHORIZED",
	"INTERNAL_SERVER_ERROR",
	"TIMEOUT",
	"TOO_MANY_REQUESTS",
	"BAD_GATEWAY",
	"SERVICE_UNAVAILABLE",
	"GATEWAY_TIMEOUT",
]);

export function classifySendError(error: unknown): SendOutcome {
	const code = (error as { data?: { code?: string } } | null)?.data?.code;
	if (code === undefined || RETRY_LATER.has(code)) return { type: "network" };
	const message = (error as { message?: string }).message;
	return { type: "rejected", message: message || "O servidor recusou" };
}

export function createQueue<Input, Display>(options: {
	storage: QueueStorage<QueuedItem<Input, Display>>;
	send: (item: QueuedItem<Input, Display>) => Promise<SendOutcome>;
}) {
	type Item = QueuedItem<Input, Display>;
	const { storage, send } = options;
	const listeners = new Set<() => void>();
	let flushing: Promise<void> | null = null;

	const changed = () => {
		for (const listener of listeners) listener();
	};

	// Na ordem em que foram registrados.
	async function list() {
		const items = await storage.all();
		return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	}

	async function run() {
		// Um item "enviando" que ficou de uma sessão interrompida volta a esperar.
		for (const item of await list()) {
			if (item.status === "sending") {
				await storage.put({ ...item, status: "pending" });
			}
		}
		for (const item of await list()) {
			if (item.status !== "pending") continue;
			await storage.put({ ...item, status: "sending", error: null });
			changed();
			const outcome = await send(item);
			if (outcome.type === "sent") {
				await storage.remove(item.id);
			} else if (outcome.type === "network") {
				await storage.put({ ...item, status: "pending", error: null });
				changed();
				return; // sem rede: o resto espera, na mesma ordem
			} else {
				await storage.put({
					...item,
					status: "failed",
					error: outcome.message,
				});
			}
			changed();
		}
	}

	return {
		list,

		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},

		async enqueue(item: Omit<Item, "status" | "error">) {
			await storage.put({ ...item, status: "pending", error: null } as Item);
			changed();
		},

		/** Envia o que está esperando. Fila vazia não chama nada; duas chamadas juntas viram uma. */
		flush(): Promise<void> {
			flushing ??= run().finally(() => {
				flushing = null;
			});
			return flushing;
		},

		/** "Tentar de novo": o item recusado volta para a fila e vai agora. */
		async retry(id: string) {
			const item = (await storage.all()).find((entry) => entry.id === id);
			if (!item) return;
			await storage.put({ ...item, status: "pending", error: null });
			changed();
			await this.flush();
		},

		/** "Apagar" um item da fila (ou "Desfazer" logo depois de registrar). */
		async discard(id: string) {
			await storage.remove(id);
			changed();
		},
	};
}
