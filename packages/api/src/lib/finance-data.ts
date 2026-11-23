import type { Database } from "@arvo/db";

import type { BalanceGoalMovement } from "../rules/balance";
import type { SummaryTransaction } from "../rules/summary";
import { fromDbDate } from "./calendar";

// Tudo o que as regras de saldo e Resumo precisam, no formato delas. O saldo nunca é guardado:
// é sempre calculado daqui.
export async function loadFinanceData(db: Database, userId: string) {
	const [rows, movements] = await Promise.all([
		db.transaction.findMany({
			where: { userId },
			select: {
				kind: true,
				amountCents: true,
				date: true,
				dueDate: true,
				categoryId: true,
				cardId: true,
			},
		}),
		db.goalMovement.findMany({
			where: { goal: { userId } },
			select: { type: true, amountCents: true, date: true },
		}),
	]);

	const transactions: SummaryTransaction[] = rows.map((row) => ({
		kind: row.kind,
		amountCents: row.amountCents,
		date: fromDbDate(row.date),
		dueDate: row.dueDate ? fromDbDate(row.dueDate) : null,
		categoryId: row.categoryId,
		cardId: row.cardId,
	}));
	const goalMovements: BalanceGoalMovement[] = movements.map((movement) => ({
		type: movement.type,
		amountCents: movement.amountCents,
		date: fromDbDate(movement.date),
	}));
	return { transactions, goalMovements };
}
