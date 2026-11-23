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

import type { Flow } from "@/lib/register";
import { queryClient, trpc } from "@/utils/trpc";
import { type Registered, RegisterSheet } from "./register-sheet";
import { UndoToast } from "./undo-toast";

type RegisterContext = {
	/** Abre o Registrar (2.1). `flow` escolhe Saída ou Entrada; o padrão é Saída. */
	open: (flow?: Flow) => void;
};

const Context = createContext<RegisterContext | null>(null);

export function useRegister() {
	const context = useContext(Context);
	if (!context) throw new Error("useRegister fora do RegisterProvider");
	return context;
}

// Depois de registrar ou desfazer, tudo o que depende das transações precisa recarregar.
function refreshMoney() {
	queryClient.invalidateQueries(trpc.summary.pathFilter());
	queryClient.invalidateQueries(trpc.transaction.pathFilter());
}

export function RegisterProvider({ children }: { children: ReactNode }) {
	// `session` muda a cada abertura: a folha começa do zero (valor, escolhas e clientId novos).
	const [session, setSession] = useState<{ id: number; flow: Flow } | null>(
		null,
	);
	const [registered, setRegistered] = useState<Registered | null>(null);

	const open = useCallback((flow: Flow = "EXPENSE") => {
		setSession((current) => ({ id: (current?.id ?? 0) + 1, flow }));
	}, []);
	const close = useCallback(() => setSession(null), []);

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

	const value = useMemo(() => ({ open }), [open]);

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
						setRegistered(result);
						close();
					}}
				/>
			) : null}
			{registered ? (
				<UndoToast
					key={registered.ids[0]}
					registered={registered}
					onUndo={() => {
						// Em série, "esta e as próximas" a partir da primeira apaga tudo.
						undo.mutate({
							id: registered.ids[0] as string,
							scope: "THIS_AND_NEXT",
						});
						setRegistered(null);
					}}
					onExpire={() => setRegistered(null)}
				/>
			) : null}
		</Context.Provider>
	);
}
