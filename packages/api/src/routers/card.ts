import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { rule } from "../lib/errors";

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

export const cardRouter = router({
	list: protectedProcedure.query(({ ctx }) =>
		ctx.db.card.findMany({
			where: { userId: ctx.session.user.id },
			orderBy: { createdAt: "asc" },
			select: {
				id: true,
				name: true,
				type: true,
				last4: true,
				closingDay: true,
				dueDay: true,
			},
		}),
	),

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

	// Apagar o cartão mantém as compras: o vencimento da fatura já está gravado nelas.
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const owned = await ctx.db.card.findFirst({
				where: { id: input.id, userId: ctx.session.user.id },
				select: { id: true },
			});
			if (!owned) throw new TRPCError({ code: "NOT_FOUND" });
			await ctx.db.card.delete({ where: { id: input.id } });
			return { ok: true };
		}),
});
