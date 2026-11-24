import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import {
	entryTime,
	fromDbDate,
	toDbDate,
	todayInSaoPaulo,
} from "../lib/calendar";
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

// Retrato do que um "apagar" levou, para o "Desfazer" do aviso (3.3 apagou) recriar igual.
const snapshotRow = z.object({
	id: z.string().min(1).max(64),
	clientId: z.string().min(1).max(64).nullable(),
	kind: z.enum(["EXPENSE", "INCOME"]),
	amountCents: z.number().int(),
	title: z.string().max(80).nullable(),
	categoryId: z.string(),
	date,
	paymentMethod: z.enum(["CARD", "PIX", "CASH", "DEPOSIT"]),
	cardId: z.string().nullable(),
	dueDate: date.nullable(),
	seriesId: z.string().nullable(),
	seriesIndex: z.number().int().min(1).nullable(),
	reimbursedSplitId: z.string().nullable(),
	createdAt: z.iso.datetime(),
	splits: z
		.array(
			z.object({
				id: z.string().min(1).max(64),
				personId: z.string(),
				amountCents: z.number().int(),
				paidAt: date.nullable(),
			}),
		)
		.max(20),
});
const snapshotInput = z.object({ rows: z.array(snapshotRow).min(1).max(400) });
export type DeletedSnapshot = z.infer<typeof snapshotInput>;

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
					card: { select: { name: true, type: true } },
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
				cardName: row.card?.name ?? null,
				cardType: row.card?.type ?? null,
				// Hora do registro, só quando foi feito no próprio dia da transação.
				time: entryTime(row.createdAt, fromDbDate(row.date)),
				// Para ordenar junto com os movimentos das metas na Início.
				createdAt: row.createdAt.toISOString(),
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

	// Tela 3.1: uma transação com a divisão, a série e os reembolsos. NOT_FOUND = apagada (talvez
	// em outro aparelho).
	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const row = await ctx.db.transaction.findFirst({
				where: { id: input.id, userId: ctx.session.user.id },
				include: {
					category: { select: { id: true, name: true, icon: true } },
					card: { select: { name: true, type: true } },
					series: {
						select: {
							kind: true,
							count: true,
							intervalMonths: true,
							anchorDay: true,
						},
					},
					splits: {
						orderBy: { person: { name: "asc" } },
						select: {
							id: true,
							amountCents: true,
							paidAt: true,
							person: { select: { id: true, name: true } },
							reimbursement: { select: { id: true } },
						},
					},
				},
			});
			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Essa transação foi apagada",
				});
			}

			// Série: a próxima ocorrência e a última gerada (o "até" de quem tem fim).
			let series = null;
			if (row.series && row.seriesId && row.seriesIndex !== null) {
				const [next, last] = await Promise.all([
					ctx.db.transaction.findFirst({
						where: {
							seriesId: row.seriesId,
							seriesIndex: { gt: row.seriesIndex },
						},
						orderBy: { seriesIndex: "asc" },
						select: { date: true },
					}),
					ctx.db.transaction.findFirst({
						where: { seriesId: row.seriesId },
						orderBy: { seriesIndex: "desc" },
						select: { date: true },
					}),
				]);
				series = {
					kind: row.series.kind,
					index: row.seriesIndex,
					count: row.series.count,
					intervalMonths: row.series.intervalMonths,
					anchorDay: row.series.anchorDay,
					nextDate: next ? fromDbDate(next.date) : null,
					lastDate: last ? fromDbDate(last.date) : null,
				};
			}

			return {
				today: todayInSaoPaulo(),
				id: row.id,
				kind: row.kind,
				amountCents: row.amountCents,
				title: row.title,
				category: row.category,
				date: fromDbDate(row.date),
				time: entryTime(row.createdAt, fromDbDate(row.date)),
				dueDate: row.dueDate ? fromDbDate(row.dueDate) : null,
				paymentMethod: row.paymentMethod,
				cardName: row.card?.name ?? null,
				cardType: row.card?.type ?? null,
				isReimbursement: row.reimbursedSplitId !== null,
				series,
				splits: row.splits.map((split) => ({
					id: split.id,
					person: split.person,
					amountCents: split.amountCents,
					paidAt: split.paidAt ? fromDbDate(split.paidAt) : null,
					reimbursed: split.reimbursement !== null,
				})),
			};
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
	// A cascata do banco leva junto as divisões e os reembolsos gerados. Devolve o retrato do que
	// saiu, para o "Desfazer".
	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				scope: z.enum(["ONLY_THIS", "THIS_AND_NEXT"]).default("ONLY_THIS"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const transaction = await ctx.db.transaction.findFirst({
				where: { id: input.id, userId },
				select: { id: true, seriesId: true, seriesIndex: true },
			});
			if (!transaction) throw new TRPCError({ code: "NOT_FOUND" });

			const ids =
				input.scope === "THIS_AND_NEXT" &&
				transaction.seriesId &&
				transaction.seriesIndex !== null
					? {
							seriesId: transaction.seriesId,
							seriesIndex: { gte: transaction.seriesIndex },
						}
					: { id: transaction.id };

			return ctx.db.$transaction(async (tx) => {
				const rows = await tx.transaction.findMany({
					where: { userId, ...ids },
					include: { splits: { include: { reimbursement: true } } },
				});
				// Os reembolsos somem pela cascata das divisões; entram no retrato também.
				const reimbursements = rows.flatMap((row) =>
					row.splits.flatMap((split) =>
						split.reimbursement ? [split.reimbursement] : [],
					),
				);
				const { count } = await tx.transaction.deleteMany({
					where: { userId, id: { in: rows.map((row) => row.id) } },
				});
				const toRow = (
					row: (typeof reimbursements)[number],
					splits: (typeof rows)[number]["splits"] = [],
				): DeletedSnapshot["rows"][number] => ({
					id: row.id,
					clientId: row.clientId,
					kind: row.kind,
					amountCents: row.amountCents,
					title: row.title,
					categoryId: row.categoryId,
					date: fromDbDate(row.date),
					paymentMethod: row.paymentMethod,
					cardId: row.cardId,
					dueDate: row.dueDate ? fromDbDate(row.dueDate) : null,
					seriesId: row.seriesId,
					seriesIndex: row.seriesIndex,
					reimbursedSplitId: row.reimbursedSplitId,
					createdAt: row.createdAt.toISOString(),
					splits: splits.map((split) => ({
						id: split.id,
						personId: split.personId,
						amountCents: split.amountCents,
						paidAt: split.paidAt ? fromDbDate(split.paidAt) : null,
					})),
				});
				const snapshot: DeletedSnapshot = {
					rows: [
						...rows.map((row) => toRow(row, row.splits)),
						...reimbursements.map((row) => toRow(row)),
					],
				};
				return { deleted: count, snapshot };
			});
		}),

	// "Desfazer" do aviso depois de apagar: recria o retrato com os mesmos ids. Tudo o que ele cita
	// (categoria, pessoa, série, divisão reembolsada) precisa ser seu; cartão apagado fica sem cartão.
	restore: protectedProcedure
		.input(snapshotInput)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const rows = input.rows;
			const unique = <T>(values: (T | null)[]) => [
				...new Set(values.filter((v): v is T => v !== null)),
			];
			const categoryIds = unique(rows.map((row) => row.categoryId));
			const seriesIds = unique(rows.map((row) => row.seriesId));
			const cardIds = unique(rows.map((row) => row.cardId));
			const personIds = unique(
				rows.flatMap((row) => row.splits.map((split) => split.personId)),
			);
			const splitIds = new Set(
				rows.flatMap((row) => row.splits.map((split) => split.id)),
			);
			const invalid = () =>
				new TRPCError({
					code: "BAD_REQUEST",
					message: "Não deu para desfazer",
				});

			// Reembolso não tem divisão; a divisão que ele paga vem no retrato ou já é sua, sem outro
			// reembolso (quem apagou só a entrada de reembolso).
			if (
				rows.some(
					(row) => row.reimbursedSplitId !== null && row.splits.length > 0,
				)
			) {
				throw invalid();
			}
			const outsideSplitIds = unique(
				rows.map((row) =>
					row.reimbursedSplitId && !splitIds.has(row.reimbursedSplitId)
						? row.reimbursedSplitId
						: null,
				),
			);
			const outsideSplits = await ctx.db.transactionSplit.count({
				where: {
					id: { in: outsideSplitIds },
					transaction: { userId },
					reimbursement: null,
				},
			});
			if (outsideSplits !== outsideSplitIds.length) throw invalid();

			const [categories, series, cards, people, taken] = await Promise.all([
				ctx.db.category.count({ where: { userId, id: { in: categoryIds } } }),
				ctx.db.series.count({ where: { userId, id: { in: seriesIds } } }),
				ctx.db.card.findMany({
					where: { userId, id: { in: cardIds } },
					select: { id: true },
				}),
				ctx.db.person.count({ where: { userId, id: { in: personIds } } }),
				ctx.db.transaction.count({
					where: { id: { in: rows.map((row) => row.id) } },
				}),
			]);
			if (
				categories !== categoryIds.length ||
				series !== seriesIds.length ||
				people !== personIds.length ||
				taken > 0
			) {
				throw invalid();
			}
			const cardsLeft = new Set(cards.map((card) => card.id));

			const ordered = [
				...rows.filter((row) => row.reimbursedSplitId === null),
				...rows.filter((row) => row.reimbursedSplitId !== null),
			];
			try {
				await ctx.db.$transaction(async (tx) => {
					for (const row of ordered) {
						await tx.transaction.create({
							data: {
								id: row.id,
								userId,
								clientId: row.clientId,
								kind: row.kind,
								amountCents: row.amountCents,
								title: row.title,
								categoryId: row.categoryId,
								date: toDbDate(row.date),
								paymentMethod: row.paymentMethod,
								cardId:
									row.cardId && cardsLeft.has(row.cardId) ? row.cardId : null,
								dueDate: row.dueDate ? toDbDate(row.dueDate) : null,
								seriesId: row.seriesId,
								seriesIndex: row.seriesIndex,
								reimbursedSplitId: row.reimbursedSplitId,
								createdAt: new Date(row.createdAt),
								splits: {
									create: row.splits.map((split) => ({
										id: split.id,
										personId: split.personId,
										amountCents: split.amountCents,
										paidAt: split.paidAt ? toDbDate(split.paidAt) : null,
									})),
								},
							},
						});
					}
				});
			} catch {
				// Id de divisão já usado, clientId repetido ou valor fora das restrições do banco.
				throw invalid();
			}
			return { restored: rows.length };
		}),
});
