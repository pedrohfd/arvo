import { cn } from "@arvo/ui/lib/utils";
import { TrashIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/card/card-sheets";
import { validatePersonName } from "@/lib/person-form";
import { queryClient, trpc } from "@/utils/trpc";

type Person = { id: string; name: string };

// Folha "Nova pessoa" / "Renomear": só o nome (as pessoas de Dividir a conta não têm conta no app).
export function PersonFormSheet({
	person,
	existing,
	onClose,
}: {
	/** Sem pessoa é "Nova pessoa"; com pessoa é "Renomear". */
	person?: Person;
	existing: readonly Person[];
	onClose: () => void;
}) {
	const editing = person !== undefined;
	const [name, setName] = useState(person?.name ?? "");
	// O erro só aparece depois de tocar no botão; o do servidor fica até o nome mudar.
	const [submitted, setSubmitted] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);

	const localError = submitted
		? validatePersonName({ name, existing, editingId: person?.id })
		: null;
	const error = localError ?? serverError;

	const onSuccess = () => {
		queryClient.invalidateQueries(trpc.person.pathFilter());
		toast.success(editing ? "Pessoa renomeada" : "Pessoa adicionada");
		onClose();
	};
	const onError = (failure: { message: string }) => {
		if (failure.message === "Já existe uma pessoa com esse nome") {
			setServerError(`Já existe uma pessoa chamada ${name.trim()}.`);
		} else {
			toast.error(failure.message);
		}
	};
	const create = useMutation(
		trpc.person.create.mutationOptions({ onSuccess, onError }),
	);
	const rename = useMutation(
		trpc.person.rename.mutationOptions({ onSuccess, onError }),
	);
	const pending = create.isPending || rename.isPending;

	function submit() {
		setSubmitted(true);
		if (
			validatePersonName({ name, existing, editingId: person?.id }) ||
			pending
		) {
			return;
		}
		if (person) rename.mutate({ id: person.id, name: name.trim() });
		else create.mutate({ name: name.trim() });
	}

	return (
		<Sheet title={editing ? "Renomear" : "Nova pessoa"} onClose={onClose}>
			<form
				className="flex flex-col"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<div className="px-5 pb-4">
					<div className={cn("field", error && "field--error")}>
						<label className="field__label" htmlFor="person-name">
							Nome
						</label>
						<div className="field__control">
							<input
								id="person-name"
								value={name}
								maxLength={40}
								placeholder="Ex.: Ana"
								// biome-ignore lint/a11y/noAutofocus: a folha abre só para digitar o nome
								autoFocus
								aria-invalid={error ? true : undefined}
								aria-describedby={error ? "person-name-error" : undefined}
								onChange={(event) => {
									setName(event.target.value);
									setServerError(null);
								}}
							/>
						</div>
						{error ? (
							<p className="field__error" id="person-name-error" role="alert">
								<WarningCircleIcon size={16} aria-hidden />
								{error}
							</p>
						) : null}
					</div>
				</div>
				<div className="shrink-0 px-5 pt-3 pb-6">
					<button
						type="submit"
						className={cn(
							"btn-primary btn-primary--block",
							pending && "is-loading",
						)}
						disabled={pending}
					>
						<span>{editing ? "Salvar" : "Adicionar pessoa"}</span>
						{pending ? (
							<span className="spinner" role="status" aria-label="Salvando" />
						) : null}
					</button>
				</div>
			</form>
		</Sheet>
	);
}

// Folha "Apagar pessoa": quem aparece em alguma divisão só explica ("Entendi"); sem divisões confirma.
export function PersonDeleteSheet({
	person,
	onClose,
}: {
	person: Person & { splitCount: number };
	onClose: () => void;
}) {
	const remove = useMutation(
		trpc.person.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(trpc.person.pathFilter());
				toast.success(`${person.name} apagada`);
				onClose();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (person.splitCount > 0) {
		return (
			<Sheet title="Não dá para apagar" onClose={onClose}>
				<p className="text-(length:--text-size-body) px-5 pt-2 pb-4 text-[var(--color-text-muted)] leading-6">
					{person.name} aparece em contas divididas, e o histórico perderia o
					nome. Você pode renomear a pessoa se preferir.
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
		<Sheet title={`Apagar ${person.name}?`} onClose={onClose}>
			<p className="text-(length:--text-size-body) px-5 pt-2 pb-4 text-[var(--color-text-muted)] leading-6">
				Você pode adicionar a pessoa de novo quando quiser.
			</p>
			<div className="px-5 pt-3 pb-6">
				<button
					type="button"
					className="btn-secondary btn-secondary--lg btn-secondary--danger btn-secondary--block"
					disabled={remove.isPending}
					onClick={() => remove.mutate({ id: person.id })}
				>
					<TrashIcon size={18} aria-hidden />
					Apagar pessoa
				</button>
			</div>
		</Sheet>
	);
}
