import type { Database } from "@arvo/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { fromDbDate, toDbDate, todayInSaoPaulo } from "../lib/calendar";
import { rule } from "../lib/errors";
import { loadFinanceData } from "../lib/finance-data";
import { computeBalance } from "../rules/balance";
import {
	assertCanDeposit,
	assertCanWithdraw,
	completeGoal,
	isGoalReached,
	monthlyHint,
	savedCents,
} from "../rules/goals";
import { assertPositiveAmount } from "../rules/money";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const goalFields = {
	name: z.string().trim().min(1, "Dê um nome").max(40),
	icon: z.string().trim().min(1).max(40),
	targetCents: z.number().int(),
	deadline: date.nullable().optional(),
};

async function findGoal(db: Database, userId: string, id: string) {
	const goal = await db.goal.findFirst({
		where: { id, userId },
		include: { movements: { select: { type: true, amountCents: true } } },
	});
	if (!goal) throw new TRPCError({ code: "NOT_FOUND" });
	return goal;
}

function assertOpen(goal: { completedAt: Date | null }) {
	if (goal.completedAt) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Essa meta já foi concluída",
		});
	}
}

export const goalRouter = router({
	list: protectedProcedure.query(async ({ ctx }) => {
		const today = todayInSaoPaulo();
		const goals = await ctx.db.goal.findMany({
			where: { userId: ctx.session.user.id },
			orderBy: { createdAt: "asc" },
			include: { movements: { select: { type: true, amountCents: true } } },
		});
		return goals.map((goal) => {
			const saved = savedCents(goal.movements);
			const deadline = goal.deadline ? fromDbDate(goal.deadline) : null;
			return {
				id: goal.id,
				name: goal.name,
				icon: goal.icon,
				kind: goal.kind,
				targetCents: goal.targetCents,
				deadline,
				completedAt: goal.completedAt ? fromDbDate(goal.completedAt) : null,
				savedCents: saved,
				reached: isGoalReached(saved, goal.targetCents),
				hint: monthlyHint({
					targetCents: goal.targetCents,
					savedCents: saved,
					deadline,
					reference: today,
				}),
			};
		});
	}),

	create: protectedProcedure
		.input(z.object({ ...goalFields, kind: z.enum(["SPEND", "KEEP"]) }))
		.mutation(async ({ ctx, input }) => {
			rule(() => assertPositiveAmount(input.targetCents, "valor da meta"));
			return ctx.db.goal.create({
				data: {
					...input,
					deadline: input.deadline ? toDbDate(input.deadline) : null,
					userId: ctx.session.user.id,
				},
			});
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: goalFields.name.optional(),
				icon: goalFields.icon.optional(),
				targetCents: goalFields.targetCents.optional(),
				deadline: goalFields.deadline,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, deadline, ...rest } = input;
			await findGoal(ctx.db, ctx.session.user.id, id);
			if (rest.targetCents !== undefined) {
				const target = rest.targetCents;
				rule(() => assertPositiveAmount(target, "valor da meta"));
			}
			return ctx.db.goal.update({
				where: { id },
				data: {
					...rest,
					...(deadline === undefined
						? {}
						: { deadline: deadline ? toDbDate(deadline) : null }),
				},
			});
		}),

	// Guardar tira do saldo; só dá para guardar o que está disponível.
	deposit: protectedProcedure
		.input(z.object({ goalId: z.string(), amountCents: z.number().int() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const goal = await findGoal(ctx.db, userId, input.goalId);
			assertOpen(goal);
			const today = todayInSaoPaulo();
			const { transactions, goalMovements } = await loadFinanceData(
				ctx.db,
				userId,
			);
			const { balanceCents } = computeBalance(
				{ transactions, goalMovements },
				today,
			);
			rule(() => assertCanDeposit(balanceCents, input.amountCents));
			return ctx.db.goalMovement.create({
				data: {
					goalId: goal.id,
					type: "DEPOSIT",
					amountCents: input.amountCents,
					date: toDbDate(today),
				},
			});
		}),

	// Resgatar devolve ao saldo; só dá para resgatar o que está guardado nessa meta.
	withdraw: protectedProcedure
		.input(z.object({ goalId: z.string(), amountCents: z.number().int() }))
		.mutation(async ({ ctx, input }) => {
			const goal = await findGoal(ctx.db, ctx.session.user.id, input.goalId);
			rule(() =>
				assertCanWithdraw(savedCents(goal.movements), input.amountCents),
			);
			return ctx.db.goalMovement.create({
				data: {
					goalId: goal.id,
					type: "WITHDRAW",
					amountCents: input.amountCents,
					date: toDbDate(todayInSaoPaulo()),
				},
			});
		}),

	// Concluir uma meta "para gastar" já atingida: devolve ao saldo o que estava guardado.
	complete: protectedProcedure
		.input(z.object({ goalId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const goal = await findGoal(ctx.db, ctx.session.user.id, input.goalId);
			assertOpen(goal);
			const today = todayInSaoPaulo();
			const movement = rule(() =>
				completeGoal(
					{
						kind: goal.kind,
						savedCents: savedCents(goal.movements),
						targetCents: goal.targetCents,
					},
					today,
				),
			);
			await ctx.db.$transaction([
				ctx.db.goalMovement.create({
					data: {
						goalId: goal.id,
						type: movement.type,
						amountCents: movement.amountCents,
						date: toDbDate(movement.date),
					},
				}),
				ctx.db.goal.update({
					where: { id: goal.id },
					data: { completedAt: toDbDate(today) },
				}),
			]);
			return { returnedCents: movement.amountCents };
		}),

	// Apagar a meta apaga os movimentos: o que estava guardado volta ao saldo.
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await findGoal(ctx.db, ctx.session.user.id, input.id);
			await ctx.db.goal.delete({ where: { id: input.id } });
			return { ok: true };
		}),
});
