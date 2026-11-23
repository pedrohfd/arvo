import { TRPCError } from "@trpc/server";

// As regras de dinheiro lançam `Error` com mensagem em português; para o app isso é um pedido
// inválido (400), não um erro do servidor.
export function rule<T>(fn: () => T): T {
	try {
		return fn();
	} catch (error) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: error instanceof Error ? error.message : "Pedido inválido",
		});
	}
}
