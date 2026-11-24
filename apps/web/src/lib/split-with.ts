import { splitBill } from "@arvo/api/rules/split";

import { formatMoney } from "./format";

// "Dividir a conta" no Registrar (2.2 e folha 2.3): partes iguais contando você; os centavos que
// sobram ficam com você. O servidor refaz a conta (`transaction.create`).

/**
 * Texto sob "Na divisão" (Figma 2.2 dividida e 2.3). Partes exatas: "R$ 28,50 para cada. Você recebe
 * R$ 57,00 de volta." Com sobra de centavos: "R$ 21,37 para cada. Você fica com R$ 21,39 (os
 * centavos que sobram)." Só você: o convite para adicionar alguém.
 */
export function splitHint(amountCents: number, peopleCount: number) {
	if (peopleCount === 0) return "Adicione quem dividiu com você.";
	if (amountCents <= 0) return null;
	const { othersCents, yourShareCents } = splitBill(
		amountCents,
		peopleCount + 1,
	);
	const each = othersCents[0] ?? 0;
	if (each === yourShareCents) {
		const back = each * peopleCount;
		return `${formatMoney(each)} para cada. Você recebe ${formatMoney(back)} de volta.`;
	}
	return `${formatMoney(each)} para cada. Você fica com ${formatMoney(yourShareCents)} (os centavos que sobram).`;
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
