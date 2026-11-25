// Máscara: o traço do SVG é fixo, então o logo segue a cor do texto nos dois temas.
// A proporção do arquivo é 120:39; passe só a largura.
export function Logo({ width = 120 }: { width?: number }) {
	return (
		<span
			role="img"
			aria-label="arvo"
			className="block bg-text [mask:url(/logo.svg)_center/contain_no-repeat]"
			style={{ width, height: (width * 39) / 120 }}
		/>
	);
}
