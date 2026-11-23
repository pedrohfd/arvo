// Dinheiro é sempre centavos inteiros (`number`), nunca ponto flutuante.

// R$ 9.999.999,99 (P1): o servidor e o teclado respeitam o mesmo limite.
export const MAX_AMOUNT_CENTS = 999_999_999;

export function assertCents(value: number, name = "valor") {
	if (!Number.isInteger(value)) {
		throw new Error(
			`${name} precisa ser um inteiro em centavos (recebeu ${value})`,
		);
	}
}

// Valor de uma transação, parte de divisão, parcela ou movimento de meta: de 1 centavo ao máximo.
export function assertPositiveAmount(value: number, name = "valor") {
	assertCents(value, name);
	if (value <= 0) throw new Error(`${name} precisa ser maior que zero`);
	if (value > MAX_AMOUNT_CENTS) {
		throw new Error(`${name} passa do máximo de R$ 9.999.999,99`);
	}
}
