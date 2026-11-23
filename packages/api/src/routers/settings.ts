import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { rule } from "../lib/errors";
import { MAX_AMOUNT_CENTS } from "../rules/money";

export const settingsRouter = router({
	get: protectedProcedure.query(async ({ ctx }) => {
		const settings = await ctx.db.userSettings.findUnique({
			where: { userId: ctx.session.user.id },
		});
		return { minimumBalanceCents: settings?.minimumBalanceCents ?? 0 };
	}),

	// "Saldo mínimo" (0 = sem aviso).
	setMinimumBalance: protectedProcedure
		.input(z.object({ minimumBalanceCents: z.number().int() }))
		.mutation(async ({ ctx, input }) => {
			rule(() => {
				if (
					input.minimumBalanceCents < 0 ||
					input.minimumBalanceCents > MAX_AMOUNT_CENTS
				) {
					throw new Error(
						"O saldo mínimo precisa estar entre R$ 0 e R$ 9.999.999,99",
					);
				}
			});
			const userId = ctx.session.user.id;
			return ctx.db.userSettings.upsert({
				where: { userId },
				create: { userId, minimumBalanceCents: input.minimumBalanceCents },
				update: { minimumBalanceCents: input.minimumBalanceCents },
			});
		}),
});
