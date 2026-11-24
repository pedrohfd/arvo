import {
	CaretLeftIcon,
	CheckIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { CategoryIcon } from "@/components/category-icon";
import { MarkPaidSheet } from "@/components/transaction/transaction-sheets";
import { formatMoney, moneyParts } from "@/lib/format";
import { billSub, personHeader, receivableSummary } from "@/lib/receivable";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/receber")({
	component: Receber,
});

// Tela 3.4 do Figma (página "Arvo · 3 Transação"): quem ainda te deve, por pessoa, e de qual conta.
// Tocar na bolinha abre "Fulano pagou?" (a mesma folha do detalhe). Tem o normal e o "Tudo
// acertado"; carregando e não carregou seguem o padrão das outras telas (sem quadro próprio).
function Receber() {
	const pending = useQuery(trpc.split.pending.queryOptions());
	const data = pending.data;
	const [paying, setPaying] = useState<{
		split: { id: string; amountCents: number; person: { name: string } };
		tx: {
			title: string | null;
			category: { name: string };
			date: string;
		};
	} | null>(null);

	const total = moneyParts(data?.totalCents ?? 0);

	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			<div className="flex h-12 items-center px-2 pt-1">
				<Link to="/inicio" className="icon-btn" aria-label="Voltar">
					<CaretLeftIcon size={22} aria-hidden />
				</Link>
			</div>

			<div className="flex shrink-0 flex-col gap-1 px-5 pt-4 pb-6">
				<h1 className="display text-(length:--text-size-title) font-medium leading-(--text-leading-title)">
					A receber
				</h1>
				{data ? (
					<>
						<span className="balance__value">
							{total.integer}
							<span className="balance__cents text-[22px] leading-7">
								{total.cents}
							</span>
						</span>
						<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-5">
							{data.people.length === 0
								? "Ninguém te deve nada agora"
								: receivableSummary(data.people.length, data.billCount)}
						</p>
					</>
				) : null}
			</div>

			{pending.isError ? (
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
							onClick={() => pending.refetch()}
						>
							Tentar de novo
						</button>
					</div>
				</div>
			) : !data ? (
				<section
					className="sheet"
					role="status"
					aria-busy="true"
					aria-label="Carregando"
				>
					{[0, 1, 2].map((i) => (
						<div key={i} className="tx-row">
							<div className="skel !rounded-md size-11" />
							<div className="flex flex-1 flex-col gap-2">
								<div className="skel h-3 w-[140px]" />
								<div className="skel h-3 w-[90px]" />
							</div>
						</div>
					))}
				</section>
			) : data.people.length === 0 ? (
				<div className="flex flex-1 items-center justify-center pb-24">
					<div className="empty">
						<span className="empty__icon">
							<CheckIcon size={28} aria-hidden />
						</span>
						<h2 className="empty__title">Tudo acertado</h2>
						<p className="empty__text">
							Quando você dividir uma conta, quem ainda não pagou aparece aqui.
						</p>
					</div>
				</div>
			) : (
				<section className="sheet" aria-label="Quem te deve">
					{data.people.map((person) => (
						<div key={person.personId}>
							<div className="day-header">
								<span className="day-header__label">
									{personHeader(person.name, person.items.length)}
								</span>
								<span className="day-header__total">
									{formatMoney(person.totalCents)}
								</span>
							</div>
							<div className="tx-list">
								{person.items.map((item) => {
									const name = item.title || item.categoryName;
									return (
										<div key={item.splitId} className="tx-row">
											<Link
												to="/transacao/$transactionId"
												params={{ transactionId: item.transactionId }}
												className="flex min-w-0 flex-1 items-center gap-3"
											>
												<span className="tx-row__icon">
													<CategoryIcon name={item.categoryIcon} />
												</span>
												<span className="tx-row__text">
													<span className="tx-row__title">{name}</span>
													<span className="tx-row__sub">
														{billSub(item.categoryName, item.date)}
													</span>
												</span>
												<span className="tx-row__value">
													{formatMoney(item.amountCents)}
												</span>
											</Link>
											<button
												type="button"
												className="person-row__check"
												aria-label={`${person.name} pagou ${formatMoney(item.amountCents)} de ${name}. Marcar como pago`}
												onClick={() =>
													setPaying({
														split: {
															id: item.splitId,
															amountCents: item.amountCents,
															person: { name: person.name },
														},
														tx: {
															title: item.title,
															category: { name: item.categoryName },
															date: item.date,
														},
													})
												}
											>
												<span className="ring" />
											</button>
										</div>
									);
								})}
							</div>
						</div>
					))}
				</section>
			)}

			{paying ? (
				<MarkPaidSheet
					tx={paying.tx}
					split={paying.split}
					onClose={() => setPaying(null)}
				/>
			) : null}
		</div>
	);
}
