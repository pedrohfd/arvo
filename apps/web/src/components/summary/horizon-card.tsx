import type { AppRouter } from "@arvo/api/routers/index";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";

import { HorizonChart } from "@/components/summary/horizon-chart";
import { chartPoints, negativeWarning } from "@/lib/horizon";
import { trpc } from "@/utils/trpc";

type HorizonData = inferRouterOutputs<AppRouter>["summary"]["horizon"];

const CAPTION =
	"Só conta o que já está agendado: salário, parcelas e datas futuras. Os gastos do dia a dia não entram, então a linha costuma ser otimista.";

// O Horizonte de saldos como cartão no fim do Resumo, no computador (D4.1 e D4.12). A lista "O que
// vem" fica no painel da direita.
export function HorizonCard() {
	const horizon = useQuery(trpc.summary.horizon.queryOptions());
	const data = horizon.data;

	return (
		<section
			className="flex flex-col gap-1 px-5 pt-6 pb-10"
			aria-label="Horizonte de saldos"
		>
			<div className="flex items-center justify-between">
				<h2 className="sheet__title">Horizonte de saldos</h2>
				<span className="badge">Provisório</span>
			</div>
			<p className="text-(length:--text-size-body) mb-4 text-[var(--color-text-muted)] leading-6">
				Saldo previsto no fim de cada mês
			</p>
			{horizon.isError ? (
				<p className="text-(length:--text-size-small) flex items-center gap-2 text-[var(--color-text-muted)]">
					<WarningCircleIcon size={18} aria-hidden />
					Não deu pra carregar o horizonte.{" "}
					<button
						type="button"
						className="tx-row__retry"
						onClick={() => horizon.refetch()}
					>
						Tentar de novo
					</button>
				</p>
			) : !data ? (
				<div
					className="flex flex-col gap-3"
					role="status"
					aria-busy="true"
					aria-label="Carregando"
				>
					<div className="skel !rounded-[var(--radius-md)] h-[196px] w-full" />
					<div className="skel h-3 w-full" />
				</div>
			) : data.upcoming.length === 0 ? (
				<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-5">
					Nada agendado ainda. Marque “Repetir todo mês” nas contas fixas e o
					horizonte se monta sozinho.
				</p>
			) : (
				<HorizonBody data={data} />
			)}
		</section>
	);
}

function HorizonBody({ data }: { data: HorizonData }) {
	const points = chartPoints(data.balanceCents, data.points, data.minimumCents);
	const warning = negativeWarning(points, data.upcoming);
	return (
		<>
			<HorizonChart points={points} minimumCents={data.minimumCents} />
			<p className="text-(length:--text-size-small) mt-4 text-[var(--color-text-muted)] leading-5">
				{warning ?? CAPTION}
			</p>
		</>
	);
}
