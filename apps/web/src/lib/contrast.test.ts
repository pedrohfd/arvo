import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Contraste AA (4,5:1 para texto) dos pares de cor do design, nos dois temas, lidos de
// `packages/ui/src/styles/tokens.css`. Se alguém trocar um token e o par deixar de passar, o teste
// diz qual (DESIGN.md, Acessibilidade).

const css = readFileSync(
	join(import.meta.dir, "../../../../packages/ui/src/styles/tokens.css"),
	"utf-8",
);

function block(start: string) {
	const from = css.indexOf(start);
	if (from < 0) throw new Error(`bloco não encontrado: ${start}`);
	const open = css.indexOf("{", from);
	let depth = 0;
	for (let i = open; i < css.length; i++) {
		if (css[i] === "{") depth++;
		if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
	}
	throw new Error(`bloco sem fim: ${start}`);
}

function colors(text: string) {
	const map = new Map<string, string>();
	for (const [, name, value] of text.matchAll(
		/--color-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi,
	)) {
		map.set(name as string, value as string);
	}
	return map;
}

const light = colors(block("@theme static"));
const dark = new Map([...light, ...colors(block(':root[data-theme="dark"]'))]);

function channel(value: number) {
	const v = value / 255;
	return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
	const [r, g, b] = [1, 3, 5].map((i) =>
		channel(Number.parseInt(hex.slice(i, i + 2), 16)),
	) as [number, number, number];
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a: string, b: string) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
		number,
		number,
	];
	return (hi + 0.05) / (lo + 0.05);
}

// [texto, fundo]
const PAIRS: [string, string][] = [
	["text", "bg"],
	["text", "surface"],
	["text-muted", "bg"],
	["text-muted", "surface"],
	["text-muted", "fill-1"],
	["text-placeholder", "fill-1"],
	["on-primary", "primary"],
	["primary-soft-text", "primary-soft"],
	["accent-text", "accent"],
	["income-text", "surface"],
	["income-text", "income-bg"],
	["danger-text", "surface"],
	["danger-text", "danger-bg"],
	["warn-text", "surface"],
	["warn-text", "warn-bg"],
];

for (const [theme, tokens] of [
	["claro", light],
	["escuro", dark],
] as const) {
	describe(`contraste AA, tema ${theme}`, () => {
		for (const [fg, bg] of PAIRS) {
			test(`${fg} sobre ${bg} passa de 4,5:1`, () => {
				const a = tokens.get(fg);
				const b = tokens.get(bg);
				expect(a, `token ${fg}`).toBeDefined();
				expect(b, `token ${bg}`).toBeDefined();
				const value = ratio(a as string, b as string);
				expect(value, `${fg} ${a} sobre ${bg} ${b}`).toBeGreaterThanOrEqual(
					4.5,
				);
			});
		}
	});
}
