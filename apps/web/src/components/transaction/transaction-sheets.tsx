import { cn } from "@arvo/ui/lib/utils";
import { TrashIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/card/card-sheets";
import {
	type Deleted,
	refreshMoney,
} from "@/components/register/register-provider";
import { formatMoney, formatShortDate, moneyParts } from "@/lib/format";
import {
	asksScope,
	type DeleteScope,
	type DetailTransaction,
	deleteText,
	scopeSheet,
	txName,
} from "@/lib/transaction-detail";
import { trpc } from "@/utils/trpc";

type Split = DetailTransaction["splits"][number] & {
	id: string;
	person: { id: string; name: string };
};

function SheetText({ children }: { children: string }) {
	return (
		<p className="text-(length:--text-size-body) px-5 pt-2 pb-4 text-[var(--color-text-muted)] leading-6">
			{children}
		</p>
	);
}

function Pending({ label }: { label: string }) {
	return <span className="spinner" role="status" aria-label={label} />;
}

// 3.1 "marcar pago": quem pagou a parte e se o dinheiro entrou na conta (cria a entrada de
// Reembolso; desligado = pagou em dinheiro, sem entrada).
export function MarkPaidSheet({
	tx,
	split,
	onClose,
}: {
	tx: Pick<DetailTransaction, "title" | "category" | "date">;
	split: { id: string; amountCents: number; person: { name: string } };
	onClose: () => void;
}) {
	const [reimburse, setReimburse] = useState(true);
	const amount = moneyParts(split.amountCents);
	const mark = useMutation(
		trpc.split.markPaid.mutationOptions({
			onSuccess: () => {
				refreshMoney();
				onClose();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<Sheet title={`${split.person.name} pagou?`} onClose={onClose}>
			<div className="flex flex-col gap-2 px-5 pt-2">
				<p className="display num text-[40px] text-[var(--color-income-text)] leading-[48px]">
					+ {amount.integer}
					<span className="text-[0.5em] opacity-70">{amount.cents}</span>
				</p>
				<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
					A parte de {split.person.name} em “{txName(tx)}”, de{" "}
					{formatShortDate(tx.date)}.
				</p>
			</div>
			<div className="switch-row px-5 pt-2">
				<div className="switch-row__text">
					<span className="switch-row__title" id="reimburse-title">
						Entrou na sua conta
					</span>
					<span className="switch-row__desc">
						{reimburse
							? `Cria uma entrada de ${formatMoney(split.amountCents)} no saldo`
							: "Pagou em dinheiro, sem entrada no saldo"}
					</span>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={reimburse}
					aria-labelledby="reimburse-title"
					className="switch"
					onClick={() => setReimburse((value) => !value)}
				/>
			</div>
			<div className="px-5 pt-3 pb-6">
				<button
					type="button"
					className={cn(
						"btn-primary btn-primary--block",
						mark.isPending && "is-loading",
					)}
					disabled={mark.isPending}
					onClick={() =>
						mark.mutate({
							splitId: split.id,
							createReimbursement: reimburse,
						})
					}
				>
					<span>Marcar como pago</span>
					{mark.isPending ? <Pending label="Salvando" /> : null}
				</button>
			</div>
		</Sheet>
	);
}

// 3.1 "desmarcar pago": a pessoa volta a dever e a entrada de Reembolso, se houve, sai do saldo.
export function UnmarkPaidSheet({
	split,
	today,
	onClose,
}: {
	split: Split;
	today: string;
	onClose: () => void;
}) {
	const unmark = useMutation(
		trpc.split.unmarkPaid.mutationOptions({
			onSuccess: () => {
				refreshMoney();
				onClose();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const when =
		split.paidAt === today
			? "de hoje"
			: `de ${formatShortDate(split.paidAt ?? today)}`;
	const text = split.reimbursed
		? `${split.person.name} volta para “ainda não pagou”, e a entrada de ${formatMoney(split.amountCents)} ${when} sai do saldo.`
		: `${split.person.name} volta para “ainda não pagou”.`;

	return (
		<Sheet title="Desfazer pagamento?" onClose={onClose}>
			<SheetText>{text}</SheetText>
			<div className="px-5 pt-3 pb-6">
				<button
					type="button"
					className="btn-secondary btn-secondary--lg btn-secondary--danger btn-secondary--block"
					disabled={unmark.isPending}
					onClick={() => unmark.mutate({ splitId: split.id })}
				>
					<span>Desfazer pagamento</span>
					{unmark.isPending ? <Pending label="Desfazendo" /> : null}
				</button>
			</div>
		</Sheet>
	);
}

// 3.3 apagar. Série com ocorrências depois desta pergunta "Só esta" ou "Esta e as próximas".
export function DeleteSheet({
	tx,
	onClose,
	onDeleted,
}: {
	tx: DetailTransaction & { id: string };
	onClose: () => void;
	onDeleted: (deleted: Deleted) => void;
}) {
	const [scope, setScope] = useState<DeleteScope>("ONLY_THIS");
	const remove = useMutation(
		trpc.transaction.delete.mutationOptions({
			onSuccess: (result) => {
				refreshMoney();
				onDeleted({
					kind: tx.kind,
					amountCents: tx.amountCents,
					deleted: result.deleted,
					snapshot: result.snapshot,
				});
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const income = tx.kind === "INCOME";

	if (asksScope(tx)) {
		const sheet = scopeSheet(tx);
		return (
			<Sheet title={sheet.title} onClose={onClose}>
				<div className="px-5 pt-2 pb-2">
					{(["ONLY_THIS", "THIS_AND_NEXT"] as const).map((value) => {
						const option = value === "ONLY_THIS" ? sheet.only : sheet.next;
						return (
							<button
								key={value}
								type="button"
								aria-pressed={scope === value}
								className={cn(
									"option-card",
									scope === value &&
										"is-selected shadow-[inset_0_0_0_1px_var(--color-focus)]",
								)}
								onClick={() => setScope(value)}
							>
								<span className="option-card__text">
									<span className="option-card__title">{option.title}</span>
									<span className="option-card__desc">{option.desc}</span>
								</span>
							</button>
						);
					})}
				</div>
				<div className="px-5 pt-3 pb-6">
					<button
						type="button"
						className="btn-secondary btn-secondary--lg btn-secondary--danger btn-secondary--block"
						disabled={remove.isPending}
						onClick={() => remove.mutate({ id: tx.id, scope })}
					>
						<span>{sheet.button(scope)}</span>
						{remove.isPending ? <Pending label="Apagando" /> : null}
					</button>
				</div>
			</Sheet>
		);
	}

	return (
		<Sheet
			title={income ? "Apagar esta entrada?" : "Apagar esta saída?"}
			onClose={onClose}
		>
			<SheetText>{deleteText(tx)}</SheetText>
			<div className="px-5 pt-3 pb-6">
				<button
					type="button"
					className="btn-secondary btn-secondary--lg btn-secondary--danger btn-secondary--block"
					disabled={remove.isPending}
					onClick={() => remove.mutate({ id: tx.id })}
				>
					<TrashIcon size={18} aria-hidden />
					<span>{income ? "Apagar entrada" : "Apagar saída"}</span>
					{remove.isPending ? <Pending label="Apagando" /> : null}
				</button>
			</div>
		</Sheet>
	);
}
