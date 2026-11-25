/** "Nenhuma conta em aberto" ou "deve R$ 50,00", como na lista de Pessoas. */
export function owedLabel(
	owedCents: number,
	formatMoney: (c: number) => string,
) {
	return owedCents > 0 ? `Deve ${formatMoney(owedCents)}` : "Nada em aberto";
}

// Nome da pessoa: obrigatório e único, sem ligar para maiúsculas nem espaços nas pontas.
export function validatePersonName(input: {
	name: string;
	existing: readonly { id: string; name: string }[];
	/** Pessoa que está sendo renomeada: ela não conta como repetida. */
	editingId?: string;
}) {
	const name = input.name.trim();
	if (name === "") return "Dê um nome à pessoa";
	const same = input.existing.some(
		(person) =>
			person.id !== input.editingId &&
			person.name.trim().toLowerCase() === name.toLowerCase(),
	);
	return same ? `Já existe uma pessoa chamada ${name}.` : null;
}
