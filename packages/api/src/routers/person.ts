import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const name = z.string().trim().min(1, "Dê um nome").max(40);

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
		message: "Já existe uma pessoa com esse nome",
	});

// "Pessoas" de Dividir a conta: só nomes, não são contas do app.
export const personRouter = router({
	// Com quanto cada uma ainda deve (partes não pagas).
	list: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;
		const [people, pending] = await Promise.all([
			ctx.db.person.findMany({
				where: { userId },
				orderBy: { name: "asc" },
				select: { id: true, name: true },
			}),
			ctx.db.transactionSplit.groupBy({
				by: ["personId"],
				where: { paidAt: null, person: { userId } },
				_sum: { amountCents: true },
			}),
		]);
		const owed = new Map(
			pending.map((row) => [row.personId, row._sum.amountCents ?? 0]),
		);
		return people.map((person) => ({
			...person,
			owedCents: owed.get(person.id) ?? 0,
		}));
	}),

	create: protectedProcedure
		.input(z.object({ name }))
		.mutation(async ({ ctx, input }) => {
			try {
				return await ctx.db.person.create({
					data: { name: input.name, userId: ctx.session.user.id },
				});
			} catch (error) {
				if (isUniqueViolation(error)) throw duplicate();
				throw error;
			}
		}),

	rename: protectedProcedure
		.input(z.object({ id: z.string(), name }))
		.mutation(async ({ ctx, input }) => {
			const person = await ctx.db.person.findFirst({
				where: { id: input.id, userId: ctx.session.user.id },
				select: { id: true },
			});
			if (!person) throw new TRPCError({ code: "NOT_FOUND" });
			try {
				return await ctx.db.person.update({
					where: { id: input.id },
					data: { name: input.name },
				});
			} catch (error) {
				if (isUniqueViolation(error)) throw duplicate();
				throw error;
			}
		}),

	// Quem aparece em alguma divisão não se apaga (o histórico perderia o nome).
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const person = await ctx.db.person.findFirst({
				where: { id: input.id, userId: ctx.session.user.id },
				select: { id: true },
			});
			if (!person) throw new TRPCError({ code: "NOT_FOUND" });
			const used = await ctx.db.transactionSplit.count({
				where: { personId: person.id },
			});
			if (used > 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Essa pessoa aparece em divisões e não pode ser apagada",
				});
			}
			await ctx.db.person.delete({ where: { id: person.id } });
			return { ok: true };
		}),
});
