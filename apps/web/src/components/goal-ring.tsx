import type { CSSProperties } from "react";

// Circunferência do anel: raio 42 no viewBox de 100 (2π · 42).
const CIRCUMFERENCE = 263.9;

// Anel de progresso da meta (`.goal-ring`). O tamanho vem de `--ring`; o texto, de `.goal-ring__label`.
export function GoalRing({
	percent,
	size = 56,
}: {
	percent: number;
	size?: number;
}) {
	const filled = (Math.min(Math.max(percent, 0), 100) * CIRCUMFERENCE) / 100;

	return (
		<span
			className="goal-ring"
			style={{ "--ring": `${size}px` } as CSSProperties}
		>
			<svg className="goal-ring__svg" viewBox="0 0 100 100" aria-hidden>
				<circle className="goal-ring__track" cx="50" cy="50" r="42" />
				<circle
					className="goal-ring__bar"
					cx="50"
					cy="50"
					r="42"
					strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
				/>
			</svg>
			<span className="goal-ring__label">{percent}%</span>
		</span>
	);
}
