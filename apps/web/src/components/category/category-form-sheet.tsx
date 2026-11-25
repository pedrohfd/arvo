import { cn } from "@arvo/ui/lib/utils";
import { WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
	CATEGORY_ICON_CHOICES,
	CategoryIcon,
	DEFAULT_CATEGORY_ICON,
} from "@/components/category-icon";
import { Grabber } from "@/components/register/parts";
import { arrowKeys } from "@/lib/arrow-keys";
import { type CategoryKind, validateCategoryName } from "@/lib/category-form";
import { queryClient, trpc } from "@/utils/trpc";

export type EditableCategory = {
	id: string;
	name: string;
	icon: string;
	kind: CategoryKind;
};

// Folhas 6.3 do Figma: "Nova categoria" (nome, tipo e ícone) e, sem desenho próprio, "Editar
// categoria" (nome e ícone; o tipo não muda porque as transações dependem dele). Também abre a
// partir do "Mais" do Registrar, já no tipo da transação, e devolve a categoria criada.
export function CategoryFormSheet({
	category,
	initialKind = "EXPENSE",
	existing,
	onSaved,
	onClose,
}: {
	/** Sem categoria é "Nova categoria"; com categoria é "Editar categoria". */
	category?: EditableCategory;
	initialKind?: CategoryKind;
	/** Todas as categorias, para avisar de nome repetido antes de enviar. */
	existing: readonly { id: string; name: string; kind: CategoryKind }[];
	onSaved?: (saved: { id: string }) => void;
	onClose: () => void;
}) {
	const editing = category !== undefined;
	const dialogRef = useRef<HTMLDivElement>(null);

	const [name, setName] = useState(category?.name ?? "");
	const [kind, setKind] = useState<CategoryKind>(category?.kind ?? initialKind);
	const [icon, setIcon] = useState(category?.icon ?? DEFAULT_CATEGORY_ICON);
	// O erro só aparece depois de tocar no botão e sai sozinho conforme o nome é corrigido; o do
	// servidor (nome repetido que o aparelho não viu) fica até o nome mudar.
	const [submitted, setSubmitted] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);

	const localError = submitted
		? validateCategoryName({ name, kind, existing, editingId: category?.id })
		: null;
	const nameError = localError ?? serverError;

	const onSuccess = (saved: { id: string }) => {
		queryClient.invalidateQueries(trpc.category.pathFilter());
		toast.success(editing ? "Categoria atualizada" : "Categoria criada");
		onSaved?.(saved);
		onClose();
	};
	const onError = (error: { message: string }) => {
		if (error.message === "Já existe uma categoria com esse nome") {
			setServerError(`Já existe uma categoria chamada ${name.trim()}.`);
		} else {
			toast.error(error.message);
		}
	};
	const create = useMutation(
		trpc.category.create.mutationOptions({ onSuccess, onError }),
	);
	const update = useMutation(
		trpc.category.update.mutationOptions({ onSuccess, onError }),
	);
	const pending = create.isPending || update.isPending;

	function submit() {
		setSubmitted(true);
		if (
			validateCategoryName({ name, kind, existing, editingId: category?.id }) ||
			pending
		) {
			return;
		}
		if (category) update.mutate({ id: category.id, name: name.trim(), icon });
		else create.mutate({ name: name.trim(), kind, icon });
	}

	// Fecha com Esc, segura a rolagem da tela de trás e leva o foco para a folha.
	useEffect(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		dialogRef.current?.focus();
		function onKey(event: KeyboardEvent) {
			if (event.key === "Escape" && !event.defaultPrevented) onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = previous;
			window.removeEventListener("keydown", onKey);
		};
	}, [onClose]);

	const title = editing ? "Editar categoria" : "Nova categoria";

	return (
		<div className="fixed inset-0 z-[70] flex items-end justify-center bg-[var(--color-overlay)]">
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label={title}
				tabIndex={-1}
				className="relative flex max-h-[calc(100svh-56px)] w-full max-w-[480px] flex-col rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-strong)] outline-none"
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
						{title}
					</h2>
					<span className="size-11" aria-hidden />
				</div>

				<div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-4">
					<div className={cn("field", nameError && "field--error")}>
						<label className="field__label" htmlFor="category-name">
							Nome
						</label>
						<div className="field__control">
							<input
								id="category-name"
								value={name}
								maxLength={40}
								placeholder="Ex.: Presentes"
								aria-invalid={nameError ? true : undefined}
								aria-describedby={nameError ? "category-name-error" : undefined}
								onChange={(event) => {
									setName(event.target.value);
									setServerError(null);
								}}
							/>
						</div>
						{nameError ? (
							<p className="field__error" id="category-name-error" role="alert">
								<WarningCircleIcon size={16} aria-hidden />
								{nameError}
							</p>
						) : null}
					</div>

					{editing ? null : (
						<fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
							<legend className="field__label mb-2 p-0">Tipo</legend>
							<div ref={arrowKeys()} className="segmented self-start">
								<button
									type="button"
									aria-pressed={kind === "EXPENSE"}
									className={cn(
										"segmented__opt",
										kind === "EXPENSE" && "is-selected",
									)}
									onClick={() => setKind("EXPENSE")}
								>
									Saída
								</button>
								<button
									type="button"
									aria-pressed={kind === "INCOME"}
									className={cn(
										"segmented__opt",
										kind === "INCOME" && "is-selected",
									)}
									onClick={() => setKind("INCOME")}
								>
									Entrada
								</button>
							</div>
						</fieldset>
					)}

					<fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
						<legend className="field__label mb-2 p-0">Ícone</legend>
						<div className="icon-grid">
							{CATEGORY_ICON_CHOICES.map((option) => {
								const selected = option.name === icon;
								return (
									<button
										key={option.name}
										type="button"
										aria-pressed={selected}
										aria-label={option.label}
										className={cn(
											"icon-opt",
											selected &&
												"is-selected shadow-[inset_0_0_0_1px_var(--color-focus)]",
										)}
										onClick={() => setIcon(option.name)}
									>
										<CategoryIcon name={option.name} size={24} />
									</button>
								);
							})}
						</div>
					</fieldset>
				</div>

				<div className="shrink-0 px-5 pt-3 pb-6">
					<button
						type="button"
						className={cn(
							"btn-primary btn-primary--block",
							pending && "is-loading",
						)}
						disabled={pending}
						onClick={submit}
					>
						<span>{editing ? "Salvar alterações" : "Criar categoria"}</span>
						{pending ? (
							<span className="spinner" role="status" aria-label="Salvando" />
						) : null}
					</button>
				</div>
			</div>
		</div>
	);
}
