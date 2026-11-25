import { useEffect, useState } from "react";

// O gesto de recolher (Início, Metas e Resumo no celular): o que fica no alto da tela sobe com a
// lista; quando o valor grande sai inteiro da área que rola, a tela mostra o valor compacto na
// barra de cima. Passe `scrollRef` na área que rola (`.collapse-area`) e `targetRef` no valor grande.
export function useCollapse() {
	const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
	const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		if (!scrollEl || !targetEl) {
			setCollapsed(false);
			return;
		}
		const observer = new IntersectionObserver(
			([entry]) => setCollapsed(!entry?.isIntersecting),
			{ root: scrollEl, threshold: 0 },
		);
		observer.observe(targetEl);
		return () => observer.disconnect();
	}, [scrollEl, targetEl]);

	return { scrollRef: setScrollEl, targetRef: setTargetEl, collapsed };
}
