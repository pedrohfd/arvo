import { cn } from "@arvo/ui/lib/utils";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Sheet } from "@/components/card/card-sheets";
import { arrowKeys } from "@/lib/arrow-keys";
import { monthName } from "@/lib/format";
import { monthSheetModel } from "@/lib/home-month";

// Folha 1.10 "Mês": o ano com setas e os 12 meses em grade. Escolher um mês fecha a folha. Meses
// antes da primeira transação e além de 24 meses à frente ficam apagados.
export function MonthSheet({
	selected,
	current,
	first,
	onSelect,
	onClose,
}: {
	selected: string;
	current: string;
	first: string | null;
	onSelect: (month: string) => void;
	onClose: () => void;
}) {
	const [year, setYear] = useState(Number(selected.slice(0, 4)));
	const { months, canPrev, canNext } = monthSheetModel({
		year,
		current,
		first,
	});

	return (
		<Sheet title="Mês" onClose={onClose}>
			<div className="flex items-center justify-between px-5 pt-2">
				<button
					type="button"
					className="icon-btn"
					aria-label="Ano anterior"
					disabled={!canPrev}
					onClick={() => setYear((value) => value - 1)}
				>
					<CaretLeftIcon size={22} aria-hidden />
				</button>
				<span className="display text-(length:--text-size-headline) font-medium leading-6">
					{year}
				</span>
				<button
					type="button"
					className="icon-btn"
					aria-label="Próximo ano"
					disabled={!canNext}
					onClick={() => setYear((value) => value + 1)}
				>
					<CaretRightIcon size={22} aria-hidden />
				</button>
			</div>
			<div ref={arrowKeys(3)} className="month-grid px-5 pt-4 pb-8">
				{months.map(({ month, disabled }) => (
					<button
						key={month}
						type="button"
						className={cn("month-chip", month === selected && "is-selected")}
						aria-pressed={month === selected}
						disabled={disabled}
						onClick={() => onSelect(month)}
					>
						{monthName(month)}
						{month === current ? <span className="month-chip__dot" /> : null}
					</button>
				))}
			</div>
		</Sheet>
	);
}
