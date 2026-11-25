import { type CalendarDate, parseDate } from "./dates";
import { assertPositiveAmount } from "./money";

// Reembolso ao marcar que alguém pagou a sua parte de uma saída dividida.
//
// Marcar como pago cria uma entrada de Reembolso com o valor da parte e a data do pagamento (o saldo
// continua batendo com o banco); a pessoa pode desligar isso para quem pagou em dinheiro.
// Desmarcar remove a entrada gerada; apagar a saída apaga as entradas que ela gerou. Só as partes
// das OUTRAS pessoas existem aqui: a sua nunca entra em "A receber".

export type SplitState = {
	personId: string;
	amountCents: number;
	/** Dia em que a pessoa pagou; nulo = ainda deve. */
	paidAt: CalendarDate | null;
	/** Entrada de reembolso gerada ao marcar como pago, se houve. */
	reimbursementId?: string | null;
};

export type ReimbursementDraft = {
	amountCents: number;
	date: CalendarDate;
};

export function markSplitPaid<T extends SplitState>(
	split: T,
	options: { paidAt: CalendarDate; createReimbursement: boolean },
): { split: T; reimbursement: ReimbursementDraft | null } {
	parseDate(options.paidAt);
	assertPositiveAmount(split.amountCents, "parte da divisão");
	if (split.paidAt !== null) {
		throw new Error("Essa parte já está marcada como paga");
	}
	return {
		split: { ...split, paidAt: options.paidAt },
		reimbursement: options.createReimbursement
			? { amountCents: split.amountCents, date: options.paidAt }
			: null,
	};
}

// Desfaz o pagamento. `removeReimbursementId` é a entrada gerada que precisa ser apagada
// (nulo se foi pago em dinheiro, sem entrada).
export function unmarkSplitPaid<T extends SplitState>(
	split: T,
): { split: T; removeReimbursementId: string | null } {
	if (split.paidAt === null) {
		throw new Error("Essa parte não está marcada como paga");
	}
	return {
		split: { ...split, paidAt: null, reimbursementId: null },
		removeReimbursementId: split.reimbursementId ?? null,
	};
}

// Entradas de reembolso que somem junto com a saída dividida apagada.
export function reimbursementIdsToDelete(splits: readonly SplitState[]) {
	return splits.flatMap((split) =>
		split.reimbursementId ? [split.reimbursementId] : [],
	);
}

// "A receber": só as partes ainda não pagas, no total e por pessoa (na ordem em que aparecem).
export function receivable(splits: readonly SplitState[]) {
	const byPerson = new Map<string, number>();
	let totalCents = 0;
	for (const split of splits) {
		if (split.paidAt !== null) continue;
		totalCents += split.amountCents;
		byPerson.set(
			split.personId,
			(byPerson.get(split.personId) ?? 0) + split.amountCents,
		);
	}
	return {
		totalCents,
		byPerson: [...byPerson.entries()].map(([personId, amountCents]) => ({
			personId,
			totalCents: amountCents,
		})),
	};
}

// "Tudo acertado": há divisão e todas as partes foram pagas.
export function isSettled(splits: readonly SplitState[]) {
	return splits.length > 0 && splits.every((split) => split.paidAt !== null);
}
