import { cn } from "@arvo/ui/lib/utils";
import { TrashIcon, XIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/category-icon";
import { Chip, Grabber, useEscape } from "@/components/register/parts";
import type { CategoryKind } from "@/lib/category-form";
import { queryClient, trpc } from "@/utils/trpc";

type Category = {
	id: string;
	name: string;
	icon: string;
	kind: CategoryKind;
	transactionCount: number;
};

// Folha 6.3 "Apagar categoria": se há transações, pergunta para qual outra categoria (do mesmo
// tipo) elas vão; sem transações só confirma.
export function CategoryDeleteSheet({
	category,
	categories,
	onClose,
}: {
	category: Category;
	/** Todas as categorias: o destino sai das do mesmo tipo, menos esta. */
	categories: readonly Category[];
	onClose: () => void;
}) {
	const dialogRef = useRef<HTMLDivElement>(null);
	useEscape(onClose);

	const targets = categories.filter(
		(other) => other.kind === category.kind && other.id !== category.id,
	);
	const inUse = category.transactionCount > 0;
	// Sem escolha do usuário vale a primeira, como no Figma (Mercado já vem marcada).
	const [target, setTarget] = useState(targets[0]?.id ?? null);

	const remove = useMutation(
		trpc.category.delete.mutationOptions({
			onSuccess: () => {
				// Mexe na lista de categorias e nas transações que mudaram de categoria.
				queryClient.invalidateQueries(trpc.category.pathFilter());
				queryClient.invalidateQueries(trpc.transaction.pathFilter());
				queryClient.invalidateQueries(trpc.summary.pathFilter());
				toast.success(`${category.name} apagada`);
				onClose();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	// Segura a rolagem da tela de trás e leva o foco para a folha.
	useEffect(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		dialogRef.current?.focus();
		return () => {
			document.body.style.overflow = previous;
		};
	}, []);

	const count = category.transactionCount;
	const canConfirm = !inUse || target !== null;

	return (
		<div className="fixed inset-0 z-[70] flex items-end justify-center bg-[var(--color-overlay)]">
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label={`Apagar ${category.name}?`}
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
					<h2 className="text-(length:--text-size-headline) min-w-0 flex-1 truncate text-center font-semibold leading-[var(--text-leading-headline)]">
						Apagar {category.name}?
					</h2>
					<span className="size-11" aria-hidden />
				</div>

				<div className="flex flex-col gap-4 overflow-y-auto px-5 pt-2 pb-4">
					<p className="text-(length:--text-size-body) text-[var(--color-text-muted)] leading-6">
						{inUse
							? `${count === 1 ? "1 transação usa" : `${count} transações usam`} esta categoria. Para onde ${count === 1 ? "ela vai" : "elas vão"}?`
							: "Nenhuma transação usa esta categoria."}
					</p>
					{inUse ? (
						<div className="choices">
							{targets.map((other) => (
								<Chip
									key={other.id}
									selected={other.id === target}
									onClick={() => setTarget(other.id)}
									icon={<CategoryIcon name={other.icon} size={18} />}
								>
									{other.name}
								</Chip>
							))}
						</div>
					) : null}
				</div>

				<div className="shrink-0 px-5 pt-3 pb-6">
					<button
						type="button"
						className={cn(
							"btn-secondary btn-secondary--lg btn-secondary--danger btn-secondary--block",
						)}
						disabled={!canConfirm || remove.isPending}
						onClick={() =>
							remove.mutate({
								id: category.id,
								moveToCategoryId: inUse ? (target ?? undefined) : undefined,
							})
						}
					>
						<TrashIcon size={18} aria-hidden />
						{inUse ? "Mover e apagar" : "Apagar categoria"}
					</button>
				</div>
			</div>
		</div>
	);
}
