import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";

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
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
});
export type AppRouter = typeof appRouter;
