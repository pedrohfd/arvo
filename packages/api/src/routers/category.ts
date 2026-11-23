import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const name = z.string().trim().min(1, "Dê um nome").max(40);
const icon = z.string().trim().min(1).max(40);
const flow = z.enum(["EXPENSE", "INCOME"]);

function isUniqueViolation(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
}

const duplicate = () =>
	new TRPCError({
		code: "CONFLICT",
		message: "Já existe uma categoria com esse nome",
	});

export const categoryRouter = router({
	list: protectedProcedure.query(({ ctx }) =>
		ctx.db.category.findMany({
			where: { userId: ctx.session.user.id },
			orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
			select: { id: true, name: true, icon: true, kind: true, systemKey: true },
		}),
	),

	create: protectedProcedure
		.input(z.object({ name, icon, kind: flow }))
		.mutation(async ({ ctx, input }) => {
			try {
				return await ctx.db.category.create({
					data: { ...input, userId: ctx.session.user.id },
				});
			} catch (error) {
				if (isUniqueViolation(error)) throw duplicate();
				throw error;
			}
		}),

	// Renomear e trocar o ícone. O tipo (saída/entrada) não muda: as transações dependem dele.
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: name.optional(),
				icon: icon.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;
			const owned = await ctx.db.category.findFirst({
				where: { id, userId: ctx.session.user.id },
				select: { id: true },
			});
			if (!owned) throw new TRPCError({ code: "NOT_FOUND" });
			try {
				return await ctx.db.category.update({ where: { id }, data });
			} catch (error) {
				if (isUniqueViolation(error)) throw duplicate();
				throw error;
			}
		}),

	// Apagar uma categoria com transações exige dizer para qual outra (do mesmo tipo) elas vão.
	delete: protectedProcedure
		.input(
			z.object({ id: z.string(), moveToCategoryId: z.string().optional() }),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const category = await ctx.db.category.findFirst({
				where: { id: input.id, userId },
			});
			if (!category) throw new TRPCError({ code: "NOT_FOUND" });
			if (category.systemKey) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Essa categoria é usada pelo app e não pode ser apagada",
				});
			}

			const inUse = await ctx.db.transaction.count({
				where: { categoryId: category.id },
			});
			if (inUse === 0) {
				await ctx.db.category.delete({ where: { id: category.id } });
				return { moved: 0 };
			}

			if (!input.moveToCategoryId || input.moveToCategoryId === category.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Escolha para qual categoria vão as transações",
				});
			}
			const target = await ctx.db.category.findFirst({
				where: { id: input.moveToCategoryId, userId, kind: category.kind },
				select: { id: true },
			});
			if (!target) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "A categoria de destino precisa ser do mesmo tipo",
				});
			}
			await ctx.db.$transaction([
				ctx.db.transaction.updateMany({
					where: { categoryId: category.id },
					data: { categoryId: target.id },
				}),
				ctx.db.category.delete({ where: { id: category.id } }),
			]);
			return { moved: inUse };
		}),
});
