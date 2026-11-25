import { CheckCircleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

// Aviso temporário com "Desfazer" e a contagem ao lado: 1.7 "acabou de registrar" (6 s) e 3.3
// "apagou" (10 s).
export function UndoToast({
	title,
	detail,
	seconds,
	onUndo,
	onExpire,
}: {
	title: string;
	detail: string | null;
	seconds: number;
	onUndo: () => void;
	onExpire: () => void;
}) {
	const [left, setLeft] = useState(seconds);
	// Com o mouse ou o foco em cima, o tempo para: dá para ler e alcançar o Desfazer sem pressa.
	const [paused, setPaused] = useState(false);
	const box = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const element = box.current;
		if (!element) return;
		const pause = () => setPaused(true);
		const resume = () => setPaused(false);
		element.addEventListener("mouseenter", pause);
		element.addEventListener("mouseleave", resume);
		element.addEventListener("focusin", pause);
		element.addEventListener("focusout", resume);
		return () => {
			element.removeEventListener("mouseenter", pause);
			element.removeEventListener("mouseleave", resume);
			element.removeEventListener("focusin", pause);
			element.removeEventListener("focusout", resume);
		};
	}, []);

	useEffect(() => {
		if (left <= 0) {
			onExpire();
			return;
		}
		if (paused) return;
		const timer = window.setTimeout(() => setLeft((value) => value - 1), 1000);
		return () => window.clearTimeout(timer);
	}, [left, onExpire, paused]);

	return (
		<div
			ref={box}
			className="fixed inset-x-3 bottom-[108px] z-40 mx-auto max-w-[480px]"
		>
			<div className="toast" role="status">
				<CheckCircleIcon size={20} aria-hidden />
				<span className="toast__text">
					<b>{title}</b>
					{detail ? ` · ${detail}` : null}
				</span>
				<button type="button" className="toast__action" onClick={onUndo}>
					Desfazer <span className="toast__count">{left}</span>
				</button>
			</div>
		</div>
	);
}
