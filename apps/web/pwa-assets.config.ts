import {
	defineConfig,
	minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

const background = "#F2F5FA";

// O icon.svg já tem o fundo e a margem do monograma; sem padding extra,
// o PNG maskable cobre o quadrado inteiro (o monograma fica na zona segura).
export default defineConfig({
	headLinkOptions: {
		preset: "2023",
	},
	preset: {
		...minimal2023Preset,
		transparent: {
			...minimal2023Preset.transparent,
			padding: 0,
			resizeOptions: { background, fit: "contain" },
		},
		maskable: {
			...minimal2023Preset.maskable,
			padding: 0,
			resizeOptions: { background, fit: "contain" },
		},
		apple: {
			...minimal2023Preset.apple,
			padding: 0,
			resizeOptions: { background, fit: "contain" },
		},
	},
	images: ["public/icon.svg"],
});
