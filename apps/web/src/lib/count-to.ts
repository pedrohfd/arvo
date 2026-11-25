// O saldo conta até o valor novo depois de um registro (DESIGN.md, Animação). Aqui só a conta: o
// valor, em centavos inteiros, num ponto da animação. O gancho que anima na tela fica em
// `use-count-to.ts`.

/** Duração da contagem, entre os 250 ms das trocas e os 400 ms das folhas (um pouco mais, é um número). */
export const COUNT_DURATION_MS = 600;

/** Curva suave que desacelera no fim (a "curva única" do app). */
export function easeOut(progress: number) {
	const clamped = Math.min(1, Math.max(0, progress));
	return 1 - (1 - clamped) ** 3;
}

/** O valor entre `from` e `to` quando a animação está em `progress` (0 a 1), em centavos inteiros. */
export function countValue(from: number, to: number, progress: number) {
	if (progress >= 1) return to;
	return Math.round(from + (to - from) * easeOut(progress));
}
