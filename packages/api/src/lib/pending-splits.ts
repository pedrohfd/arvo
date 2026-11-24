// Tela 3.4 "A receber": as partes que ainda não foram pagas, agrupadas por pessoa. Puro, para
// testar sem banco.

export type PendingSplitRow = {
	splitId: string;
	transactionId: string;
	personId: string;
	personName: string;
	amountCents: number;
	title: string | null;
	categoryName: string;
	categoryIcon: string;
	date: string;
};

export function groupPendingSplits(rows: readonly PendingSplitRow[]) {
	const byPerson = new Map<
		string,
		{
			personId: string;
			name: string;
			totalCents: number;
			items: PendingSplitRow[];
		}
	>();
	for (const row of rows) {
		const person = byPerson.get(row.personId) ?? {
			personId: row.personId,
			name: row.personName,
			totalCents: 0,
			items: [],
		};
		person.totalCents += row.amountCents;
		person.items.push(row);
		byPerson.set(row.personId, person);
	}
	const people = [...byPerson.values()]
		.map((person) => ({
			...person,
			// Mais recente primeiro; na mesma data, a ordem em que foram divididas.
			items: [...person.items].sort((a, b) => b.date.localeCompare(a.date)),
		}))
		// Quem deve mais vem primeiro; empate pelo nome.
		.sort(
			(a, b) =>
				b.totalCents - a.totalCents || a.name.localeCompare(b.name, "pt-BR"),
		);
	return {
		totalCents: people.reduce((sum, person) => sum + person.totalCents, 0),
		billCount: new Set(rows.map((row) => row.transactionId)).size,
		people,
	};
}
