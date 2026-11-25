import { useEffect, useRef, useState } from "react";

import { COUNT_DURATION_MS, countValue } from "@/lib/count-to";

// Anima o valor (centavos) de um número na tela: quando `target` muda, conta do que estava mostrando
// até o novo. Com "reduzir movimento" no aparelho, vai direto ao valor. `resetKey` (o mês) troca o
// valor na hora, sem contar: contar de um mês para outro não diz nada.
export function useCountTo(target: number, resetKey: string) {
	const [shown, setShown] = useState(target);
	const shownRef = useRef(target);
	const keyRef = useRef(resetKey);
	shownRef.current = shown;

	useEffect(() => {
		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		if (keyRef.current !== resetKey || reduced) {
			keyRef.current = resetKey;
			setShown(target);
			return;
		}
		const from = shownRef.current;
		if (from === target) return;

		const start = performance.now();
		let frame = 0;
		const tick = (now: number) => {
			const progress = (now - start) / COUNT_DURATION_MS;
			setShown(countValue(from, target, progress));
			if (progress < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target, resetKey]);

	return shown;
}
