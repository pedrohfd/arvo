import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";
import { categoryRouter } from "./category";
import { goalRouter } from "./goal";
import { personRouter } from "./person";
import { settingsRouter } from "./settings";
import { splitRouter } from "./split";
import { summaryRouter } from "./summary";
import { transactionRouter } from "./transaction";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	// Tela 7.5: avisa quando não há conta com o e-mail (a criação de conta já revela isso).
	emailExists: publicProcedure
		.input(z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) }))
		.query(async ({ ctx, input }) => {
			const user = await ctx.db.user.findUnique({
				where: { email: input.email },
				select: { id: true },
			});
			return user !== null;
		}),
	category: categoryRouter,
	transaction: transactionRouter,
	summary: summaryRouter,
	goal: goalRouter,
	person: personRouter,
	split: splitRouter,
	settings: settingsRouter,
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
});
export type AppRouter = typeof appRouter;
