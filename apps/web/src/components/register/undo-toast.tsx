import { CheckCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { formatMoney } from "@/lib/format";
import type { Registered } from "./register-sheet";

const SECONDS = 6;

// Aviso temporário da 1.7 "acabou de registrar": confirma o registro e oferece "Desfazer" por 6
// segundos, com a contagem ao lado.
export function UndoToast({
	registered,
	onUndo,
	onExpire,
}: {
	registered: Registered;
	onUndo: () => void;
	onExpire: () => void;
}) {
	const [left, setLeft] = useState(SECONDS);

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
					<b>
						{registered.flow === "EXPENSE" ? "Saída" : "Entrada"} registrada
					</b>{" "}
					· {formatMoney(registered.amountCents)}
				</span>
				<button type="button" className="toast__action" onClick={onUndo}>
					Desfazer <span className="toast__count">{left}</span>
				</button>
			</div>
		</div>
	);
}
