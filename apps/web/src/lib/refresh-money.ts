import { queryClient, trpc } from "@/utils/trpc";

// Depois de registrar, apagar, desfazer ou de a fila offline enviar, tudo o que depende das
// transações precisa recarregar.
export function refreshMoney() {
	queryClient.invalidateQueries(trpc.summary.pathFilter());
	queryClient.invalidateQueries(trpc.transaction.pathFilter());
	queryClient.invalidateQueries(trpc.split.pathFilter());
	queryClient.invalidateQueries(trpc.person.pathFilter());
}
