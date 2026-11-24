import { cn } from "@arvo/ui/lib/utils";
import {
	CaretDownIcon,
	CheckCircleIcon,
	WarningCircleIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CardDeleteSheet, DaySheet } from "@/components/card/card-sheets";
import { Grabber } from "@/components/register/parts";
import {
	type CardFormErrors,
	type CardType,
	closingHint,
	onlyLast4,
	validateCardForm,
} from "@/lib/card-form";
import { queryClient, trpc } from "@/utils/trpc";

export type EditableCard = {
	id: string;
	name: string;
	type: CardType;
	last4: string | null;
	closingDay: number | null;
	dueDay: number | null;
	openInvoice: { dueDate: string; totalCents: number } | null;
};

const TYPES: { type: CardType; title: string; description: string }[] = [
	{
		type: "CREDIT",
		title: "Crédito",
		description: "Tem fatura: fecha num dia e vence em outro",
	},
	{
		type: "DEBIT",
		title: "Débito",
		description: "Sai da conta na hora, sem fatura",
	},
];

// Folhas 6.2 do Figma: "Novo cartão" (crédito com os dias da fatura, ou débito). O Figma não tem
// "Editar cartão": tocar num cartão abre esta mesma folha com os dados e o "Apagar cartão" no fim.
export function CardFormSheet({
	card,
	onClose,
}: {
	/** Sem cartão é "Novo cartão"; com cartão é "Editar cartão". */
	card?: EditableCard;
	onClose: () => void;
}) {
	const editing = card !== undefined;
	const dialogRef = useRef<HTMLDivElement>(null);

	const [name, setName] = useState(card?.name ?? "");
	const [type, setType] = useState<CardType>(card?.type ?? "CREDIT");
	const [last4, setLast4] = useState(card?.last4 ?? "");
	const [closingDay, setClosingDay] = useState<number | null>(
		card?.closingDay ?? null,
	);
	const [dueDay, setDueDay] = useState<number | null>(card?.dueDay ?? null);
	const [dayPicker, setDayPicker] = useState<"closing" | "due" | null>(null);
	const [deleting, setDeleting] = useState(false);
	// Os erros só aparecem depois de tocar no botão e saem sozinhos conforme o campo é corrigido.
	const [submitted, setSubmitted] = useState(false);

	const values = { name, type, last4, closingDay, dueDay };
	const errors: CardFormErrors = submitted ? validateCardForm(values) : {};

	const onSuccess = () => {
		queryClient.invalidateQueries(trpc.card.pathFilter());
		toast.success(editing ? "Cartão atualizado" : "Cartão adicionado");
		onClose();
	};
	const onError = (error: { message: string }) => toast.error(error.message);
	const create = useMutation(
		trpc.card.create.mutationOptions({ onSuccess, onError }),
	);
	const update = useMutation(
		trpc.card.update.mutationOptions({ onSuccess, onError }),
	);
	const pending = create.isPending || update.isPending;

	function submit() {
		setSubmitted(true);
		if (Object.keys(validateCardForm(values)).length > 0 || pending) return;
		const input = {
			name: name.trim(),
			type,
			last4: last4 === "" ? null : last4,
			closingDay: type === "CREDIT" ? closingDay : null,
			dueDay: type === "CREDIT" ? dueDay : null,
		};
		if (card) update.mutate({ id: card.id, ...input });
		else create.mutate(input);
	}

	// Fecha com Esc (as folhas de cima pegam o Esc antes), segura a rolagem da tela de trás e leva o
	// foco para a folha.
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

	const title = editing ? "Editar cartão" : "Novo cartão";
	const hint = closingHint(closingDay);

	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)]">
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label={title}
				tabIndex={-1}
				className="relative flex h-[calc(100svh-56px)] w-full max-w-[480px] flex-col rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-strong)] outline-none"
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
					<div className={cn("field", errors.name && "field--error")}>
						<label className="field__label" htmlFor="card-name">
							Nome
						</label>
						<div className="field__control">
							<input
								id="card-name"
								value={name}
								maxLength={40}
								placeholder="Ex.: Nubank, Itaú"
								aria-invalid={errors.name ? true : undefined}
								aria-describedby={errors.name ? "card-name-error" : undefined}
								onChange={(event) => setName(event.target.value)}
							/>
						</div>
						{errors.name ? (
							<p className="field__error" id="card-name-error" role="alert">
								<WarningCircleIcon size={16} aria-hidden />
								{errors.name}
							</p>
						) : null}
					</div>

					<fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
						<legend className="field__label mb-2 p-0">Tipo</legend>
						<div>
							{TYPES.map((option) => {
								const selected = option.type === type;
								return (
									<button
										key={option.type}
										type="button"
										aria-pressed={selected}
										className={cn(
											"option-card",
											selected &&
												"is-selected shadow-[inset_0_0_0_1px_var(--color-focus)]",
										)}
										onClick={() => setType(option.type)}
									>
										<span className="option-card__text">
											<span className="option-card__title">{option.title}</span>
											<span className="option-card__desc">
												{option.description}
											</span>
										</span>
										<span className="option-card__mark" aria-hidden>
											{selected ? (
												<CheckCircleIcon size={24} weight="fill" />
											) : (
												<i />
											)}
										</span>
									</button>
								);
							})}
						</div>
					</fieldset>

					<div className={cn("field", errors.last4 && "field--error")}>
						<label className="field__label" htmlFor="card-last4">
							Últimos 4 dígitos <small>· opcional</small>
						</label>
						<div className="field__control">
							<input
								id="card-last4"
								inputMode="numeric"
								value={last4}
								maxLength={4}
								placeholder="0000"
								aria-invalid={errors.last4 ? true : undefined}
								aria-describedby={errors.last4 ? "card-last4-error" : undefined}
								onChange={(event) => setLast4(onlyLast4(event.target.value))}
							/>
						</div>
						{errors.last4 ? (
							<p className="field__error" id="card-last4-error" role="alert">
								<WarningCircleIcon size={16} aria-hidden />
								{errors.last4}
							</p>
						) : null}
					</div>

					{type === "CREDIT" ? (
						<>
							<DayField
								label="Fecha dia"
								value={closingDay}
								error={errors.closingDay}
								onOpen={() => setDayPicker("closing")}
							/>
							<div className="flex flex-col gap-2">
								<DayField
									label="Vence dia"
									value={dueDay}
									error={errors.dueDay}
									onOpen={() => setDayPicker("due")}
								/>
								{hint ? (
									<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
										{hint}
									</p>
								) : null}
							</div>
						</>
					) : null}

					{editing ? (
						<button
							type="button"
							className="btn-secondary btn-secondary--danger btn-secondary--block"
							onClick={() => setDeleting(true)}
						>
							Apagar cartão
						</button>
					) : null}
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
						<span>{editing ? "Salvar alterações" : "Adicionar cartão"}</span>
						{pending ? (
							<span className="spinner" role="status" aria-label="Salvando" />
						) : null}
					</button>
				</div>

				{dayPicker ? (
					<DaySheet
						title={
							dayPicker === "closing"
								? "Dia de fechamento"
								: "Dia de vencimento"
						}
						value={dayPicker === "closing" ? closingDay : dueDay}
						onSelect={(day) => {
							if (dayPicker === "closing") setClosingDay(day);
							else setDueDay(day);
							setDayPicker(null);
						}}
						onClose={() => setDayPicker(null)}
					/>
				) : null}

				{deleting && card ? (
					<CardDeleteSheet
						card={card}
						onDeleted={onClose}
						onClose={() => setDeleting(false)}
					/>
				) : null}
			</div>
		</div>
	);
}

// Campo que abre a folha de dias: "Dia 20" com a seta.
function DayField({
	label,
	value,
	error,
	onOpen,
}: {
	label: string;
	value: number | null;
	error?: string;
	onOpen: () => void;
}) {
	const id = label.replace(/\s/g, "-").toLowerCase();
	return (
		<div className={cn("field field--select", error && "field--error")}>
			<span className="field__label" id={`${id}-label`}>
				{label}
			</span>
			<button
				type="button"
				className="field__control !h-[52px] !gap-3 text-left"
				aria-labelledby={`${id}-label`}
				aria-haspopup="dialog"
				onClick={onOpen}
			>
				<span className="field__value">
					{value === null ? "Escolha o dia" : `Dia ${value}`}
				</span>
				<CaretDownIcon size={24} aria-hidden />
			</button>
			{error ? (
				<p className="field__error" role="alert">
					<WarningCircleIcon size={16} aria-hidden />
					{error}
				</p>
			) : null}
		</div>
	);
}
