import { formatShortDate, monthName } from "@/lib/format";

// Tela "Resumo · categoria" (4.1 do Figma): as saídas de uma categoria num mês. Textos e contas,
// sem React, para testar. Meses são "AAAA-MM".

type Row = {
	date: string;
	amountCents: number;
	paymentMethod: "CARD" | "PIX" | "CASH" | "DEPOSIT";
	cardName: string | null;
	dueDate: string | null;
};

/** "Mercado em novembro" (com o ano se não for o de hoje: "... em novembro de 2027"). */
export function categoryTitle(name: string, month: string, today: string) {
	const sameYear = month.slice(0, 4) === today.slice(0, 4);
	const monthText = monthName(month).toLowerCase();
	return `${name} em ${monthText}${sameYear ? "" : ` de ${month.slice(0, 4)}`}`;
}

/** Quanto da saída do mês foi dessa categoria, arredondado como o "Para onde foi". */
export function categoryShare(categoryCents: number, monthSaiuCents: number) {
	return monthSaiuCents === 0
		? 0
		: Math.round((categoryCents * 100) / monthSaiuCents);
}

/** "1 transação" / "2 transações". */
export function transactionCount(count: number) {
	return count === 1 ? "transação" : "transações";
}

const METHOD = { PIX: "Pix", CASH: "Dinheiro", DEPOSIT: "Depósito" } as const;

/** "Nubank · fatura 27/11" (crédito), "Itaú" (débito) ou "Pix". */
export function paymentLine(row: Row) {
	if (row.paymentMethod !== "CARD") return METHOD[row.paymentMethod];
	const card = row.cardName ?? "Cartão";
	return row.dueDate
		? `${card} · fatura ${formatShortDate(row.dueDate)}`
		: card;
}
