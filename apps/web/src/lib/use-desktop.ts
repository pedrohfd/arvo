import { useSyncExternalStore } from "react";

// Largura de computador (≥ 1024 px): barra lateral de 240 e painel de detalhe de 400. Abaixo disso é
// a tela do celular (ou a largura média, com a barra compacta).
const QUERY = "(min-width: 1024px)";

function subscribe(callback: () => void) {
	const media = window.matchMedia(QUERY);
	media.addEventListener("change", callback);
	return () => media.removeEventListener("change", callback);
}

export function useDesktop() {
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(QUERY).matches,
		() => false,
	);
}
