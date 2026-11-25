import { useSyncExternalStore } from "react";

// Os registros "de agora": a linha fica destacada e diz "agora" por alguns segundos depois de
// registrar (Figma 1.7, "acabou de registrar"). Guardado fora do React porque quem registra (a
// folha) e quem mostra (a lista) não se enxergam.

/** O destaque da linha dura 0,6 s de espera + 2,4 s de animação (components.css). */
export const RECENT_MS = 3500;

export function createRecentStore(ttlMs: number) {
	let ids: ReadonlySet<string> = new Set();
	const listeners = new Set<() => void>();
	const emit = () => {
		for (const listener of listeners) listener();
	};

	return {
		mark(newIds: readonly string[]) {
			if (newIds.length === 0) return;
			ids = new Set([...ids, ...newIds]);
			emit();
			setTimeout(() => {
				const next = new Set(ids);
				for (const id of newIds) next.delete(id);
				ids = next;
				emit();
			}, ttlMs);
		},
		get: () => ids,
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

const store = createRecentStore(RECENT_MS);

export const markRecent = store.mark;

export function useRecent() {
	return useSyncExternalStore(store.subscribe, store.get, store.get);
}
