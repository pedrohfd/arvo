import type { Database } from "@arvo/db";

import type { CalendarDate } from "../rules/dates";
import { dueDateForPurchase } from "../rules/invoice";
import { renewOccurrences } from "../rules/recurrence";
import { fromDbDate, toDbDate } from "./calendar";

// Mantém as séries sem fim (P2) com 24 meses gerados à frente. Roda ao abrir o app, no servidor,
// sem tarefa agendada. As novas ocorrências copiam a última que a série tem (valor, categoria,
// forma de pagamento), então um "editar esta e as próximas" vale também para as renovadas. Série
// sem nenhuma linha (a pessoa apagou todas) é ignorada.
export async function renewOpenSeries(
	db: Database,
	userId: string,
	today: CalendarDate,
) {
	const series = await db.series.findMany({
		where: { userId, kind: "RECURRING", count: null },
	});

	for (const item of series) {
		const spec = {
			kind: item.kind,
			startDate: fromDbDate(item.startDate),
			intervalMonths: item.intervalMonths,
			count: item.count,
			anchorDay: item.anchorDay,
		} as const;
		const fresh = renewOccurrences(spec, item.generatedCount, today);
		if (fresh.length === 0) continue;

		const template = await db.transaction.findFirst({
			where: { seriesId: item.id },
			orderBy: { seriesIndex: "desc" },
			include: {
				card: { select: { type: true, closingDay: true, dueDay: true } },
			},
		});
		if (!template) continue;

		const last = fresh[fresh.length - 1];
		await db.$transaction(async (tx) => {
			// Duas abas abrindo juntas não renovam duas vezes: só quem avança o contador gera.
			const claimed = await tx.series.updateMany({
				where: { id: item.id, generatedCount: item.generatedCount },
				data: { generatedCount: last?.index ?? item.generatedCount },
			});
			if (claimed.count === 0) return;
			await tx.transaction.createMany({
				data: fresh.map((occurrence) => ({
					userId,
					kind: template.kind,
					amountCents: template.amountCents,
					title: template.title,
					categoryId: template.categoryId,
					date: toDbDate(occurrence.date),
					paymentMethod: template.paymentMethod,
					cardId: template.cardId,
					dueDate:
						template.kind === "EXPENSE" &&
						dueDateForPurchase(template.card, occurrence.date)
							? toDbDate(
									dueDateForPurchase(
										template.card,
										occurrence.date,
									) as CalendarDate,
								)
							: null,
					seriesId: item.id,
					seriesIndex: occurrence.index,
				})),
			});
		});
	}
}
