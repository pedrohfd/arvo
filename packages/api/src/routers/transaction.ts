import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { fromDbDate, toDbDate, todayInSaoPaulo } from "../lib/calendar";
import { monthRange, planTransaction } from "../lib/plan-transaction";
import { splitBill } from "../rules/split";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

const createInput = z.object({
	// Gerado no aparelho: reenviar o mesmo registro não duplica.
	clientId: z.string().min(1).max(64).optional(),
	kind: z.enum(["EXPENSE", "INCOME"]),
	amountCents: z.number().int(),
	title: z.string().trim().max(80).optional(),
	categoryId: z.string(),
	date,
	paymentMethod: z.enum(["CARD", "PIX", "CASH", "DEPOSIT"]),
	cardId: z.string().optional(),
	repeat: z
		.object({
			intervalMonths: z.number().int().min(1),
			count: z.number().int().min(1).nullable(),
		})
		.optional(),
	installments: z.object({ count: z.number().int().min(2) }).optional(),
	// Dividir a conta (só saída, registro único): as outras pessoas; você fica com a sobra.
	splitWithPersonIds: z.array(z.string()).max(20).optional(),
});

function badRequest(error: unknown): never {
	throw new TRPCError({
		code: "BAD_REQUEST",
		message: error instanceof Error ? error.message : "Registro inválido",
	});
}

export const transactionRouter = router({
	// Transações do mês "AAAA-MM", da mais recente para a mais antiga.
	list: protectedProcedure
		.input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
		.query(async ({ ctx, input }) => {
			let range: ReturnType<typeof monthRange>;
			try {
				range = monthRange(input.month);
			} catch (error) {
				return badRequest(error);
			}
			const rows = await ctx.db.transaction.findMany({
				where: {
					userId: ctx.session.user.id,
					date: { gte: toDbDate(range.from), lt: toDbDate(range.to) },
				},
				orderBy: [{ date: "desc" }, { createdAt: "desc" }],
				include: {
					category: { select: { id: true, name: true, icon: true } },
					series: { select: { kind: true, count: true } },
					splits: {
						select: {
							id: true,
							amountCents: true,
							paidAt: true,
							person: { select: { id: true, name: true } },
						},
					},
				},
			});
			return rows.map((row) => ({
				id: row.id,
				kind: row.kind,
				amountCents: row.amountCents,
				title: row.title,
				category: row.category,
				date: fromDbDate(row.date),
				dueDate: row.dueDate ? fromDbDate(row.dueDate) : null,
				paymentMethod: row.paymentMethod,
				cardId: row.cardId,
				seriesId: row.seriesId,
				seriesIndex: row.seriesIndex,
				seriesKind: row.series?.kind ?? null,
				seriesCount: row.series?.count ?? null,
				splits: row.splits.map((split) => ({
					id: split.id,
					person: split.person,
					amountCents: split.amountCents,
					paidAt: split.paidAt ? fromDbDate(split.paidAt) : null,
				})),
			}));
		}),

	create: protectedProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			if (input.clientId) {
				const existing = await ctx.db.transaction.findFirst({
					where: { userId, clientId: input.clientId },
					select: { id: true },
				});
				if (existing) return { ids: [existing.id], duplicate: true };
			}

			const category = await ctx.db.category.findFirst({
				where: { id: input.categoryId, userId, kind: input.kind },
				select: { id: true },
			});
			if (!category) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Escolha uma categoria",
				});
			}

			const card = input.cardId
				? await ctx.db.card.findFirst({
						where: { id: input.cardId, userId },
						select: { type: true, closingDay: true, dueDay: true },
					})
				: null;
			if (input.cardId && !card) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cartão não encontrado",
				});
			}

			let plan: ReturnType<typeof planTransaction>;
			try {
				plan = planTransaction(
					{
						kind: input.kind,
						amountCents: input.amountCents,
						date: input.date,
						paymentMethod: input.paymentMethod,
						card,
						repeat: input.repeat,
						installments: input.installments,
					},
					todayInSaoPaulo(),
				);
			} catch (error) {
				return badRequest(error);
			}

			// Divisão: só saída de registro único. Cada pessoa leva a mesma parte; a sua é a sobra.
			let splits: { personId: string; amountCents: number }[] = [];
			const personIds = [...new Set(input.splitWithPersonIds ?? [])];
			if (personIds.length > 0) {
				if (input.kind !== "EXPENSE" || plan.series) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Só dá para dividir uma saída que não se repete",
					});
				}
				const people = await ctx.db.person.count({
					where: { userId, id: { in: personIds } },
				});
				if (people !== personIds.length) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Pessoa não encontrada",
					});
				}
				const { othersCents } = splitBill(
					input.amountCents,
					personIds.length + 1,
				);
				splits = personIds.map((personId, i) => ({
					personId,
					amountCents: othersCents[i] as number,
				}));
			}

			const ids = await ctx.db.$transaction(async (tx) => {
				const series = plan.series
					? await tx.series.create({
							data: {
								...plan.series,
								startDate: toDbDate(plan.series.startDate),
								userId,
							},
						})
					: null;
				const created: string[] = [];
				for (const row of plan.rows) {
					const transaction = await tx.transaction.create({
						data: {
							userId,
							// O clientId identifica o registro; só a primeira linha da série o leva.
							clientId: row.index === 1 ? input.clientId : undefined,
							kind: input.kind,
							amountCents: row.amountCents,
							title: input.title || null,
							categoryId: input.categoryId,
							date: toDbDate(row.date),
							paymentMethod: input.paymentMethod,
							cardId: input.cardId ?? null,
							dueDate: row.dueDate ? toDbDate(row.dueDate) : null,
							seriesId: series?.id ?? null,
							seriesIndex: series ? row.index : null,
							splits: { create: splits },
						},
						select: { id: true },
					});
					created.push(transaction.id);
				}
				return created;
			});
			return { ids, duplicate: false };
		}),

	// Em série, "só esta" apaga uma ocorrência; "esta e as próximas", ela e as seguintes.
	// A cascata do banco leva junto as divisões e os reembolsos gerados.
	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				scope: z.enum(["ONLY_THIS", "THIS_AND_NEXT"]).default("ONLY_THIS"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const transaction = await ctx.db.transaction.findFirst({
				where: { id: input.id, userId: ctx.session.user.id },
				select: { id: true, seriesId: true, seriesIndex: true },
			});
			if (!transaction) throw new TRPCError({ code: "NOT_FOUND" });

			if (
				input.scope === "THIS_AND_NEXT" &&
				transaction.seriesId &&
				transaction.seriesIndex !== null
			) {
				const { count } = await ctx.db.transaction.deleteMany({
					where: {
						seriesId: transaction.seriesId,
						seriesIndex: { gte: transaction.seriesIndex },
					},
				});
				return { deleted: count };
			}
			await ctx.db.transaction.delete({ where: { id: transaction.id } });
			return { deleted: 1 };
		}),
});
