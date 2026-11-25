import type { DeletedSnapshot } from "@arvo/api/routers/transaction";
import { useMutation } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import { useOutbox } from "@/components/offline/outbox-provider";
import { formatMoney } from "@/lib/format";
import { refreshMoney } from "@/lib/refresh-money";
import type { Flow } from "@/lib/register";
import { deletedToast } from "@/lib/transaction-detail";
import { queryClient, trpc } from "@/utils/trpc";
import { type Registered, RegisterSheet } from "./register-sheet";
import { UndoToast } from "./undo-toast";

type RegisterContext = {
	/** Abre o Registrar (2.1). `flow` escolhe Saída ou Entrada; o padrão é Saída. */
	open: (flow?: Flow) => void;
	/** Mostra o aviso da 3.3 "apagou", com o "Desfazer" que recria o que saiu. */
	deleted: (deleted: Deleted) => void;
};

export type Deleted = {
	kind: Flow;
	amountCents: number;
	deleted: number;
	snapshot: DeletedSnapshot;
};

// Um aviso por vez: o de registrar (1.7) ou o de apagar (3.3).
type Toast =
	| { type: "registered"; key: string; registered: Registered }
	| { type: "deleted"; key: string; deleted: Deleted };

const Context = createContext<RegisterContext | null>(null);

export function useRegister() {
	const context = useContext(Context);
	if (!context) throw new Error("useRegister fora do RegisterProvider");
	return context;
}

export { refreshMoney };

export function RegisterProvider({ children }: { children: ReactNode }) {
	// `session` muda a cada abertura: a folha começa do zero (valor, escolhas e clientId novos).
	const [session, setSession] = useState<{ id: number; flow: Flow } | null>(
		null,
	);
	const [notice, setToast] = useState<Toast | null>(null);
	const outbox = useOutbox();

	const open = useCallback((flow: Flow = "EXPENSE") => {
		setSession((current) => ({ id: (current?.id ?? 0) + 1, flow }));
	}, []);
	const close = useCallback(() => setSession(null), []);
	const deleted = useCallback((result: Deleted) => {
		setToast({
			type: "deleted",
			key: result.snapshot.rows[0]?.id ?? "deleted",
			deleted: result,
		});
	}, []);
	const dismiss = useCallback(() => setToast(null), []);

	const restore = useMutation(
		trpc.transaction.restore.mutationOptions({
			onSuccess: refreshMoney,
			onError: (error) => toast.error(error.message),
		}),
	);
	const undo = useMutation(
		trpc.transaction.delete.mutationOptions({
			onSuccess: refreshMoney,
			onError: (error) => toast.error(error.message),
		}),
	);

	// Tecla N abre o Registrar no computador, fora de campos de texto.
	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.key.toLowerCase() !== "n") return;
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			const target = event.target as HTMLElement | null;
			if (target?.closest("input, textarea, select, [contenteditable]")) return;
			if (session) return;
			event.preventDefault();
			open();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, session]);

	const value = useMemo(() => ({ open, deleted }), [open, deleted]);

	return (
		<Context.Provider value={value}>
			{children}
			{session ? (
				<RegisterSheet
					key={session.id}
					initialFlow={session.flow}
					onClose={close}
					onRegistered={(result) => {
						refreshMoney();
						setToast({
							type: "registered",
							key: result.ids[0] ?? result.queuedId ?? "registered",
							registered: result,
						});
						close();
					}}
				/>
			) : null}
			{notice?.type === "registered" ? (
				<UndoToast
					key={notice.key}
					title={`${notice.registered.flow === "EXPENSE" ? "Saída" : "Entrada"} ${notice.registered.queuedId ? "na fila" : "registrada"}`}
					detail={formatMoney(notice.registered.amountCents)}
					seconds={6}
					onUndo={() => {
						if (notice.registered.queuedId) {
							// Ainda não saiu do aparelho: basta tirar da fila.
							outbox.discard(notice.registered.queuedId);
						} else {
							// Em série, "esta e as próximas" a partir da primeira apaga tudo.
							undo.mutate({
								id: notice.registered.ids[0] as string,
								scope: "THIS_AND_NEXT",
							});
						}
						setToast(null);
					}}
					onExpire={dismiss}
				/>
			) : notice?.type === "deleted" ? (
				<UndoToast
					key={notice.key}
					{...deletedToast(
						notice.deleted.kind,
						notice.deleted.deleted,
						notice.deleted.amountCents,
					)}
					seconds={10}
					onUndo={() => {
						restore.mutate(notice.deleted.snapshot);
						setToast(null);
					}}
					onExpire={dismiss}
				/>
			) : null}
		</Context.Provider>
	);
}
