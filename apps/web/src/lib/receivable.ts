import { formatShortDate } from "@/lib/format";

// Textos da tela 3.4 (A receber), sem React, para testar.

const plural = (count: number, one: string, many: string) =>
	`${count} ${count === 1 ? one : many}`;

/** "de 3 pessoas, em 4 contas divididas" */
export function receivableSummary(people: number, bills: number) {
	return `de ${plural(people, "pessoa", "pessoas")}, em ${plural(bills, "conta dividida", "contas divididas")}`;
}

/** "Camilly · 2 contas" (a caixa alta vem do estilo do cabeçalho). */
export function personHeader(name: string, bills: number) {
	return `${name} · ${plural(bills, "conta", "contas")}`;
}

/** "Lazer · 12/10" */
export function billSub(categoryName: string, date: string) {
	return `${categoryName} · ${formatShortDate(date)}`;
}
