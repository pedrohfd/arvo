import type { AppRouter } from "@arvo/api/routers/index";
import {
	CaretLeftIcon,
	CreditCardIcon,
	PlusIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";

import {
	CardFormSheet,
	type EditableCard,
} from "@/components/card/card-form-sheet";
import { CardDeleteSheet } from "@/components/card/card-sheets";
import { SwipeRow } from "@/components/card/swipe-row";
import { formatMoney, formatShortDate } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/perfil/cartoes")({
	component: Cartoes,
});

type Card = inferRouterOutputs<AppRouter>["card"]["list"][number];

// Tela 6.2 do Figma (página "Arvo · 6 Perfil"): lista com a fatura aberta e o melhor dia de
// compra, "Novo cartão" e "Apagar cartão". Deslizar o cartão para a direita abre o editar; para a
// esquerda, apagar (com confirmação).
function Cartoes() {
	const cards = useQuery(trpc.card.list.queryOptions());
	// Folha aberta: o formulário (novo, ou editar se vier o cartão) ou a confirmação de apagar.
	const [sheet, setSheet] = useState<
		| { kind: "form"; card?: EditableCard }
		| { kind: "delete"; card: EditableCard }
		| null
	>(null);

	const onNew = () => setSheet({ kind: "form" });

	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			<div className="flex h-12 items-center pt-1 pr-3 pl-2">
				<Link to="/perfil" className="icon-btn" aria-label="Voltar">
					<CaretLeftIcon size={22} aria-hidden />
				</Link>
			</div>

			{cards.isError ? (
				<>
					<Title />
					<Problem onRetry={() => cards.refetch()} />
				</>
			) : !cards.data ? (
				<>
					<Title />
					<Loading />
				</>
			) : cards.data.length === 0 ? (
				<>
					<Title />
					<Empty onNew={onNew} />
				</>
			) : (
				<>
					<Title onNew={onNew} />
					<p className="text-(length:--text-size-small) px-5 pt-2 pb-4 text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
						Para saber em qual cartão foi cada compra e quando a fatura vence.
					</p>
					<section
						className="flex flex-col gap-2 px-5 pb-32"
						aria-label="Seus cartões"
					>
						{cards.data.map((card) => (
							<CardItem
								key={card.id}
								card={card}
								onEdit={() => setSheet({ kind: "form", card })}
								onDelete={() => setSheet({ kind: "delete", card })}
							/>
						))}
					</section>
				</>
			)}

			{sheet?.kind === "form" ? (
				<CardFormSheet card={sheet.card} onClose={() => setSheet(null)} />
			) : null}
			{sheet?.kind === "delete" ? (
				<CardDeleteSheet
					card={sheet.card}
					onDeleted={() => setSheet(null)}
					onClose={() => setSheet(null)}
				/>
			) : null}
		</div>
	);
}

function Title({ onNew }: { onNew?: () => void }) {
	return (
		<div className="flex h-10 items-center justify-between px-5">
			<h1 className="display text-(length:--text-size-display) leading-[var(--text-leading-display)]">
				Meus cartões
			</h1>
			{onNew ? (
				<button
					type="button"
					className="month-btn !h-10 !px-4 !gap-2 font-semibold text-[var(--color-text)]"
					onClick={onNew}
				>
					<PlusIcon size={18} aria-hidden />
					Adicionar
				</button>
			) : null}
		</div>
	);
}

// Cartão: nome, final e tipo; no crédito, a fatura aberta e os dias de fechamento e de compra.
function CardItem({
	card,
	onEdit,
	onDelete,
}: {
	card: Card;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const credit = card.type === "CREDIT";
	return (
		<SwipeRow
			hint={`Seta para a direita edita o ${card.name}; seta para a esquerda apaga.`}
			onSwipeRight={onEdit}
			onSwipeLeft={onDelete}
		>
			<span className="wallet-card__top">
				<span className="setting-row__icon">
					<CreditCardIcon size={24} aria-hidden />
				</span>
				<span className="wallet-card__name">{card.name}</span>
				{card.last4 ? (
					<span className="wallet-card__last4">•••• {card.last4}</span>
				) : null}
				<span className="badge">{credit ? "Crédito" : "Débito"}</span>
			</span>
			{credit ? (
				<>
					{card.openInvoice ? (
						<span className="wallet-card__bill">
							<span className="wallet-card__bill-label">
								Fatura atual · vence {formatShortDate(card.openInvoice.dueDate)}
							</span>
							<span className="wallet-card__bill-value">
								{formatMoney(card.openInvoice.totalCents)}
							</span>
						</span>
					) : null}
					<span className="wallet-card__line">
						Fecha dia {card.closingDay} ·{" "}
						<b>Melhor dia de compra: dia {card.bestDay}</b>
					</span>
				</>
			) : null}
		</SwipeRow>
	);
}

// Nenhum cartão ainda.
function Empty({ onNew }: { onNew: () => void }) {
	return (
		<div className="flex flex-1 items-center justify-center pb-24">
			<div className="empty">
				<span className="empty__icon">
					<CreditCardIcon size={28} aria-hidden />
				</span>
				<h2 className="empty__title">Nenhum cartão ainda</h2>
				<p className="empty__text max-w-[340px] [text-wrap:wrap]">
					Cadastre um cartão para saber em qual foi cada compra, quando a fatura
					vence e o melhor dia de compra.
				</p>
				<button
					type="button"
					className="btn-secondary empty__action"
					onClick={onNew}
				>
					<PlusIcon size={18} aria-hidden />
					Adicionar cartão
				</button>
			</div>
		</div>
	);
}

// Carregando, com o mesmo desenho da lista.
function Loading() {
	return (
		<div
			className="flex flex-col gap-2 px-5 pt-14"
			role="status"
			aria-busy="true"
			aria-label="Carregando"
		>
			{[0, 1].map((i) => (
				<div
					key={i}
					className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4"
				>
					<div className="flex items-center gap-3">
						<div className="skel !rounded-full size-9" />
						<div className="skel h-3 w-[120px]" />
					</div>
					<div className="skel h-2.5 w-[200px]" />
				</div>
			))}
		</div>
	);
}

// Não carregou.
function Problem({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex flex-1 items-center justify-center pb-24">
			<div className="empty empty--problem">
				<span className="empty__icon">
					<WarningCircleIcon size={28} aria-hidden />
				</span>
				<h2 className="empty__title">Não deu pra carregar</h2>
				<p className="empty__text">
					Seus dados estão salvos. Foi a conexão com o arvo que falhou agora.
				</p>
				<button
					type="button"
					className="btn-secondary empty__action"
					onClick={onRetry}
				>
					Tentar de novo
				</button>
			</div>
		</div>
	);
}
