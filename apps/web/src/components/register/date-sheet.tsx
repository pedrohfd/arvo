import { cn } from "@arvo/ui/lib/utils";
import { CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { arrowKeys } from "@/lib/arrow-keys";
import {
	isPickable,
	monthGrid,
	monthTitle,
	shiftMonth,
	shortcutDates,
} from "@/lib/date-picker";
import { monthName } from "@/lib/format";
import { Chip, Grabber, useEscape } from "./parts";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

// Tela 2.4 do Figma: atalhos Ontem/Hoje/Amanhã e o calendário do mês. A escolha só vale ao tocar
// em "Pronto"; fechar no X descarta. Na "Data limite" da meta (5.3) não há atalhos, dias antes de
// `minDate` ficam desligados e "Sem data" limpa a escolha (`onClear` vale se o "Pronto" vier sem
// data).
export function DateSheet({
	value,
	today,
	title = "Data",
	shortcuts = true,
	minDate,
	onSelect,
	onClear,
	onClose,
}: {
	value: string | null;
	today: string;
	title?: string;
	shortcuts?: boolean;
	minDate?: string;
	onSelect: (date: string) => void;
	onClear?: () => void;
	onClose: () => void;
}) {
	const [draft, setDraft] = useState(value);
	// O mês mostrado acompanha a data escolhida, mas as setas podem passear por outros meses.
	const [month, setMonth] = useState((value ?? today).slice(0, 7));
	useEscape(onClose);

	const { yesterday, tomorrow } = shortcutDates(today);

	function pick(date: string) {
		setDraft(date);
		setMonth(date.slice(0, 7));
	}

	const nextMonth = shiftMonth(month, 1);
	const canGoNext = isPickable(`${nextMonth}-01`, today);

	return (
		<div className="fixed inset-0 z-[60] flex items-end justify-center bg-[var(--color-overlay)]">
			<div
				role="dialog"
				aria-modal="true"
				aria-label={title}
				className="flex h-[601px] max-h-[calc(100svh-56px)] w-full max-w-[480px] flex-col rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-strong)]"
			>
				<Grabber />
				<div className="flex h-14 shrink-0 items-center gap-2 px-3 pt-1 pb-2">
					<button
						type="button"
						className="icon-btn"
						aria-label="Fechar"
						onClick={onClose}
					>
						<XIcon size={22} aria-hidden />
					</button>
					<h2 className="text-(length:--text-size-headline) font-semibold leading-6">
						{title}
					</h2>
				</div>

				<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
					{shortcuts ? (
						<div ref={arrowKeys()} className="choices">
							<Chip
								selected={draft === yesterday}
								onClick={() => pick(yesterday)}
							>
								Ontem
							</Chip>
							<Chip selected={draft === today} onClick={() => pick(today)}>
								Hoje
							</Chip>
							<Chip
								selected={draft === tomorrow}
								onClick={() => pick(tomorrow)}
							>
								Amanhã
							</Chip>
						</div>
					) : null}

					<div className="flex flex-col gap-3">
						<div className="flex h-11 items-center justify-between">
							<button
								type="button"
								className="icon-btn"
								aria-label="Mês anterior"
								onClick={() => setMonth(shiftMonth(month, -1))}
							>
								<CaretLeftIcon size={22} aria-hidden />
							</button>
							<h3 className="cal__title" aria-live="polite">
								{monthTitle(month)}
							</h3>
							<button
								type="button"
								className="icon-btn"
								aria-label="Próximo mês"
								disabled={!canGoNext}
								onClick={() => setMonth(nextMonth)}
							>
								<CaretRightIcon size={22} aria-hidden />
							</button>
						</div>

						<div className="text-(length:--text-size-small) grid grid-cols-7 text-center font-medium text-[var(--color-text-muted)] leading-5">
							{WEEKDAYS.map((weekday, index) => (
								// Os dias da semana se repetem (Q, Q e S, S): a posição é a chave.
								// biome-ignore lint/suspicious/noArrayIndexKey: lista fixa de 7 itens
								<span key={index} aria-hidden>
									{weekday}
								</span>
							))}
						</div>

						<div ref={arrowKeys(7)} className="flex flex-col">
							{monthGrid(month).map((week) => (
								<div key={week[0]?.date} className="grid grid-cols-7">
									{week.map((cell) => {
										const selected = cell.date === draft;
										const isToday = cell.date === today;
										const beforeMin =
											minDate !== undefined && cell.date < minDate;
										const pickable = isPickable(cell.date, today) && !beforeMin;
										const day = Number(cell.date.slice(8, 10));
										return (
											<button
												key={cell.date}
												type="button"
												aria-pressed={selected}
												aria-current={isToday ? "date" : undefined}
												aria-label={`${day} de ${monthName(cell.date.slice(0, 7)).toLowerCase()}`}
												disabled={!pickable}
												onClick={() => pick(cell.date)}
												className={cn(
													"flex h-11 w-full items-center justify-center rounded-full text-base tabular-nums leading-6 transition-colors",
													selected
														? "bg-[var(--color-primary)] font-semibold text-[var(--color-on-primary)]"
														: [
																"hover:bg-[var(--color-tint-hover)]",
																cell.inMonth
																	? "text-[var(--color-text)]"
																	: "text-[var(--color-text-muted)]",
																isToday &&
																	"font-semibold shadow-[inset_0_0_0_1px_var(--color-focus)]",
															],
													!pickable &&
														"cursor-default text-[var(--color-text-disabled)] hover:bg-transparent",
													!pickable && !beforeMin && "line-through",
												)}
											>
												{day}
											</button>
										);
									})}
								</div>
							))}
						</div>
					</div>
				</div>

				{onClear ? (
					<div className="flex shrink-0 justify-center pb-2">
						<button
							type="button"
							className="text-(length:--text-size-small) h-11 rounded-full px-4 font-semibold text-[var(--color-primary-soft-text)] leading-5 hover:bg-[var(--color-tint-hover)] disabled:opacity-[var(--text-opacity-disabled)] disabled:hover:bg-transparent"
							disabled={draft === null}
							onClick={() => setDraft(null)}
						>
							Sem data
						</button>
					</div>
				) : null}

				<div className="shrink-0 px-5 pt-3 pb-6">
					<button
						type="button"
						className="btn-primary btn-primary--block"
						disabled={draft === null && !onClear}
						onClick={() => (draft ? onSelect(draft) : onClear?.())}
					>
						Pronto
					</button>
				</div>
			</div>
		</div>
	);
}
