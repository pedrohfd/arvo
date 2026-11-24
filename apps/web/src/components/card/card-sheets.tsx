import { cn } from "@arvo/ui/lib/utils";
import { TrashIcon, XIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Grabber, useEscape } from "@/components/register/parts";
import { formatMoney, formatShortDate } from "@/lib/format";
import { queryClient, trpc } from "@/utils/trpc";

// Folha curta de baixo para cima: o título entre o X e um espaço do mesmo tamanho.
export function Sheet({
	title,
	titleAlign = "center",
	onClose,
	children,
}: {
	title: string;
	/** "start": o título logo depois do X, como na 2.3 "Dividir com". */
	titleAlign?: "center" | "start";
	onClose: () => void;
	children: ReactNode;
}) {
	const dialogRef = useRef<HTMLDivElement>(null);
	useEscape(onClose);

	// Segura a rolagem da tela de trás e leva o foco para a folha.
	useEffect(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		dialogRef.current?.focus();
		return () => {
			document.body.style.overflow = previous;
		};
	}, []);

	return (
		<div className="fixed inset-0 z-[60] flex items-end justify-center bg-[var(--color-overlay)]">
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label={title}
				tabIndex={-1}
				className="flex max-h-[calc(100svh-56px)] w-full max-w-[480px] flex-col rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-strong)] outline-none"
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
					<h2
						className={cn(
							"text-(length:--text-size-headline) min-w-0 flex-1 truncate font-semibold leading-[var(--text-leading-headline)]",
							titleAlign === "center" && "text-center",
						)}
					>
						{title}
					</h2>
					{titleAlign === "center" ? (
						<span className="size-11" aria-hidden />
					) : null}
				</div>
				{children}
			</div>
		</div>
	);
}

// Folha 6.2 "escolher o dia": os dias do mês numa grade; a escolha só vale em "Pronto".
export function DaySheet({
	title,
	value,
	onSelect,
	onClose,
}: {
	title: string;
	value: number | null;
	onSelect: (day: number) => void;
	onClose: () => void;
}) {
	const [draft, setDraft] = useState(value);

	return (
		<Sheet title={title} onClose={onClose}>
			<fieldset className="day-grid m-0 min-w-0 border-0 px-5 pt-2 pb-4">
				<legend className="sr-only">{title}</legend>
				{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
					<button
						key={day}
						type="button"
						aria-pressed={draft === day}
						className={cn("day-opt", draft === day && "is-selected")}
						onClick={() => setDraft(day)}
					>
						{day}
					</button>
				))}
			</fieldset>
			<div className="shrink-0 px-5 pt-3 pb-6">
				<button
					type="button"
					className="btn-primary btn-primary--block"
					disabled={draft === null}
					onClick={() => draft !== null && onSelect(draft)}
				>
					Pronto
				</button>
			</div>
		</Sheet>
	);
}

type DeletableCard = {
	id: string;
	name: string;
	openInvoice: { dueDate: string; totalCents: number } | null;
};

// Folhas 6.2 "Apagar cartão": com fatura aberta só explica ("Entendi"); sem ela confirma. As
// compras ficam na lista, só sem cartão.
export function CardDeleteSheet({
	card,
	onDeleted,
	onClose,
}: {
	card: DeletableCard;
	onDeleted: () => void;
	onClose: () => void;
}) {
	const remove = useMutation(
		trpc.card.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(trpc.card.pathFilter());
				toast.success(`${card.name} apagado`);
				onDeleted();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (card.openInvoice) {
		return (
			<Sheet title="Não dá para apagar agora" onClose={onClose}>
				<p className="text-(length:--text-size-body) px-5 pt-2 pb-4 text-[var(--color-text-muted)] leading-6">
					O {card.name} tem uma fatura aberta de{" "}
					<b className="font-semibold text-[var(--color-text)]">
						{formatMoney(card.openInvoice.totalCents)}
					</b>
					, que vence em {formatShortDate(card.openInvoice.dueDate)}. Depois do
					vencimento você pode apagar o cartão.
				</p>
				<div className="px-5 pt-3 pb-6">
					<button
						type="button"
						className="btn-primary btn-primary--block"
						onClick={onClose}
					>
						Entendi
					</button>
				</div>
			</Sheet>
		);
	}

	return (
		<Sheet title={`Apagar o ${card.name}?`} onClose={onClose}>
			<p className="text-(length:--text-size-body) px-5 pt-2 pb-4 text-[var(--color-text-muted)] leading-6">
				As transações feitas com este cartão continuam na lista, mas ficam sem
				cartão. Você pode cadastrá-lo de novo quando quiser.
			</p>
			<div className="px-5 pt-3 pb-6">
				<button
					type="button"
					className="btn-secondary btn-secondary--lg btn-secondary--danger btn-secondary--block"
					disabled={remove.isPending}
					onClick={() => remove.mutate({ id: card.id })}
				>
					<TrashIcon size={18} aria-hidden />
					Apagar cartão
				</button>
			</div>
		</Sheet>
	);
}
