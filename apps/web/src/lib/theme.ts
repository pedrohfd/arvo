export type ThemeChoice = "system" | "light" | "dark";

export const THEME_OPTIONS: readonly {
	value: ThemeChoice;
	label: string;
	description?: string;
}[] = [
	{ value: "system", label: "Automática", description: "Segue o aparelho" },
	{ value: "light", label: "Clara" },
	{ value: "dark", label: "Escura" },
];

/** O tema salvo pelo `next-themes`; qualquer outro valor (ou nenhum) é "Automática". */
export function themeChoice(theme: string | undefined): ThemeChoice {
	return theme === "light" || theme === "dark" ? theme : "system";
}

export function themeLabel(theme: string | undefined) {
	const choice = themeChoice(theme);
	return THEME_OPTIONS.find((option) => option.value === choice)?.label ?? "";
}
