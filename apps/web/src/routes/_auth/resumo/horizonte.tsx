import type { AppRouter } from "@arvo/api/routers/index";
import { cn } from "@arvo/ui/lib/utils";
import {
	CaretLeftIcon,
	ChartLineUpIcon,
	CreditCardIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";

import { CategoryIcon } from "@/components/category-icon";
import { useRegister } from "@/components/register/register-provider";
import { HorizonChart } from "@/components/summary/horizon-chart";
import { formatSigned, monthName } from "@/lib/format";
import { chartPoints, negativeWarning, upcomingByMonth } from "@/lib/horizon";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/resumo/horizonte")({
	component: Horizonte,
});

const CAPTION =
	"Só conta o que já está agendado: salário, parcelas e datas futuras. Os gastos do dia a dia não entram, então a linha costuma ser otimista.";

// Tela 4.2 do Figma (página "Arvo · 4 Resumo"): o gráfico de hoje + 5 meses, a lista "O que vem" e
// os estados normal, negativo e "Nada agendado ainda". Carregando e não carregou seguem o padrão
// das outras telas (sem quadro próprio).
function Horizonte() {
	const horizon = useQuery(trpc.summary.horizon.queryOptions());
	const register = useRegister();
	const data = horizon.data;

	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			<div className="flex h-12 items-center px-2 pt-1">
				<Link to="/resumo" className="icon-btn" aria-label="Voltar">
					<CaretLeftIcon size={22} aria-hidden />
				</Link>
			</div>
			<div className="flex shrink-0 flex-col gap-1 px-5 pt-4 pb-4">
				<h1 className="display text-(length:--text-size-display) leading-[var(--text-leading-display)]">
					Horizonte de saldos
				</h1>
				<p className="text-(length:--text-size-body) text-[var(--color-text-muted)] leading-6">
					Saldo previsto no fim de cada mês
				</p>
			</div>

			{horizon.isError ? (
				<div className="flex flex-1 items-center justify-center pb-24">
					<div className="empty empty--problem">
						<span className="empty__icon">
							<WarningCircleIcon size={28} aria-hidden />
						</span>
						<h2 className="empty__title">Não deu pra carregar</h2>
						<p className="empty__text">
							Seus dados estão salvos. Foi a conexão com o arvo que falhou
							agora.
						</p>
						<button
							type="button"
							className="btn-secondary empty__action"
							onClick={() => horizon.refetch()}
						>
							Tentar de novo
						</button>
					</div>
				</div>
			) : !data ? (
				<div
					className="flex flex-col gap-4 px-5"
					role="status"
					aria-busy="true"
					aria-label="Carregando"
				>
					<div className="skel !rounded-[var(--radius-md)] h-[196px] w-full" />
					<div className="skel h-3 w-full" />
					<div className="skel h-3 w-[220px]" />
				</div>
			) : data.upcoming.length === 0 ? (
				<div className="flex flex-1 items-center justify-center pb-24">
					<div className="empty">
						<span className="empty__icon">
							<ChartLineUpIcon size={28} aria-hidden />
						</span>
						<h2 className="empty__title">Nada agendado ainda</h2>
						<p className="empty__text">
							Marque “Repetir todo mês” nas contas fixas e o horizonte se monta
							sozinho.
						</p>
						<button
							type="button"
							className="btn-secondary empty__action"
							onClick={() => register.open("EXPENSE")}
						>
							Registrar conta fixa
						</button>
					</div>
				</div>
			) : (
				<HorizonBody data={data} />
			)}
		</div>
	);
}

type HorizonData = inferRouterOutputs<AppRouter>["summary"]["horizon"];

function HorizonBody({ data }: { data: HorizonData }) {
	const points = chartPoints(data.balanceCents, data.points, data.minimumCents);
	const warning = negativeWarning(points, data.upcoming);
	const months = upcomingByMonth(data.upcoming, data.today);

	return (
		<>
			<div className="px-5">
				<HorizonChart points={points} minimumCents={data.minimumCents} />
				<p className="text-(length:--text-size-small) mt-4 mb-6 text-[var(--color-text-muted)] leading-5">
					{warning ?? CAPTION}
				</p>
			</div>

			<section className="sheet" aria-label="O que vem">
				<div className="sheet__head">
					<h2 className="sheet__title">O que vem</h2>
				</div>
				{months.map((group) => (
					<div key={group.month}>
						<div className="day-header">
							<span className="day-header__label">
								{monthName(`${group.month}`)}
							</span>
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
												row.signedCents > 0 &&
													"text-[var(--color-income-text)]",
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
			</section>
		</>
	);
}
