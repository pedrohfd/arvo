import { cn } from "@arvo/ui/lib/utils";
import { UserPlusIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/card/card-sheets";
import { arrowKeys } from "@/lib/arrow-keys";
import { findPersonByName, initials, splitHint } from "@/lib/split-with";
import { queryClient, trpc } from "@/utils/trpc";

type Person = { id: string; name: string };

// Folha 2.3 "Dividir com" (Figma 2.3 normal, repetido e vazio): o campo de nome com o botão de
// adicionar, "Na divisão" (você e quem já entrou, com ×) e "Recentes" (as outras pessoas, que entram
// com um toque). Um nome que já existe só entra na divisão (não cria outra pessoa); um nome que já
// está nela avisa. A escolha só vale em "Pronto".
export function SplitSheet({
	people,
	selectedIds,
	amountCents,
	onDone,
	onClose,
}: {
	people: readonly Person[];
	selectedIds: readonly string[];
	amountCents: number;
	onDone: (ids: string[]) => void;
	onClose: () => void;
}) {
	const [draft, setDraft] = useState<string[]>([...selectedIds]);
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);

	const create = useMutation(
		trpc.person.create.mutationOptions({
			onSuccess: (person) => {
				queryClient.invalidateQueries(trpc.person.pathFilter());
				setDraft((ids) => [...ids, person.id]);
				setName("");
			},
			onError: (failure) => {
				if (failure.message === "Já existe uma pessoa com esse nome") {
					setError(`Já existe alguém chamado ${name.trim()}.`);
				} else {
					toast.error(failure.message);
				}
			},
		}),
	);

	function add() {
		const typed = name.trim();
		if (typed === "" || create.isPending) return;
		const known = findPersonByName(people, typed);
		if (known) {
			if (draft.includes(known.id)) {
				setError(`${known.name} já está na divisão.`);
				return;
			}
			setDraft((ids) => [...ids, known.id]);
			setName("");
			return;
		}
		create.mutate({ name: typed });
	}

	// "Na divisão" na ordem em que entraram; "Recentes" com quem ficou de fora.
	const inSplit = draft
		.map((id) => people.find((person) => person.id === id))
		.filter((person) => person !== undefined);
	const recent = people.filter((person) => !draft.includes(person.id));

	return (
		<Sheet title="Dividir com" titleAlign="start" onClose={onClose}>
			<div className="flex flex-col gap-6 overflow-y-auto px-5 pt-2 pb-4">
				<form
					className={cn("field", error && "field--error")}
					onSubmit={(event) => {
						event.preventDefault();
						add();
					}}
				>
					<label className="field__label" htmlFor="split-name">
						Nome
					</label>
					<div className="field__control !pr-1">
						<input
							id="split-name"
							value={name}
							maxLength={40}
							autoComplete="off"
							enterKeyHint="done"
							aria-invalid={error ? true : undefined}
							aria-describedby={error ? "split-name-error" : undefined}
							onChange={(event) => {
								setName(event.target.value);
								setError(null);
							}}
						/>
						<button
							type="submit"
							className="icon-btn"
							aria-label="Adicionar à divisão"
							disabled={create.isPending}
						>
							<UserPlusIcon size={20} aria-hidden />
						</button>
					</div>
					{error ? (
						<p className="field__error" id="split-name-error" role="alert">
							<WarningCircleIcon size={16} aria-hidden />
							{error}
						</p>
					) : null}
				</form>

				<section className="flex flex-col gap-2">
					<h3 className="field__label">Na divisão</h3>
					<div className="flex flex-wrap gap-2">
						<YouChip />
						{inSplit.map((person) => (
							<PersonChip
								key={person.id}
								name={person.name}
								onRemove={() =>
									setDraft((ids) => ids.filter((id) => id !== person.id))
								}
							/>
						))}
					</div>
					<p className="text-(length:--text-size-small) pt-1 text-[var(--color-text-muted)] leading-5">
						{splitHint(amountCents, inSplit.length)}
					</p>
				</section>

				{recent.length > 0 ? (
					<section className="flex flex-col gap-2">
						<h3 className="field__label">Recentes</h3>
						<div ref={arrowKeys()} className="choices">
							{recent.map((person) => (
								<button
									key={person.id}
									type="button"
									className="choice choice--icon"
									aria-label={`Colocar ${person.name} na divisão`}
									onClick={() => {
										setDraft((ids) => [...ids, person.id]);
										setError(null);
									}}
								>
									<UserPlusIcon size={18} className="icon" aria-hidden />
									{person.name}
								</button>
							))}
						</div>
					</section>
				) : null}
			</div>
			<div className="shrink-0 px-5 pt-3 pb-6">
				<button
					type="button"
					className="btn-primary btn-primary--block"
					onClick={() => onDone(draft)}
				>
					Pronto
				</button>
			</div>
		</Sheet>
	);
}

/** Chip "Você": avatar escuro com "V", sem ×. */
export function YouChip() {
	return (
		<span className="person-chip person-chip--you">
			<span className="person-chip__avatar" aria-hidden>
				V
			</span>
			<span className="person-chip__name">Você</span>
		</span>
	);
}

/** Chip de quem está na divisão: inicial, nome e × para tirar. */
export function PersonChip({
	name,
	onRemove,
}: {
	name: string;
	onRemove: () => void;
}) {
	return (
		<span className="person-chip">
			<span className="person-chip__avatar" aria-hidden>
				{initials(name)}
			</span>
			<span className="person-chip__name">{name}</span>
			<button
				type="button"
				className="icon-btn"
				aria-label={`Tirar ${name} da divisão`}
				onClick={onRemove}
			>
				<XIcon size={16} aria-hidden />
			</button>
		</span>
	);
}
