import type { AppRouter } from "@arvo/api/routers/index";
import { computeBalance } from "@arvo/api/rules/balance";
import { monthTotals } from "@arvo/api/rules/summary";
import type { inferRouterInputs } from "@trpc/server";

import type { QueuedItem } from "@/lib/offline-queue";

// O que a Início mostra do que ainda está na fila offline: as linhas do mês e o efeito no saldo e
// em "Entrou" / "Saiu" (o valor já conta, como no Figma 1.6). Sem React, para testar.

export type CreateInput = inferRouterInputs<AppRouter>["transaction"]["create"];

/** Retrato guardado junto do item: a lista não depende de consultar nada para desenhar a linha. */
export type QueuedDisplay = {
	kind: "EXPENSE" | "INCOME";
	title: string | null;
	categoryId: string;
	categoryName: string;
	categoryIcon: string;
	cardId: string | null;
	/** "Pix", "Dinheiro", "Nubank · crédito". */
	methodLabel: string;
	/** As ocorrências que o servidor vai criar (uma só, salvo repetir ou parcelar). */
	rows: {
		index: number;
		date: string;
		dueDate: string | null;
		amountCents: number;
	}[];
};

export type QueuedTx = QueuedItem<CreateInput, QueuedDisplay>;

export type QueuedRow = {
	/** Identifica a linha na lista e na tela de detalhe local. */
	key: string;
	itemId: string;
	status: QueuedTx["status"];
	date: string;
	createdAt: string;
	kind: "EXPENSE" | "INCOME";
	amountCents: number;
	title: string | null;
	categoryName: string;
	categoryIcon: string;
	methodLabel: string;
};

/** Linhas dos itens da fila que caem no mês "AAAA-MM". */
export function queuedRowsOfMonth(
	items: readonly QueuedTx[],
	month: string,
): QueuedRow[] {
	return items.flatMap((item) =>
		item.display.rows
			.filter((row) => row.date.startsWith(month))
			.map((row) => ({
				key: `${item.id}-${row.index}`,
				itemId: item.id,
				status: item.status,
				date: row.date,
				createdAt: item.createdAt,
				kind: item.display.kind,
				amountCents: row.amountCents,
				title: item.display.title,
				categoryName: item.display.categoryName,
				categoryIcon: item.display.categoryIcon,
				methodLabel: item.display.methodLabel,
			})),
	);
}

/**
 * O quanto a fila muda o saldo e o "Entrou" / "Saiu" do mês, pelas mesmas regras do servidor. Só
 * conta o que está na fila ou sendo enviado; o que o servidor recusou não entra nas contas.
 */
export function queuedEffects(
	items: readonly QueuedTx[],
	month: string,
	reference: string,
) {
	const transactions = items
		.filter((item) => item.status !== "failed")
		.flatMap((item) =>
			item.display.rows.map((row) => ({
				kind: item.display.kind,
				amountCents: row.amountCents,
				date: row.date,
				dueDate: row.dueDate,
				categoryId: item.display.categoryId,
				cardId: item.display.cardId,
			})),
		);
	const totals = monthTotals(transactions, [], month);
	return {
		balanceDeltaCents: computeBalance({ transactions }, reference).balanceCents,
		entrouDeltaCents: totals.entrouCents,
		saiuDeltaCents: totals.saiuCents,
	};
}

/** "14h20", hora de Brasília, para "Dados de 14h20". */
export function clockLabel(timestamp: number) {
	const parts = new Intl.DateTimeFormat("pt-BR", {
		timeZone: "America/Sao_Paulo",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(new Date(timestamp));
	const get = (type: string) =>
		parts.find((part) => part.type === type)?.value ?? "00";
	return `${get("hour")}h${get("minute")}`;
}
