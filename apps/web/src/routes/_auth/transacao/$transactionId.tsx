import { cn } from "@arvo/ui/lib/utils";
import {
	ArrowsClockwiseIcon,
	CaretLeftIcon,
	TrashIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CategoryIcon } from "@/components/category-icon";
import { useOutbox } from "@/components/offline/outbox-provider";
import { useRegister } from "@/components/register/register-provider";
import {
	Row,
	TransactionDetail,
} from "@/components/transaction/transaction-detail";
import { moneyParts } from "@/lib/format";
import { dateLabel } from "@/lib/transaction-detail";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/transacao/$transactionId")({
	component: TransacaoDetalhe,
});

// Tela 3.1 do Figma (página "Arvo · 3 Transação"): simples, dividida, tudo acertado, entrada,
// parcela, data futura, apagada em outro aparelho e não foi salvo (um registro da fila offline,
// com id `local-...`); marcar e desmarcar pago; 3.2 editar; 3.3 apagar.
function TransacaoDetalhe() {
	const { transactionId } = Route.useParams();
	const navigate = useNavigate();
	const register = useRegister();
	// Depois de apagar aqui, a tela some sem passar pelo "apagada em outro aparelho".
	const [gone, setGone] = useState(false);
	// "local-<id>": um registro que ainda está na fila offline e não tem transação no servidor.
	const local = transactionId.startsWith("local-");
	const tx = useQuery({
		...trpc.transaction.get.queryOptions({ id: transactionId }),
		enabled: !gone && !local,
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
			{gone ? null : local ? (
				<LocalDetail id={transactionId.slice("local-".length)} />
			) : notFound ? (
				<Deleted />
			) : tx.isError ? (
				<Problem onRetry={() => tx.refetch()} />
			) : !tx.data ? (
				<Loading />
			) : (
				<TransactionDetail
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

// 3.1 "não foi salvo": um registro da fila offline. Recusado pelo servidor mostra o motivo e "Tentar
// de novo"; esperando ou sendo enviado só deixa apagar. Quando o envio dá certo o item sai da fila
// e a tela volta para a Início.
function LocalDetail({ id }: { id: string }) {
	const outbox = useOutbox();
	const navigate = useNavigate();
	const item = outbox.items.find((entry) => entry.id === id);
	useEffect(() => {
		if (!item) navigate({ to: "/inicio" });
	}, [item, navigate]);
	if (!item) return null;

	const { display } = item;
	const income = display.kind === "INCOME";
	const amount = moneyParts(item.input.amountCents);
	const failed = item.status === "failed";
	const name = display.title || display.categoryName;
	const first = display.rows[0];

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
					<CategoryIcon name={display.categoryIcon} size={26} />
				</span>
				<h1 className="sheet__title pt-3">{name}</h1>
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
				<span className={cn("badge mt-2", failed && "badge--problem")}>
					{failed ? (
						<WarningCircleIcon size={14} className="icon" aria-hidden />
					) : null}
					{failed
						? "Não foi salvo"
						: item.status === "sending"
							? "Salvando…"
							: "Na fila para enviar"}
				</span>
			</section>

			<section className="sheet !px-5" aria-label="Detalhes">
				<div className="detail-list">
					<Row label="Categoria">
						<CategoryIcon name={display.categoryIcon} size={18} />
						{display.categoryName}
					</Row>
					{first ? (
						<Row label="Data">
							{dateLabel({ date: first.date, time: null, today: first.date })}
						</Row>
					) : null}
					<Row label={income ? "Recebimento" : "Pagamento"}>
						{display.methodLabel}
					</Row>
					{failed && item.error ? <Row label="Motivo">{item.error}</Row> : null}
				</div>
			</section>

			<div className="footer-float">
				<div className="flex w-full max-w-[640px] items-start gap-3 px-2">
					{failed ? (
						<button
							type="button"
							className="btn-secondary flex-1"
							onClick={() => outbox.retry(item.id)}
						>
							<ArrowsClockwiseIcon size={18} aria-hidden />
							Tentar de novo
						</button>
					) : null}
					<button
						type="button"
						className="btn-secondary btn-secondary--danger flex-1"
						onClick={() => outbox.discard(item.id)}
					>
						<TrashIcon size={18} aria-hidden />
						Apagar
					</button>
				</div>
			</div>
		</>
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
