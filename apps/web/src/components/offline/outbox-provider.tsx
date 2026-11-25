import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from "react";

import {
	classifySendError,
	createQueue,
	type SendOutcome,
} from "@/lib/offline-queue";
import { indexedDbStorage } from "@/lib/offline-storage";
import type { CreateInput, QueuedDisplay, QueuedTx } from "@/lib/queued-view";
import { refreshMoney } from "@/lib/refresh-money";
import { trpcClient } from "@/utils/trpc";

// A fila offline do "+" ligada ao app: guarda o que foi registrado sem rede, manda quando a rede
// volta e deixa as telas lerem o que ainda não foi salvo.

type Outbox = {
	/** Itens da fila do usuário de agora, na ordem em que foram registrados. */
	items: QueuedTx[];
	/** O aparelho está com rede? */
	online: boolean;
	/** Guarda um registro para enviar quando houver rede (e tenta agora, se houver). */
	enqueue: (entry: {
		id: string;
		input: CreateInput;
		display: QueuedDisplay;
	}) => Promise<void>;
	/** "Tentar de novo" num item que o servidor recusou. */
	retry: (id: string) => Promise<void>;
	/** "Apagar" ou "Desfazer": tira da fila sem enviar. */
	discard: (id: string) => Promise<void>;
};

const Context = createContext<Outbox | null>(null);

export function useOutbox() {
	const context = useContext(Context);
	if (!context) throw new Error("useOutbox fora do OutboxProvider");
	return context;
}

function subscribeOnline(callback: () => void) {
	window.addEventListener("online", callback);
	window.addEventListener("offline", callback);
	return () => {
		window.removeEventListener("online", callback);
		window.removeEventListener("offline", callback);
	};
}

export function useOnline() {
	return useSyncExternalStore(
		subscribeOnline,
		() => navigator.onLine,
		() => true,
	);
}

async function send(item: QueuedTx): Promise<SendOutcome> {
	try {
		// `clientId` é o id do item: se um envio chegou e a resposta se perdeu, o servidor devolve o
		// que já salvou em vez de criar de novo.
		await trpcClient.transaction.create.mutate({
			...item.input,
			clientId: item.id,
		});
		return { type: "sent" };
	} catch (error) {
		return classifySendError(error);
	}
}

export function OutboxProvider({
	userId,
	children,
}: {
	userId: string;
	children: ReactNode;
}) {
	const queue = useMemo(
		() => createQueue({ storage: indexedDbStorage<QueuedTx>(), send }),
		[],
	);
	const [all, setAll] = useState<QueuedTx[]>([]);
	const online = useOnline();

	const reload = useCallback(() => queue.list().then(setAll), [queue]);

	// Mostra a fila e avisa quando algo muda; depois de cada envio, recarrega o que depende do dinheiro.
	useEffect(() => {
		reload();
		return queue.subscribe(() => {
			reload();
		});
	}, [queue, reload]);

	// Tenta enviar ao abrir, quando a rede volta e quando o app volta ao primeiro plano.
	useEffect(() => {
		async function flush() {
			if (!navigator.onLine) return;
			await queue.flush();
			refreshMoney();
		}
		flush();
		const onVisible = () => {
			if (document.visibilityState === "visible") flush();
		};
		window.addEventListener("online", flush);
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			window.removeEventListener("online", flush);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [queue]);

	const value = useMemo<Outbox>(
		() => ({
			items: all.filter((item) => item.userId === userId),
			online,
			enqueue: async ({ id, input, display }) => {
				await queue.enqueue({
					id,
					userId,
					input,
					display,
					createdAt: new Date().toISOString(),
				});
				if (navigator.onLine) {
					await queue.flush();
					refreshMoney();
				}
			},
			retry: async (id) => {
				await queue.retry(id);
				refreshMoney();
			},
			discard: (id) => queue.discard(id),
		}),
		[all, online, queue, userId],
	);

	return <Context.Provider value={value}>{children}</Context.Provider>;
}
