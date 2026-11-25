import { type GoalMovementType, goalMovementSign } from "./balance";
import { type CalendarDate, compareDates, monthsBetween } from "./dates";
import { assertCents, assertPositiveAmount } from "./money";

// Metas. Guardar tira o dinheiro do saldo (fica reservado na meta) e resgatar devolve.
// Dois tipos: "para gastar" (ao atingir, "concluir" devolve o valor ao saldo) e "para manter"
// (reserva de emergência: não tem concluir, o valor só sai por resgate).

export type GoalKind = "SPEND" | "KEEP";

/** Valor guardado numa meta: guardar soma; resgatar e concluir subtraem. */
export function savedCents(
	movements: readonly { type: GoalMovementType; amountCents: number }[],
) {
	return movements.reduce((sum, movement) => {
		assertCents(movement.amountCents, "valor do movimento da meta");
		return sum + goalMovementSign(movement.type) * movement.amountCents;
	}, 0);
}

/** Só dá para guardar até o valor disponível (saldo atual). */
export function assertCanDeposit(availableCents: number, amountCents: number) {
	assertPositiveAmount(amountCents, "valor a guardar");
	assertCents(availableCents, "valor disponível");
	if (amountCents > availableCents) {
		throw new Error("Só dá para guardar o que está disponível no saldo");
	}
}

/** Só dá para resgatar até o valor guardado naquela meta. */
export function assertCanWithdraw(
	savedInGoalCents: number,
	amountCents: number,
) {
	assertPositiveAmount(amountCents, "valor a resgatar");
	assertCents(savedInGoalCents, "valor guardado");
	if (amountCents > savedInGoalCents) {
		throw new Error("Só dá para resgatar o que está guardado nessa meta");
	}
}

/** A meta atinge o alvo quando o guardado é maior ou igual ao valor dela. */
export function isGoalReached(savedInGoalCents: number, targetCents: number) {
	assertPositiveAmount(targetCents, "valor da meta");
	return savedInGoalCents >= targetCents;
}

// Concluir uma meta "para gastar" atingida: devolve ao saldo o que estava guardado. Devolve o
// movimento a gravar. "Para manter" não tem concluir.
export function completeGoal(
	goal: { kind: GoalKind; savedCents: number; targetCents: number },
	date: CalendarDate,
) {
	if (goal.kind === "KEEP") {
		throw new Error(
			'Meta "para manter" não tem concluir: o valor sai por resgate',
		);
	}
	if (!isGoalReached(goal.savedCents, goal.targetCents)) {
		throw new Error("A meta ainda não foi atingida");
	}
	return {
		type: "COMPLETE" as const,
		amountCents: goal.savedCents,
		date,
	};
}

// Dica calma de data limite: quanto guardar por mês para chegar lá. Meses restantes contam
// meses de calendário até o mês da data limite (no mínimo 1), e o valor mensal arredonda para
// cima em centavos. Sem dica quando não há data limite, ela já passou ou a meta já foi atingida.
export function monthlyHint(input: {
	targetCents: number;
	savedCents: number;
	deadline: CalendarDate | null;
	reference: CalendarDate;
}) {
	if (input.deadline === null) return null;
	if (compareDates(input.deadline, input.reference) < 0) return null;
	if (isGoalReached(input.savedCents, input.targetCents)) return null;

	const months = Math.max(1, monthsBetween(input.reference, input.deadline));
	const remaining = input.targetCents - input.savedCents;
	return {
		monthlyCents: Math.ceil(remaining / months),
		months,
		deadline: input.deadline,
	};
}
