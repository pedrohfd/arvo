import { assertCents } from "./money";

// Dividir a conta: partes iguais contando você; os centavos que sobram ficam com você.
// 85,50 entre 4 pessoas: cada uma das outras 3 fica com 21,37 e você com 21,39.

export type BillSplit = {
	/** Parte de cada uma das outras pessoas (todas iguais). Vazio se for só você. */
	othersCents: number[];
	/** Sua parte: a divisão exata mais a sobra de centavos. */
	yourShareCents: number;
};

// `partyCount` inclui você (mínimo 1).
export function splitBill(totalCents: number, partyCount: number): BillSplit {
	assertCents(totalCents, "total");
	if (!Number.isInteger(partyCount) || partyCount < 1) {
		throw new Error("A divisão precisa de pelo menos 1 pessoa (você)");
	}
	if (totalCents <= 0) throw new Error("O total precisa ser maior que zero");

	const each = Math.floor(totalCents / partyCount);
	const remainder = totalCents - each * partyCount;
	return {
		othersCents: Array.from({ length: partyCount - 1 }, () => each),
		yourShareCents: each + remainder,
	};
}
