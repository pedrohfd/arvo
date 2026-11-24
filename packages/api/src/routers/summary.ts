import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { referenceForMonth, todayInSaoPaulo } from "../lib/calendar";
import { rule } from "../lib/errors";
import { loadFinanceData } from "../lib/finance-data";
import { renewOpenSeries } from "../lib/renew-series";
import { computeBalance, creditToPaySummary } from "../rules/balance";
import { addMonths, lastDayOfMonth, monthKey } from "../rules/dates";
import { receivable } from "../rules/settlement";
import {
	forecastHorizon,
	isFutureMonth,
	monthTotals,
	spendingByCategory,
	upcomingItems,
} from "../rules/summary";

const month = z.string().regex(/^\d{4}-\d{2}$/);

export const summaryRouter = router({
	// Início: saldo, entrou/saiu, "A receber" e "No crédito, a pagar". Em mês passado, o saldo é o
	// do fim daquele mês.
	home: protectedProcedure
		.input(z.object({ month: month.optional() }).default({}))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const today = todayInSaoPaulo();
			const selected = input.month ?? monthKey(today);
			const reference = rule(() => referenceForMonth(selected, today));
			await renewOpenSeries(ctx.db, userId, today);
			const { transactions, goalMovements } = await loadFinanceData(
				ctx.db,
				userId,
			);
			const pending = await ctx.db.transactionSplit.findMany({
				where: { paidAt: null, transaction: { userId } },
				select: { personId: true, amountCents: true, paidAt: true },
			});
			return {
				today,
				month: selected,
				balance: computeBalance({ transactions, goalMovements }, reference),
				totals: rule(() => monthTotals(transactions, goalMovements, selected)),
				credit: creditToPaySummary(transactions, reference),
				receivable: receivable(
					pending.map((split) => ({ ...split, paidAt: null })),
				),
			};
		}),

	// Resumo do mês: sobrou/faltou, "Para onde foi", comparação com o mês anterior e "O que vem".
	month: protectedProcedure
		.input(z.object({ month }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const today = todayInSaoPaulo();
			const { transactions, goalMovements } = await loadFinanceData(
				ctx.db,
				userId,
			);
			const previous = monthKey(addMonths(`${input.month}-01`, -1));
			const result = rule(() => ({
				isFuture: isFutureMonth(input.month, today),
				totals: monthTotals(transactions, goalMovements, input.month),
				previousTotals: monthTotals(transactions, goalMovements, previous),
				spending: spendingByCategory(transactions, input.month, 5),
				upcoming: upcomingItems(
					transactions,
					today,
					lastDayOfMonth(`${input.month}-01`),
				),
			}));

			const categories = await ctx.db.category.findMany({
				where: { userId },
				select: { id: true, name: true, icon: true },
			});
			const byId = new Map(
				categories.map((category) => [category.id, category]),
			);
			return {
				month: input.month,
				isFuture: result.isFuture,
				totals: result.totals,
				previousTotals: result.previousTotals,
				spending: {
					totalCents: result.spending.totalCents,
					others: result.spending.others,
					categories: result.spending.categories.map((row) => ({
						...row,
						category: byId.get(row.categoryId) ?? null,
					})),
				},
				upcoming: result.upcoming.map((item) =>
					item.type === "INVOICE"
						? item
						: {
								type: item.type,
								date: item.date,
								kind: item.transaction.kind,
								amountCents: item.transaction.amountCents,
								category: byId.get(item.transaction.categoryId) ?? null,
							},
				),
			};
		}),

	// Horizonte: saldo previsto no fim de cada mês, só com o que está agendado.
	horizon: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;
		const [{ transactions, goalMovements }, settings] = await Promise.all([
			loadFinanceData(ctx.db, userId),
			ctx.db.userSettings.findUnique({ where: { userId } }),
		]);
		return forecastHorizon({
			transactions,
			goalMovements,
			reference: todayInSaoPaulo(),
			minimumCents: settings?.minimumBalanceCents ?? 0,
		});
	}),
});
