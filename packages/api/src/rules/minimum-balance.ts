import { assertCents } from "./money";

// Aviso de saldo mínimo ao registrar um gasto (âmbar, nunca bloqueia): avisa quando o gasto
// deixaria o saldo abaixo do mínimo. Crédito não avisa (não sai do saldo agora), entrada nunca
// avisa e, sem mínimo configurado (0), não há aviso.

export function minimumBalanceWarning(input: {
	balanceCents: number;
	/** 0 ou ausente = sem saldo mínimo. */
	minimumCents?: number | null;
	amountCents: number;
	kind: "EXPENSE" | "INCOME";
	isCredit: boolean;
}) {
	assertCents(input.balanceCents, "saldo");
	assertCents(input.amountCents, "valor");
	const minimum = input.minimumCents ?? 0;
	const balanceAfterCents = input.balanceCents - input.amountCents;

	const applies = input.kind === "EXPENSE" && !input.isCredit && minimum > 0;
	return {
		warn: applies && balanceAfterCents < minimum,
		balanceAfterCents,
	};
}
