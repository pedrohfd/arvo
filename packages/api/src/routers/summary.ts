import { z } from "zod";

import { protectedProcedure, router } from "../index";
import {
	fromDbDate,
	referenceForMonth,
	todayInSaoPaulo,
} from "../lib/calendar";
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
			// O seletor de mês (1.10) começa no mês da primeira transação.
			const first = await ctx.db.transaction.aggregate({
				where: { userId },
				_min: { date: true },
			});
			return {
				today,
				month: selected,
				firstMonth: first._min.date
					? monthKey(fromDbDate(first._min.date))
					: null,
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

	// Horizonte (4.2): o saldo de hoje, o saldo previsto no fim de cada mês (só com o que está
	// agendado) e "O que vem", a lista do agendado até o fim do último mês.
	horizon: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;
		const today = todayInSaoPaulo();
		const [rows, movements, settings, categories, cards] = await Promise.all([
			ctx.db.transaction.findMany({
				where: { userId },
				select: {
					id: true,
					kind: true,
					amountCents: true,
					date: true,
					dueDate: true,
					categoryId: true,
					cardId: true,
					title: true,
					paymentMethod: true,
				},
			}),
			ctx.db.goalMovement.findMany({
				where: { goal: { userId } },
				select: { type: true, amountCents: true, date: true },
			}),
			ctx.db.userSettings.findUnique({ where: { userId } }),
			ctx.db.category.findMany({
				where: { userId },
				select: { id: true, name: true, icon: true },
			}),
			ctx.db.card.findMany({
				where: { userId },
				select: { id: true, name: true },
			}),
		]);
		const transactions = rows.map((row) => ({
			id: row.id,
			title: row.title,
			paymentMethod: row.paymentMethod,
			kind: row.kind,
			amountCents: row.amountCents,
			date: fromDbDate(row.date),
			dueDate: row.dueDate ? fromDbDate(row.dueDate) : null,
			categoryId: row.categoryId,
			cardId: row.cardId,
		}));
		const goalMovements = movements.map((movement) => ({
			type: movement.type,
			amountCents: movement.amountCents,
			date: fromDbDate(movement.date),
		}));
		const minimumCents = settings?.minimumBalanceCents ?? 0;
		const monthsAhead = 5;
		const points = rule(() =>
			forecastHorizon({
				transactions,
				goalMovements,
				reference: today,
				minimumCents,
				monthsAhead,
			}),
		);
		const categoryById = new Map(categories.map((row) => [row.id, row]));
		const cardById = new Map(cards.map((row) => [row.id, row]));
		const last = points.at(-1);
		const upcoming = rule(() =>
			upcomingItems(transactions, today, last?.endDate),
		).map((item) =>
			item.type === "INVOICE"
				? {
						type: "INVOICE" as const,
						date: item.date,
						amountCents: item.amountCents,
						cardName: (item.cardId && cardById.get(item.cardId)?.name) || null,
					}
				: {
						type: "TRANSACTION" as const,
						date: item.date,
						amountCents: item.transaction.amountCents,
						kind: item.transaction.kind,
						title: item.transaction.title,
						paymentMethod: item.transaction.paymentMethod,
						cardName:
							(item.transaction.cardId &&
								cardById.get(item.transaction.cardId)?.name) ||
							null,
						category: categoryById.get(item.transaction.categoryId) ?? null,
					},
		);
		return {
			today,
			balanceCents: computeBalance({ transactions, goalMovements }, today)
				.balanceCents,
			minimumCents,
			points,
			upcoming,
		};
	}),
});
