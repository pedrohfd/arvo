import { cn } from "@arvo/ui/lib/utils";
import { CreditCardIcon } from "@phosphor-icons/react";

import { CategoryIcon } from "@/components/category-icon";
import { formatSigned, monthName } from "@/lib/format";
import type { upcomingByMonth } from "@/lib/horizon";

// A lista "O que vem" do Horizonte (4.2), por mês: a tela do celular e o painel do computador.
export function UpcomingList({
	months,
}: {
	months: ReturnType<typeof upcomingByMonth>;
}) {
	return (
		<>
			{months.map((group) => (
				<div key={group.month}>
					<div className="day-header">
						<span className="day-header__label">{monthName(group.month)}</span>
						<span className="day-header__total">
							{formatSigned(group.netCents)}
						</span>
					</div>
					<div className="tx-list">
						{group.rows.map((row) => (
							<div
								key={row.key}
								className={cn(
									"tx-row",
									row.signedCents > 0 && "tx-row--income",
								)}
							>
								<span className="tx-row__icon">
									{row.icon ? (
										<CategoryIcon name={row.icon} />
									) : (
										<CreditCardIcon size={22} aria-hidden />
									)}
								</span>
								<div className="tx-row__text">
									<span className="tx-row__title">{row.name}</span>
									<span className="tx-row__sub">{row.sub}</span>
								</div>
								<div className="tx-row__amount">
									<span
										className={cn(
											"tx-row__value",
											row.signedCents > 0 && "text-[var(--color-income-text)]",
										)}
									>
										{formatSigned(row.signedCents)}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</>
	);
}
