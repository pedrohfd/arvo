import { formatMoney } from "@/lib/format";
import { type ChartPoint, niceTicks, tickLabel } from "@/lib/horizon";

// Gráfico do Horizonte (4.2): saldo de hoje e no fim de cada mês seguinte. Linha com marcadores,
// área a 10% entre a linha e o zero, linha âmbar do saldo mínimo e o último valor em destaque.
// Estilos em `.horizon` (components.css).

const WIDTH = 350;
const HEIGHT = 196;
const LEFT = 44;
const RIGHT = 296;
const TOP = 28;
const BOTTOM = 156;

/** "R$ 500" (sem centavos quando é redondo) e "R$ 17.707,00". */
function reais(cents: number) {
	const text = formatMoney(Math.abs(cents));
	return cents % 100 === 0 ? text.replace(",00", "") : text;
}

function signed(cents: number) {
	return cents < 0 ? `− ${formatMoney(Math.abs(cents))}` : formatMoney(cents);
}

export function HorizonChart({
	points,
	minimumCents,
}: {
	points: readonly ChartPoint[];
	minimumCents: number;
}) {
	const values = points.map((point) => point.cents);
	const ticks = niceTicks(
		Math.min(...values),
		Math.max(...values, minimumCents),
	);
	const low = ticks[0] ?? 0;
	const high = ticks.at(-1) ?? 0;
	const y = (cents: number) =>
		BOTTOM - ((cents - low) / (high - low || 1)) * (BOTTOM - TOP);
	const x = (index: number) =>
		LEFT + (index * (RIGHT - LEFT)) / Math.max(points.length - 1, 1);

	const coords = points.map((point, index) => ({
		x: x(index),
		y: y(point.cents),
		point,
	}));
	const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
	const zero = y(0);
	const first = coords[0];
	const last = coords.at(-1);
	const area =
		first && last
			? `M${first.x},${zero} L${line.replaceAll(" ", " L")} L${last.x},${zero} Z`
			: "";
	const showMinimum = minimumCents > 0;

	return (
		<div className="horizon">
			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				role="img"
				aria-label={`Saldo previsto no fim de cada mês: ${points
					.map((point) => `${point.label} ${signed(point.cents)}`)
					.join(", ")}`}
			>
				{ticks.map((tick) => (
					<g key={tick}>
						<line
							className={tick === 0 ? "zero" : "grid"}
							x1={LEFT}
							x2={RIGHT}
							y1={y(tick)}
							y2={y(tick)}
						/>
						<text x={LEFT - 10} y={y(tick) + 4} textAnchor="end">
							{tickLabel(tick)}
						</text>
					</g>
				))}

				<path className="area" d={area} />
				{showMinimum ? (
					<>
						<line
							className="min-line"
							x1={LEFT}
							x2={RIGHT}
							y1={y(minimumCents)}
							y2={y(minimumCents)}
						/>
						<text className="min-label" x={RIGHT + 8} y={y(minimumCents) - 2}>
							mínimo
						</text>
						<text className="min-label" x={RIGHT + 8} y={y(minimumCents) + 12}>
							{reais(minimumCents)}
						</text>
					</>
				) : null}
				<polyline className="line" points={line} />

				{coords.map(({ x: cx, y: cy, point }, index) => (
					<circle
						key={point.label}
						className={[
							"dot",
							index === 0 ? "dot--now" : "",
							point.belowMinimum ? "dot--warn" : "",
						]
							.join(" ")
							.trim()}
						cx={cx}
						cy={cy}
						r={index === 0 ? 6 : 4}
					/>
				))}

				{coords.map(({ x: cx, point }, index) => (
					<text
						key={point.label}
						className={index === 0 ? "label-now" : undefined}
						x={cx}
						y={BOTTOM + 22}
						textAnchor="middle"
					>
						{point.label}
					</text>
				))}

				{last ? (
					<text
						className="label-end"
						x={last.x}
						y={last.y - 14}
						textAnchor="end"
					>
						{last.point.label} · {signed(last.point.cents)}
					</text>
				) : null}
			</svg>
		</div>
	);
}
