export type CategoryKind = "EXPENSE" | "INCOME";

/** "1 transação", "2 transações" ou "Nenhuma", como na lista de Categorias. */
export function transactionCountLabel(count: number) {
	if (count === 0) return "Nenhuma";
	return count === 1 ? "1 transação" : `${count} transações`;
}

// Nome da categoria: obrigatório e único dentro do mesmo tipo (saída ou entrada), sem ligar para
// maiúsculas nem espaços nas pontas. Devolve a mensagem do erro ou nulo.
export function validateCategoryName(input: {
	name: string;
	kind: CategoryKind;
	existing: readonly { id: string; name: string; kind: CategoryKind }[];
	/** Categoria que está sendo editada: ela não conta como repetida. */
	editingId?: string;
}) {
	const name = input.name.trim();
	if (name === "") return "Dê um nome à categoria";
	const same = input.existing.some(
		(category) =>
			category.id !== input.editingId &&
			category.kind === input.kind &&
			category.name.trim().toLowerCase() === name.toLowerCase(),
	);
	return same ? `Já existe uma categoria chamada ${name}.` : null;
}
