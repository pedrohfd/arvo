import { MAX_AMOUNT_CENTS } from "@arvo/api/rules/money";

// Valor digitado no teclado do Registrar (tela 2.1). O valor é um texto como "120,5": dígitos,
// no máximo uma vírgula e no máximo 2 casas depois dela. Só vira centavos em `toCents`.

export type AmountKey =
	| "0"
	| "1"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "7"
	| "8"
	| "9"
	| ","
	| "back";

/** Centavos do texto digitado ("120,5" → 12050). Vazio vale 0. */
export function toCents(value: string): number {
	const [integer = "", decimals = ""] = value.split(",");
	return Number(integer || "0") * 100 + Number(decimals.padEnd(2, "0") || "0");
}

/** Chegou ao máximo de R$ 9.999.999,99: o teclado desliga os dígitos e a vírgula. */
export function isAtLimit(value: string) {
	return toCents(value) >= MAX_AMOUNT_CENTS;
}

export function pressKey(value: string, key: AmountKey): string {
	if (key === "back") return value.slice(0, -1);

	if (key === ",") {
		if (value.includes(",")) return value;
		return value === "" ? "0," : `${value},`;
	}

	const comma = value.indexOf(",");
	if (comma >= 0) {
		// Mais de 2 casas decimais: o dígito extra é ignorado.
		if (value.length - comma - 1 >= 2) return value;
	}
	// Zeros à esquerda são ignorados: "0" + "7" vira "7", e "0" + "0" continua "0".
	const next = value === "0" ? key : value + key;
	return toCents(next) > MAX_AMOUNT_CENTS ? value : next;
}

/**
 * Como mostrar o valor: o que foi digitado em destaque e o que falta em cinza. Vazio é "R$ 0,00"
 * todo em cinza; "120" é "R$ 120" + ",00"; "120,5" é "R$ 120,5" + "0".
 */
export function displayParts(value: string): { typed: string; ghost: string } {
	if (value === "") return { typed: "", ghost: "R$ 0,00" };
	const [integer = "0", decimals] = value.split(",");
	const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	if (decimals === undefined) return { typed: `R$ ${grouped}`, ghost: ",00" };
	return {
		typed: `R$ ${grouped},${decimals}`,
		ghost: "0".repeat(2 - decimals.length),
	};
}
