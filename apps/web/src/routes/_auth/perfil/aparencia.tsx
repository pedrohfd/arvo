import { cn } from "@arvo/ui/lib/utils";
import {
	CaretLeftIcon,
	CheckIcon,
	DeviceMobileIcon,
	MoonIcon,
	SunIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useTheme } from "@/components/theme-provider";
import { THEME_OPTIONS, type ThemeChoice, themeChoice } from "@/lib/theme";

export const Route = createFileRoute("/_auth/perfil/aparencia")({
	component: Aparencia,
});

const ICONS: Record<ThemeChoice, ReactNode> = {
	system: <DeviceMobileIcon size={24} aria-hidden />,
	light: <SunIcon size={24} aria-hidden />,
	dark: <MoonIcon size={24} aria-hidden />,
};

// Tela 6.6: automática (segue o aparelho), clara ou escura. Vale só neste aparelho e na hora.
function Aparencia() {
	const { theme, setTheme } = useTheme();
	const current = themeChoice(theme);

	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			<div className="flex h-12 items-center pt-1 pr-3 pl-2">
				<Link to="/perfil" className="icon-btn" aria-label="Voltar">
					<CaretLeftIcon size={22} aria-hidden />
				</Link>
			</div>
			<div className="flex h-10 items-center px-5">
				<h1 className="display text-(length:--text-size-display) leading-[var(--text-leading-display)]">
					Aparência
				</h1>
			</div>

			<div className="flex flex-col gap-5 px-5 pt-4 pb-32">
				<section className="setting-group">
					<div className="setting-group__body">
						{THEME_OPTIONS.map((option) => {
							const selected = option.value === current;
							return (
								<button
									key={option.value}
									type="button"
									aria-pressed={selected}
									className={cn("setting-row", selected && "is-selected")}
									onClick={() => setTheme(option.value)}
								>
									<span className="setting-row__icon">
										{ICONS[option.value]}
									</span>
									<span className="setting-row__text">
										<span className="setting-row__title">{option.label}</span>
										{option.description ? (
											<span className="setting-row__desc">
												{option.description}
											</span>
										) : null}
									</span>
									{selected ? (
										<CheckIcon
											size={20}
											weight="bold"
											className="text-[var(--color-primary)]"
											aria-hidden
										/>
									) : null}
								</button>
							);
						})}
					</div>
				</section>
			</div>
		</div>
	);
}
