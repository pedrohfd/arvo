import { splitBill } from "@arvo/api/rules/split";

import { formatMoney } from "./format";

// "Dividir a conta" no Registrar (2.2 e folha 2.3): partes iguais contando você; os centavos que
// sobram ficam com você. O servidor refaz a conta (`transaction.create`).

/** "R$ 21,37 para cada · você fica com R$ 21,39"; com só você, o convite para escolher alguém. */
export function splitHint(amountCents: number, peopleCount: number) {
	if (peopleCount === 0)
		return "Só você por enquanto. Escolha com quem dividiu.";
	if (amountCents <= 0) return null;
	const { othersCents, yourShareCents } = splitBill(
		amountCents,
		peopleCount + 1,
	);
	const each = othersCents[0] ?? 0;
	if (each === yourShareCents) {
		return `${formatMoney(each)} para cada, contando você.`;
	}
	return `${formatMoney(each)} para cada · você fica com ${formatMoney(yourShareCents)}.`;
}

/** Iniciais do avatar: "Ana" → "A", "Ana Souza" → "AS". */
export function initials(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return "";
	const first = words[0]?.charAt(0) ?? "";
	const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? "") : "";
	return (first + last).toUpperCase();
}

/** A pessoa já cadastrada com esse nome (sem ligar para maiúsculas nem espaços nas pontas). */
export function findPersonByName<T extends { name: string }>(
	people: readonly T[],
	name: string,
) {
	const wanted = name.trim().toLowerCase();
	if (wanted === "") return undefined;
	return people.find((person) => person.name.trim().toLowerCase() === wanted);
}
