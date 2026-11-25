import type { Database } from "@arvo/db";
import { REIMBURSEMENT_KEY } from "@arvo/db/default-categories";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { fromDbDate, toDbDate, todayInSaoPaulo } from "../lib/calendar";
import { rule } from "../lib/errors";
import { groupPendingSplits } from "../lib/pending-splits";
import {
	markSplitPaid,
	receivable,
	unmarkSplitPaid,
} from "../rules/settlement";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

async function findSplit(db: Database, userId: string, id: string) {
	const split = await db.transactionSplit.findFirst({
		where: { id, transaction: { userId } },
		include: {
			person: { select: { name: true } },
			reimbursement: { select: { id: true } },
		},
	});
	if (!split) throw new TRPCError({ code: "NOT_FOUND" });
	return split;
}

// Dividir a conta: marcar que alguém pagou a sua parte e o "A receber".
export const splitRouter = router({
	// "A receber": partes não pagas, no total e por pessoa.
	receivable: protectedProcedure.query(async ({ ctx }) => {
		const pending = await ctx.db.transactionSplit.findMany({
			where: { paidAt: null, transaction: { userId: ctx.session.user.id } },
			select: { personId: true, amountCents: true },
		});
		return receivable(pending.map((split) => ({ ...split, paidAt: null })));
	}),

	// Tela 3.4: as partes não pagas, por pessoa, com a conta de onde vieram.
	pending: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db.transactionSplit.findMany({
			where: { paidAt: null, transaction: { userId: ctx.session.user.id } },
			select: {
				id: true,
				amountCents: true,
				person: { select: { id: true, name: true } },
				transaction: {
					select: {
						id: true,
						title: true,
						date: true,
						category: { select: { name: true, icon: true } },
					},
				},
			},
		});
		return groupPendingSplits(
			rows.map((row) => ({
				splitId: row.id,
				transactionId: row.transaction.id,
				personId: row.person.id,
				personName: row.person.name,
				amountCents: row.amountCents,
				title: row.transaction.title,
				categoryName: row.transaction.category.name,
				categoryIcon: row.transaction.category.icon,
				date: fromDbDate(row.transaction.date),
			})),
		);
	}),

	// Dois toques: pessoa → confirmação. Guarda a data e, por padrão, cria a entrada de Reembolso
	// (desligável, para quem pagou em dinheiro).
	markPaid: protectedProcedure
		.input(
			z.object({
				splitId: z.string(),
				paidAt: date.optional(),
				createReimbursement: z.boolean().default(true),
				paymentMethod: z.enum(["PIX", "CASH", "DEPOSIT"]).default("PIX"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const split = await findSplit(ctx.db, userId, input.splitId);
			const paidAt = input.paidAt ?? todayInSaoPaulo();
			const { reimbursement } = rule(() =>
				markSplitPaid(
					{
						personId: split.personId,
						amountCents: split.amountCents,
						paidAt: split.paidAt ? fromDbDate(split.paidAt) : null,
					},
					{ paidAt, createReimbursement: input.createReimbursement },
				),
			);

			let categoryId: string | null = null;
			if (reimbursement) {
				const category = await ctx.db.category.findFirst({
					where: { userId, systemKey: REIMBURSEMENT_KEY },
					select: { id: true },
				});
				if (!category) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Categoria Reembolso não encontrada",
					});
				}
				categoryId = category.id;
			}

			await ctx.db.$transaction(async (tx) => {
				await tx.transactionSplit.update({
					where: { id: split.id },
					data: { paidAt: toDbDate(paidAt) },
				});
				if (reimbursement && categoryId) {
					await tx.transaction.create({
						data: {
							userId,
							kind: "INCOME",
							amountCents: reimbursement.amountCents,
							title: split.person.name,
							categoryId,
							date: toDbDate(reimbursement.date),
							paymentMethod: input.paymentMethod,
							reimbursedSplitId: split.id,
						},
					});
				}
			});
			return { reimbursed: reimbursement !== null };
		}),

	// Desfaz o pagamento e apaga a entrada de Reembolso gerada, se houve.
	unmarkPaid: protectedProcedure
		.input(z.object({ splitId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const split = await findSplit(ctx.db, ctx.session.user.id, input.splitId);
			const { removeReimbursementId } = rule(() =>
				unmarkSplitPaid({
					personId: split.personId,
					amountCents: split.amountCents,
					paidAt: split.paidAt ? fromDbDate(split.paidAt) : null,
					reimbursementId: split.reimbursement?.id ?? null,
				}),
			);
			await ctx.db.$transaction([
				ctx.db.transactionSplit.update({
					where: { id: split.id },
					data: { paidAt: null },
				}),
				...(removeReimbursementId
					? [
							ctx.db.transaction.delete({
								where: { id: removeReimbursementId },
							}),
						]
					: []),
			]);
			return { ok: true };
		}),
});
