import { CheckCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

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

	useEffect(() => {
		if (left <= 0) {
			onExpire();
			return;
		}
		const timer = window.setTimeout(() => setLeft((value) => value - 1), 1000);
		return () => window.clearTimeout(timer);
	}, [left, onExpire]);

	return (
		<div className="fixed inset-x-3 bottom-[108px] z-40 mx-auto max-w-[480px]">
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
