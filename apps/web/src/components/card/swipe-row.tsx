import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import {
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	useRef,
	useState,
} from "react";

// Quanto o cartão precisa andar para valer como gesto, e até onde ele acompanha o dedo.
const TRIGGER = 80;
const MAX = 120;
// Movimento mínimo para decidir que é um deslize (e não um toque ou a rolagem da página).
const SLOP = 8;

// Linha que se desliza: para a direita abre o "Editar", para a esquerda o "Apagar". Ao soltar, o
// cartão volta ao lugar e a ação só dispara se passou do limite. Quem não desliza (teclado, leitor
// de tela) usa as setas ← e →.
export function SwipeRow({
	children,
	hint,
	onSwipeRight,
	onSwipeLeft,
}: {
	children: ReactNode;
	/** Frase para leitor de tela: o que cada gesto faz. */
	hint: string;
	onSwipeRight: () => void;
	onSwipeLeft: () => void;
}) {
	const [offset, setOffset] = useState(0);
	const [dragging, setDragging] = useState(false);
	const start = useRef<{ x: number; y: number } | null>(null);
	const moved = useRef(false);

	function onPointerDown(event: PointerEvent<HTMLDivElement>) {
		start.current = { x: event.clientX, y: event.clientY };
		moved.current = false;
	}

	function onPointerMove(event: PointerEvent<HTMLDivElement>) {
		if (!start.current) return;
		const dx = event.clientX - start.current.x;
		const dy = event.clientY - start.current.y;
		if (!moved.current) {
			// Antes de decidir, um movimento mais vertical é rolagem: deixa a página rolar.
			if (Math.abs(dx) < SLOP || Math.abs(dy) > Math.abs(dx)) return;
			moved.current = true;
			setDragging(true);
			event.currentTarget.setPointerCapture(event.pointerId);
		}
		setOffset(Math.max(-MAX, Math.min(MAX, dx)));
	}

	function finish(event: PointerEvent<HTMLDivElement>) {
		if (!start.current) return;
		start.current = null;
		if (!moved.current) return;
		setDragging(false);
		const final = offset;
		setOffset(0);
		if (event.type === "pointercancel") return;
		if (final >= TRIGGER) onSwipeRight();
		else if (final <= -TRIGGER) onSwipeLeft();
	}

	function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		if (event.key === "ArrowRight") {
			event.preventDefault();
			onSwipeRight();
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			onSwipeLeft();
		}
	}

	return (
		<div className="relative overflow-hidden rounded-[var(--radius-lg)]">
			<div
				className="absolute inset-0 flex items-center justify-between px-5"
				style={{
					background:
						offset > 0
							? "var(--color-primary-soft)"
							: offset < 0
								? "var(--color-danger-bg)"
								: "transparent",
				}}
				aria-hidden
			>
				<span
					className="text-(length:--text-size-small) flex items-center gap-2 font-semibold text-[var(--color-primary-soft-text)]"
					style={{ opacity: offset > 0 ? 1 : 0 }}
				>
					<PencilSimpleIcon size={22} />
					Editar
				</span>
				<span
					className="text-(length:--text-size-small) flex items-center gap-2 font-semibold text-[var(--color-danger-text)]"
					style={{ opacity: offset < 0 ? 1 : 0 }}
				>
					Apagar
					<TrashIcon size={22} />
				</span>
			</div>
			<div
				className="relative touch-pan-y"
				style={{
					transform: `translateX(${offset}px)`,
					transition: dragging
						? "none"
						: "transform var(--duration-medium) var(--ease)",
				}}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={finish}
				onPointerCancel={finish}
			>
				<button
					type="button"
					className="wallet-card"
					style={{ cursor: dragging ? "grabbing" : "grab" }}
					aria-keyshortcuts="ArrowRight ArrowLeft"
					onKeyDown={onKeyDown}
				>
					{children}
					<span className="sr-only">{hint}</span>
				</button>
			</div>
		</div>
	);
}
