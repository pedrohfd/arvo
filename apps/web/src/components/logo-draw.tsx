// Logo inline para o splash (7.1): o traço do "vo" se desenha em ~1 s (`.splash__draw`,
// em index.css). Os caminhos são os de public/logo.svg; a cor segue o texto nos dois temas.
export function LogoDraw({ width = 200 }: { width?: number }) {
	return (
		<svg
			role="img"
			aria-label="arvo"
			viewBox="0 0 120 39"
			width={width}
			height={(width * 39) / 120}
			fill="none"
			stroke="currentColor"
			strokeWidth={6.75426}
			strokeLinecap="round"
			strokeLinejoin="round"
			className="text-text"
		>
			<path d="M30.623 19.4663C30.623 25.6834 25.583 30.7233 19.3659 30.7233C13.1488 30.7233 8.10889 25.6834 8.10889 19.4663C8.10889 13.2492 13.1564 8.2092 19.3735 8.2092C25.5906 8.2092 30.623 13.2492 30.623 19.4663Z" />
			<path d="M32.2441 8.2092V19.4663V30.7233" />
			<path d="M43.6289 30.7234V17.2149C43.6289 12.2412 47.6608 8.20932 52.6345 8.20932H56.7321" />
			<path
				className="splash__draw"
				pathLength={1}
				d="M66.2026 8.20929L70.4278 19.4663L74.6529 30.7234L78.8781 19.4663L81.2763 13.0768C82.3753 10.1488 85.1748 8.2092 88.3023 8.2092L100.575 8.20929C106.791 8.20929 111.831 13.2492 111.831 19.4663C111.831 25.6834 106.791 30.7234 100.575 30.7234C94.357 30.7234 89.3171 25.6834 89.3171 19.4663"
			/>
		</svg>
	);
}
