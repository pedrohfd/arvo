import type { AppRouter } from "@arvo/api/routers/index";
import { cn } from "@arvo/ui/lib/utils";
import {
	CaretLeftIcon,
	CheckCircleIcon,
	PencilSimpleIcon,
	TrashIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/category-icon";
import {
	refreshMoney,
	useRegister,
} from "@/components/register/register-provider";
import {
	type EditingTransaction,
	RegisterSheet,
} from "@/components/register/register-sheet";
import {
	DeleteSheet,
	MarkPaidSheet,
	UnmarkPaidSheet,
} from "@/components/transaction/transaction-sheets";
import { formatMoney, formatShortDate, moneyParts } from "@/lib/format";
import { initials } from "@/lib/split-with";
import {
	asksScope,
	badgeFor,
	dateLabel,
	editScopeSheet,
	paidLabel,
	paymentLabel,
	repeatLabel,
	txName,
	yourShare,
} from "@/lib/transaction-detail";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/transacao/$transactionId")({
	component: TransacaoDetalhe,
});

type Tx = inferRouterOutputs<AppRouter>["transaction"]["get"];
type Split = Tx["splits"][number];

// O que a 3.2 Editar recebe: o registro como está agora.
function editingFrom(tx: Tx): EditingTransaction {
	return {
		id: tx.id,
		flow: tx.kind,
		amountCents: tx.amountCents,
		title: tx.title,
		categoryId: tx.category.id,
		date: tx.date,
		payment:
			tx.paymentMethod === "CARD" && tx.cardId
				? { kind: "card", cardId: tx.cardId }
				: { kind: tx.paymentMethod === "CARD" ? "PIX" : tx.paymentMethod },
		lockAmount: tx.splits.length > 0,
		installment: tx.series?.kind === "INSTALLMENT",
		scopeSheet: asksScope(tx) ? editScopeSheet(tx) : null,
	};
}

// Tela 3.1 do Figma (página "Arvo · 3 Transação"): simples, dividida, tudo acertado, entrada,
// parcela, data futura e apagada em outro aparelho; marcar e desmarcar pago; 3.2 editar; 3.3
// apagar. Ainda não existe "não salvou" (depende da fila offline).
function TransacaoDetalhe() {
	const { transactionId } = Route.useParams();
	const navigate = useNavigate();
	const register = useRegister();
	// Depois de apagar aqui, a tela some sem passar pelo "apagada em outro aparelho".
	const [gone, setGone] = useState(false);
	const tx = useQuery({
		...trpc.transaction.get.queryOptions({ id: transactionId }),
		enabled: !gone,
		retry: (count, error) => error.data?.code !== "NOT_FOUND" && count < 2,
	});

	const notFound = tx.error?.data?.code === "NOT_FOUND";

	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			{notFound ? null : (
				<div className="flex h-12 items-center px-2 pt-1">
					<Link to="/inicio" className="icon-btn" aria-label="Voltar">
						<CaretLeftIcon size={22} aria-hidden />
					</Link>
				</div>
			)}
			{gone ? null : notFound ? (
				<Deleted />
			) : tx.isError ? (
				<Problem onRetry={() => tx.refetch()} />
			) : !tx.data ? (
				<Loading />
			) : (
				<Ready
					tx={tx.data}
					onDeleted={(deleted) => {
						setGone(true);
						navigate({ to: "/inicio" });
						register.deleted(deleted);
					}}
				/>
			)}
		</div>
	);
}

type Sheet =
	| { type: "delete" }
	| { type: "edit" }
	| { type: "mark"; split: Split }
	| { type: "unmark"; split: Split };

function Ready({
	tx,
	onDeleted,
}: {
	tx: Tx;
	onDeleted: Parameters<typeof DeleteSheet>[0]["onDeleted"];
}) {
	const [sheet, setSheet] = useState<Sheet | null>(null);
	const income = tx.kind === "INCOME";
	const amount = moneyParts(tx.amountCents);
	const badge = badgeFor(tx);
	const repeat = repeatLabel(tx);
	const close = () => setSheet(null);

	return (
		<>
			<section className="flex flex-col items-start gap-2 px-5 pt-4 pb-6">
				<span
					className={cn(
						"tx-row__icon !size-[52px]",
						income &&
							"!bg-[var(--color-income-bg)] !text-[var(--color-income)]",
					)}
				>
					<CategoryIcon name={tx.category.icon} size={26} />
				</span>
				<h1 className="sheet__title pt-3">{txName(tx)}</h1>
				<p
					className={cn(
						"balance__value",
						income && "!text-[var(--color-income-text)]",
					)}
				>
					<span className="sr-only">
						{income ? "Entrada de " : "Saída de "}
					</span>
					<span aria-hidden>{income ? "+ " : "− "}</span>
					{amount.integer}
					<span
						className={cn(
							"balance__cents",
							income && "!text-current opacity-70",
						)}
					>
						{amount.cents}
					</span>
				</p>
				{badge ? (
					<span
						className={cn(
							"badge mt-2",
							badge.variant === "income" && "badge--income",
						)}
					>
						{badge.text}
					</span>
				) : null}
			</section>

			<section className="sheet !px-5" aria-label="Detalhes">
				<div className="detail-list">
					<Row label="Categoria">
						<CategoryIcon name={tx.category.icon} size={18} />
						{tx.category.name}
					</Row>
					<Row label="Data">{dateLabel(tx)}</Row>
					<Row label={income ? "Recebimento" : "Pagamento"}>
						{paymentLabel(tx)}
					</Row>
					{tx.dueDate ? (
						<Row label="Fatura">Vence em {formatShortDate(tx.dueDate)}</Row>
					) : null}
					{repeat ? (
						<Row label="Repete" sub={repeat.sub}>
							{repeat.value}
						</Row>
					) : null}
				</div>

				{tx.splits.length > 0 ? (
					<Division
						tx={tx}
						onToggle={(split) =>
							setSheet({ type: split.paidAt ? "unmark" : "mark", split })
						}
					/>
				) : null}
			</section>

			<div className="footer-float">
				<div className="flex w-full max-w-[640px] items-start gap-3 px-2">
					<button
						type="button"
						className="btn-secondary flex-1"
						disabled={tx.isReimbursement}
						title={
							tx.isReimbursement
								? "A entrada de reembolso não se edita"
								: undefined
						}
						onClick={() => setSheet({ type: "edit" })}
					>
						<PencilSimpleIcon size={18} aria-hidden />
						Editar
					</button>
					<button
						type="button"
						className="btn-secondary btn-secondary--danger flex-1"
						onClick={() => setSheet({ type: "delete" })}
					>
						<TrashIcon size={18} aria-hidden />
						Apagar
					</button>
				</div>
			</div>

			{sheet?.type === "edit" ? (
				<RegisterSheet
					initialFlow={tx.kind}
					editing={editingFrom(tx)}
					onClose={close}
					onRegistered={close}
					onSaved={() => {
						refreshMoney();
						toast.success("Alterações salvas");
						close();
					}}
				/>
			) : sheet?.type === "delete" ? (
				<DeleteSheet tx={tx} onClose={close} onDeleted={onDeleted} />
			) : sheet?.type === "mark" ? (
				<MarkPaidSheet tx={tx} split={sheet.split} onClose={close} />
			) : sheet?.type === "unmark" ? (
				<UnmarkPaidSheet split={sheet.split} today={tx.today} onClose={close} />
			) : null}
		</>
	);
}

function Row({
	label,
	sub,
	children,
}: {
	label: string;
	sub?: string | null;
	children: ReactNode;
}) {
	return (
		<div className="detail-row !border-b-0">
			<span className="detail-row__label">{label}</span>
			<span className="flex min-w-0 flex-col items-end text-right">
				<span className="detail-row__value">{children}</span>
				{sub ? <span className="detail-row__sub">{sub}</span> : null}
			</span>
		</div>
	);
}

// "Divisão · 3 pessoas": você (sua parte) e cada pessoa; tocar marca ou desmarca o pagamento.
function Division({
	tx,
	onToggle,
}: {
	tx: Tx;
	onToggle: (split: Split) => void;
}) {
	const people = tx.splits.length + 1;
	const mine = yourShare(tx);
	const even = tx.splits.every((split) => split.amountCents === mine);
	return (
		<div className="mt-4 flex flex-col">
			<div className="day-header !px-0">
				<span className="day-header__label">Divisão · {people} pessoas</span>
				{even ? (
					<span className="day-header__total">{formatMoney(mine)} cada</span>
				) : null}
			</div>
			<div className="person-row person-row--you !px-0">
				<span className="person-row__avatar">V</span>
				<span className="person-row__text">
					<span className="person-row__name">Você</span>
					<span className="person-row__sub">Sua parte</span>
				</span>
				<span className="person-row__amount">{formatMoney(mine)}</span>
				<span className="person-row__check" aria-hidden />
			</div>
			{tx.splits.map((split) => (
				<button
					key={split.id}
					type="button"
					className={cn("person-row !px-0", split.paidAt && "is-paid")}
					aria-label={`${split.person.name}, ${formatMoney(split.amountCents)}, ${paidLabel(split, tx.today)}. ${split.paidAt ? "Desfazer pagamento" : "Marcar como pago"}`}
					onClick={() => onToggle(split)}
				>
					<span className="person-row__avatar">
						{initials(split.person.name)}
					</span>
					<span className="person-row__text">
						<span className="person-row__name">{split.person.name}</span>
						<span className="person-row__sub">
							{paidLabel(split, tx.today)}
						</span>
					</span>
					<span className="person-row__amount">
						{formatMoney(split.amountCents)}
					</span>
					<span className="person-row__check">
						{split.paidAt ? (
							<CheckCircleIcon size={26} weight="fill" aria-hidden />
						) : (
							<span className="ring" />
						)}
					</span>
				</button>
			))}
		</div>
	);
}

// 3.1 "apagada em outro aparelho".
function Deleted() {
	return (
		<div className="flex flex-1 flex-col px-5 pt-12">
			<div className="flex flex-1 items-center justify-center">
				<div className="empty">
					<span className="empty__icon">
						<TrashIcon size={28} aria-hidden />
					</span>
					<h1 className="empty__title">Essa transação foi apagada</h1>
					<p className="empty__text">
						Ela foi apagada em outro aparelho. O saldo já foi atualizado.
					</p>
				</div>
			</div>
			<div className="pt-3 pb-6">
				<Link to="/inicio" className="btn-primary btn-primary--block">
					Voltar para a Início
				</Link>
			</div>
		</div>
	);
}

function Loading() {
	return (
		<div
			className="flex flex-1 flex-col"
			role="status"
			aria-busy="true"
			aria-label="Carregando"
		>
			<section className="flex flex-col gap-3 px-5 pt-4 pb-6">
				<div className="skel !rounded-[var(--radius-md)] size-[52px]" />
				<div className="skel mt-3 h-5 w-[180px]" />
				<div className="skel h-10 w-[210px]" />
			</section>
			<section className="sheet !px-5">
				{[0, 1, 2].map((i) => (
					<div key={i} className="flex h-12 items-center justify-between">
						<div className="skel h-2.5 w-[72px]" />
						<div className="skel h-2.5 w-[140px]" />
					</div>
				))}
			</section>
		</div>
	);
}

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
