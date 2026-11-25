import type { Database } from "@arvo/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { fromDbDate, toDbDate, todayInSaoPaulo } from "../lib/calendar";
import { rule } from "../lib/errors";
import { bestPurchaseDay, openInvoice } from "../rules/invoice";

const name = z.string().trim().min(1, "Dê um nome").max(40);
const last4 = z
	.string()
	.regex(/^\d{4}$/, "Use os 4 últimos dígitos")
	.nullable()
	.optional();
const day = z.number().int().min(1).max(31);

const cardInput = z.object({
	name,
	type: z.enum(["CREDIT", "DEBIT"]),
	last4,
	// Só no crédito: dia de fechamento e de vencimento da fatura.
	closingDay: day.nullable().optional(),
	dueDay: day.nullable().optional(),
});

// Crédito precisa dos dois dias da fatura; débito não tem nenhum.
function normalize(input: z.infer<typeof cardInput>) {
	return rule(() => {
		if (input.type === "CREDIT") {
			if (input.closingDay == null || input.dueDay == null) {
				throw new Error(
					"Cartão de crédito precisa de dia de fechamento e de vencimento",
				);
			}
			return {
				name: input.name,
				type: input.type,
				last4: input.last4 ?? null,
				closingDay: input.closingDay,
				dueDay: input.dueDay,
			};
		}
		return {
			name: input.name,
			type: input.type,
			last4: input.last4 ?? null,
			closingDay: null,
			dueDay: null,
		};
	});
}

// Fatura aberta de cada cartão de crédito do usuário, pelas compras já feitas e ainda não vencidas.
async function openInvoices(
	db: Database,
	userId: string,
	cardIds: string[],
	today: string,
) {
	const rows = await db.transaction.findMany({
		where: {
			userId,
			kind: "EXPENSE",
			cardId: { in: cardIds },
			dueDate: { gt: toDbDate(today) },
		},
		select: { cardId: true, amountCents: true, date: true, dueDate: true },
	});
	const byCard = new Map<string, ReturnType<typeof openInvoice>>();
	for (const cardId of cardIds) {
		byCard.set(
			cardId,
			openInvoice(
				rows
					.filter((row) => row.cardId === cardId && row.dueDate)
					.map((row) => ({
						amountCents: row.amountCents,
						date: fromDbDate(row.date),
						dueDate: fromDbDate(row.dueDate as Date),
					})),
				today,
			),
		);
	}
	return byCard;
}

export const cardRouter = router({
	// Cartões com a fatura aberta (só crédito) e o melhor dia de compra.
	list: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;
		const today = todayInSaoPaulo();
		const cards = await ctx.db.card.findMany({
			where: { userId },
			orderBy: { createdAt: "asc" },
			select: {
				id: true,
				name: true,
				type: true,
				last4: true,
				closingDay: true,
				dueDay: true,
			},
		});
		const invoices = await openInvoices(
			ctx.db,
			userId,
			cards.map((card) => card.id),
			today,
		);
		return cards.map((card) => ({
			...card,
			openInvoice: invoices.get(card.id) ?? null,
			bestDay:
				card.closingDay === null
					? null
					: Number(bestPurchaseDay(card.closingDay, today).slice(8, 10)),
		}));
	}),

	create: protectedProcedure.input(cardInput).mutation(({ ctx, input }) =>
		ctx.db.card.create({
			data: { ...normalize(input), userId: ctx.session.user.id },
		}),
	),

	update: protectedProcedure
		.input(cardInput.extend({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const { id, ...fields } = input;
			const owned = await ctx.db.card.findFirst({
				where: { id, userId: ctx.session.user.id },
				select: { id: true },
			});
			if (!owned) throw new TRPCError({ code: "NOT_FOUND" });
			return ctx.db.card.update({ where: { id }, data: normalize(fields) });
		}),

	// Apagar o cartão mantém as compras: o vencimento da fatura já está gravado nelas. Com fatura
	// aberta não dá: só depois do vencimento.
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const owned = await ctx.db.card.findFirst({
				where: { id: input.id, userId },
				select: { id: true },
			});
			if (!owned) throw new TRPCError({ code: "NOT_FOUND" });
			const invoice = (
				await openInvoices(ctx.db, userId, [owned.id], todayInSaoPaulo())
			).get(owned.id);
			if (invoice) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Esse cartão tem uma fatura aberta. Depois do vencimento você pode apagar.",
				});
			}
			await ctx.db.card.delete({ where: { id: input.id } });
			return { ok: true };
		}),
});
