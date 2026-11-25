import { cn } from "@arvo/ui/lib/utils";
import { type ReactNode, useEffect } from "react";

// Peças compartilhadas pelas folhas do Registrar.

/** Chip de escolha: o selecionado ganha o contorno verde do Figma. */
export function Chip({
	selected,
	onClick,
	icon,
	children,
}: {
	selected: boolean;
	onClick: () => void;
	icon?: ReactNode;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			className={cn(
				"choice",
				icon && "choice--icon",
				selected && "is-selected shadow-[inset_0_0_0_1px_var(--color-focus)]",
			)}
			onClick={onClick}
		>
			{icon ? <span className="icon">{icon}</span> : null}
			{children}
		</button>
	);
}

/** A alça no topo de uma folha. */
export function Grabber() {
	return (
		<div className="flex shrink-0 justify-center pt-2">
			<div className="h-[5px] w-9 rounded-full bg-[var(--color-fill-2)]" />
		</div>
	);
}

/**
 * Esc fecha só a folha de cima. Quem fica por baixo confere `event.defaultPrevented` e não age;
 * esta escuta pega o evento na fase de captura, antes das outras.
 */
export function useEscape(onEscape: () => void) {
	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			event.preventDefault();
			onEscape();
		}
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [onEscape]);
}
