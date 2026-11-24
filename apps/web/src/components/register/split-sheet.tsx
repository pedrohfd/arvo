import { cn } from "@arvo/ui/lib/utils";
import { PlusIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/card/card-sheets";
import { findPersonByName, initials, splitHint } from "@/lib/split-with";
import { queryClient, trpc } from "@/utils/trpc";
import { Chip } from "./parts";

type Person = { id: string; name: string };

// Folha 2.3 "Dividir com": as pessoas já cadastradas em chips e um campo para um nome novo. Um nome
// que já existe só é escolhido (não cria outra pessoa); um nome que já está na divisão avisa. A
// escolha só vale em "Pronto".
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

	function toggle(id: string) {
		setDraft((ids) =>
			ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id],
		);
	}

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

	const hint = splitHint(amountCents, draft.length);

	return (
		<Sheet title="Dividir com" onClose={onClose}>
			<div className="flex flex-col gap-5 overflow-y-auto px-5 pt-2 pb-4">
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
					<div className="flex gap-2">
						<div className="field__control flex-1">
							<input
								id="split-name"
								value={name}
								maxLength={40}
								placeholder="Ex.: Ana"
								autoComplete="off"
								aria-invalid={error ? true : undefined}
								aria-describedby={error ? "split-name-error" : undefined}
								onChange={(event) => {
									setName(event.target.value);
									setError(null);
								}}
							/>
						</div>
						<button
							type="submit"
							className="btn-secondary btn-secondary--lg"
							disabled={name.trim() === "" || create.isPending}
						>
							<PlusIcon size={18} aria-hidden />
							Adicionar
						</button>
					</div>
					{error ? (
						<p className="field__error" id="split-name-error" role="alert">
							<WarningCircleIcon size={16} aria-hidden />
							{error}
						</p>
					) : null}
				</form>

				{people.length > 0 ? (
					<fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
						<legend className="field__label mb-2 p-0">Pessoas</legend>
						<div className="choices">
							{people.map((person) => (
								<Chip
									key={person.id}
									selected={draft.includes(person.id)}
									onClick={() => toggle(person.id)}
									icon={
										<span className="person-chip__avatar !size-6 text-[11px]">
											{initials(person.name)}
										</span>
									}
								>
									{person.name}
								</Chip>
							))}
						</div>
					</fieldset>
				) : null}

				{hint ? (
					<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-5">
						{hint}
					</p>
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
