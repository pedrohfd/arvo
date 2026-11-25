import { todayInSaoPaulo } from "@arvo/api/lib/calendar";
import { planTransaction } from "@arvo/api/lib/plan-transaction";
import { minimumBalanceWarning } from "@arvo/api/rules/minimum-balance";
import { cn } from "@arvo/ui/lib/utils";
import {
	BackspaceIcon,
	CalendarBlankIcon,
	CaretDownIcon,
	CaretLeftIcon,
	DotsThreeIcon,
	PlusIcon,
	WarningCircleIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/card/card-sheets";
import { CategoryFormSheet } from "@/components/category/category-form-sheet";
import { CategoryIcon } from "@/components/category-icon";
import { useOutbox } from "@/components/offline/outbox-provider";
import {
	type AmountKey,
	centsToRaw,
	displayParts,
	isAtLimit,
	pressKey,
	toCents,
} from "@/lib/amount-input";
import { formatMoney, moneyParts } from "@/lib/format";
import { classifySendError } from "@/lib/offline-queue";
import type { CreateInput, QueuedDisplay } from "@/lib/queued-view";
import {
	cardLabel,
	creditHint,
	dateFieldLabel,
	defaultPayment,
	type Flow,
	futureDateHint,
	type Payment,
	paymentOptions,
	REPEAT_COUNTS,
	repeatSummary,
	samePayment,
	visibleCategories,
} from "@/lib/register";
import { splitHint } from "@/lib/split-with";
import type { DeleteScope } from "@/lib/transaction-detail";
import { trpc } from "@/utils/trpc";
import { DateSheet } from "./date-sheet";
import { Chip, Grabber, useEscape } from "./parts";
import { PersonChip, SplitSheet, YouChip } from "./split-sheet";

export type Registered = {
	/** Transações criadas (várias quando repete ou parcela). */
	ids: string[];
	flow: Flow;
	amountCents: number;
	/** Sem rede: o registro ficou na fila offline com este id, e ainda não tem transação. */
	queuedId?: string;
};

/** A transação que a folha edita (3.2): a mesma 2.2, sem repetir nem dividir. */
export type EditingTransaction = {
	id: string;
	flow: Flow;
	amountCents: number;
	title: string | null;
	categoryId: string;
	date: string;
	payment: Payment;
	/** Saída dividida: o valor não muda, porque a parte de cada pessoa sai dele. */
	lockAmount: boolean;
	/** Parcela: continua no cartão de crédito. */
	installment: boolean;
	/** Série com ocorrências depois desta: perguntar "Só esta" ou "Esta e as próximas". */
	scopeSheet: {
		title: string;
		only: { title: string; desc: string };
		next: { title: string; desc: string };
	} | null;
};

// Folha do Registrar (série 2 do Figma): 2.1 valor com teclado, 2.2 detalhes, 2.3 dividir com e
// 2.4 data. Ainda não existem: "Outro" em "Por quantos meses" e o parcelamento (D9, sem tela).
export function RegisterSheet({
	initialFlow,
	editing,
	onClose,
	onRegistered,
	onSaved,
}: {
	initialFlow: Flow;
	/** Edita uma transação (3.2) em vez de registrar uma nova. */
	editing?: EditingTransaction;
	onClose: () => void;
	onRegistered: (registered: Registered) => void;
	onSaved?: () => void;
}) {
	const [step, setStep] = useState<"amount" | "details">(
		editing ? "details" : "amount",
	);
	const [flow, setFlow] = useState<Flow>(editing?.flow ?? initialFlow);
	const [raw, setRaw] = useState(
		editing ? centsToRaw(editing.amountCents) : "",
	);
	const dialogRef = useRef<HTMLDivElement>(null);

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

	const cents = toCents(raw);

	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)]">
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label={dialogLabel(flow, Boolean(editing))}
				tabIndex={-1}
				className="relative flex h-[calc(100svh-56px)] w-full max-w-[480px] flex-col rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-strong)] outline-none"
			>
				<Grabber />
				{step === "amount" ? (
					<AmountStep
						flow={flow}
						raw={raw}
						fixedFlow={Boolean(editing)}
						onFlow={setFlow}
						onRaw={setRaw}
						onClose={onClose}
						onContinue={() => setStep("details")}
					/>
				) : (
					<DetailsStep
						flow={flow}
						cents={cents}
						editing={editing}
						onBack={() => setStep("amount")}
						onRegistered={onRegistered}
						onSaved={onSaved}
					/>
				)}
			</div>
		</div>
	);
}

function dialogLabel(flow: Flow, editing: boolean) {
	if (editing) return flow === "EXPENSE" ? "Editar saída" : "Editar entrada";
	return flow === "EXPENSE" ? "Nova saída" : "Nova entrada";
}

// ───────── 2.1 Valor ─────────

const KEYS: AmountKey[] = [
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	",",
	"0",
	"back",
];

// O valor encolhe conforme cresce, para caber na largura (R$ 9.999.999,99 ocupa a tela toda).
function amountSize(text: string) {
	if (text.length <= 9) return 56;
	if (text.length <= 12) return 48;
	return 42;
}

function AmountStep({
	flow,
	raw,
	fixedFlow,
	onFlow,
	onRaw,
	onClose,
	onContinue,
}: {
	flow: Flow;
	raw: string;
	/** Editando, saída e entrada não se trocam. */
	fixedFlow: boolean;
	onFlow: (flow: Flow) => void;
	onRaw: (raw: string) => void;
	onClose: () => void;
	onContinue: () => void;
}) {
	const cents = toCents(raw);
	const atLimit = isAtLimit(raw);
	const { typed, ghost } = displayParts(raw);

	// Teclado do computador: dígitos, vírgula (ou ponto), Backspace e Enter.
	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (/^\d$/.test(event.key)) onRaw(pressKey(raw, event.key as AmountKey));
			else if (event.key === "," || event.key === ".")
				onRaw(pressKey(raw, ","));
			else if (event.key === "Backspace") onRaw(pressKey(raw, "back"));
			else if (event.key === "Enter" && cents > 0) onContinue();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [raw, cents, onRaw, onContinue]);

	return (
		<>
			<div className="flex h-14 shrink-0 items-center justify-between gap-2 px-3 pt-1 pb-2">
				<button
					type="button"
					className="icon-btn"
					aria-label="Fechar"
					onClick={onClose}
				>
					<XIcon size={22} aria-hidden />
				</button>
				{fixedFlow ? (
					<h2 className="text-(length:--text-size-headline) font-semibold leading-6">
						{dialogLabel(flow, true)}
					</h2>
				) : (
					<div className="segmented">
						<button
							type="button"
							aria-pressed={flow === "EXPENSE"}
							className={cn(
								"segmented__opt",
								flow === "EXPENSE" && "is-selected",
							)}
							onClick={() => onFlow("EXPENSE")}
						>
							Saída
						</button>
						<button
							type="button"
							aria-pressed={flow === "INCOME"}
							className={cn(
								"segmented__opt",
								flow === "INCOME" && "is-selected",
							)}
							onClick={() => onFlow("INCOME")}
						>
							Entrada
						</button>
					</div>
				)}
				<span className="size-11" aria-hidden />
			</div>

			<div className="amount-entry flex flex-1 flex-col items-center justify-center">
				<div
					className="amount-entry__value"
					style={{
						fontSize: amountSize(typed + ghost),
						lineHeight: "64px",
					}}
					aria-live="polite"
				>
					{typed}
					<span className="ghost">{ghost}</span>
				</div>
				<p className={cn("amount-entry__hint", "h-5")}>
					{atLimit
						? "Esse é o valor máximo."
						: flow === "EXPENSE"
							? "Quanto foi?"
							: "Quanto entrou?"}
				</p>
			</div>

			<div className="keypad shrink-0">
				{KEYS.map((key) => (
					<button
						key={key}
						type="button"
						className="key"
						aria-label={
							key === "back" ? "Apagar" : key === "," ? "Vírgula" : key
						}
						disabled={key !== "back" && atLimit}
						onClick={() => onRaw(pressKey(raw, key))}
					>
						{key === "back" ? (
							<BackspaceIcon size={26} aria-hidden />
						) : key === "," ? (
							// A vírgula do teclado fica na linha de baixo, como no Figma.
							<span className="translate-y-2">,</span>
						) : (
							key
						)}
					</button>
				))}
			</div>

			<div className="shrink-0 px-5 pt-3 pb-6">
				<button
					type="button"
					className="btn-primary btn-primary--block"
					disabled={cents === 0}
					onClick={onContinue}
				>
					Continuar
				</button>
			</div>
		</>
	);
}

// ───────── 2.2 Detalhes ─────────

function DetailsStep({
	flow,
	cents,
	editing,
	onBack,
	onRegistered,
	onSaved,
}: {
	flow: Flow;
	cents: number;
	editing?: EditingTransaction;
	onBack: () => void;
	onRegistered: (registered: Registered) => void;
	onSaved?: () => void;
}) {
	const today = todayInSaoPaulo();
	const outbox = useOutbox();
	const categories = useQuery(trpc.category.list.queryOptions());
	const cards = useQuery(trpc.card.list.queryOptions());
	const home = useQuery(trpc.summary.home.queryOptions());
	const settings = useQuery(trpc.settings.get.queryOptions());
	const people = useQuery({
		...trpc.person.list.queryOptions(),
		enabled: flow === "EXPENSE",
	});

	const [categoryId, setCategoryId] = useState<string | null>(
		editing?.categoryId ?? null,
	);
	const [categoryError, setCategoryError] = useState(false);
	const [moreOpen, setMoreOpen] = useState(false);
	const [title, setTitle] = useState(editing?.title ?? "");
	const [date, setDate] = useState(editing?.date ?? today);
	const [dateOpen, setDateOpen] = useState(false);
	const [pickedPayment, setPickedPayment] = useState<Payment | null>(
		editing?.payment ?? null,
	);
	const [scopeOpen, setScopeOpen] = useState(false);
	const [repeat, setRepeat] = useState(false);
	const [repeatCount, setRepeatCount] = useState<number | null>(null);
	// Dividir só vale para saída que não se repete (o servidor recusa as duas coisas juntas).
	const [split, setSplit] = useState(false);
	const [splitIds, setSplitIds] = useState<string[]>([]);
	const [splitOpen, setSplitOpen] = useState(false);
	// Gerado uma vez por abertura: reenviar o mesmo registro não duplica.
	const clientId = useRef(crypto.randomUUID());

	const flowCategories = (categories.data ?? []).filter(
		(category) => category.kind === flow,
	);
	const cardList = cards.data ?? [];
	const paymentChoices = paymentOptions(flow, cardList).filter(
		(option) =>
			!editing?.installment ||
			(option.payment.kind === "card" &&
				cardList.find(
					(card) => card.id === (option.payment as { cardId: string }).cardId,
				)?.type === "CREDIT"),
	);
	const payment = pickedPayment ?? defaultPayment(flow, cardList);
	const selectedCard =
		payment.kind === "card"
			? cardList.find((card) => card.id === payment.cardId)
			: undefined;
	const { shown, hasMore } = visibleCategories(flowCategories, categoryId);
	const peopleList = people.data ?? [];
	const splitPeople = splitIds
		.map((id) => peopleList.find((person) => person.id === id))
		.filter((person) => person !== undefined);
	const splitting = flow === "EXPENSE" && split && !repeat;

	const warning = minimumBalanceWarning({
		balanceCents: home.data?.balance.balanceCents ?? 0,
		minimumCents: settings.data?.minimumBalanceCents ?? 0,
		amountCents: cents,
		kind: flow,
		isCredit: selectedCard?.type === "CREDIT",
	});
	// Gasto agendado não mexe no saldo agora: o aviso só vale para hoje ou datas passadas.
	const showWarning = !editing && warning.warn && date <= today;

	// Sem rede, o registro vai para a fila offline e a lista já mostra "Na fila para enviar".
	async function queueOffline(payload: CreateInput) {
		let rows: QueuedDisplay["rows"];
		try {
			rows = planTransaction(
				{
					kind: flow,
					amountCents: cents,
					date,
					paymentMethod: payload.paymentMethod,
					card: selectedCard
						? {
								type: selectedCard.type,
								closingDay: selectedCard.closingDay,
								dueDay: selectedCard.dueDay,
							}
						: null,
					repeat: payload.repeat,
					installments: payload.installments,
				},
				today,
			).rows;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Registro inválido");
			return;
		}
		const category = flowCategories.find(
			(item) => item.id === payload.categoryId,
		);
		const methodLabel =
			payment.kind === "card"
				? selectedCard
					? cardLabel(selectedCard)
					: "Cartão"
				: payment.kind === "PIX"
					? "Pix"
					: payment.kind === "CASH"
						? "Dinheiro"
						: "Depósito";
		await outbox.enqueue({
			id: clientId.current,
			input: payload,
			display: {
				kind: flow,
				title: payload.title ?? null,
				categoryId: payload.categoryId,
				categoryName: category?.name ?? "",
				categoryIcon: category?.icon ?? "",
				cardId: payload.cardId ?? null,
				methodLabel,
				rows,
			},
		});
		onRegistered({
			ids: [],
			flow,
			amountCents: cents,
			queuedId: clientId.current,
		});
	}

	const create = useMutation(
		trpc.transaction.create.mutationOptions({
			onSuccess: (result) =>
				onRegistered({ ids: result.ids, flow, amountCents: cents }),
			onError: (error, variables) => {
				if (classifySendError(error).type === "network") {
					queueOffline(variables);
				} else {
					toast.error(error.message);
				}
			},
		}),
	);

	const update = useMutation(
		trpc.transaction.update.mutationOptions({
			onSuccess: () => onSaved?.(),
			onError: (error) => toast.error(error.message),
		}),
	);

	function save(scope: DeleteScope) {
		if (!editing || !categoryId) return;
		update.mutate({
			id: editing.id,
			scope,
			amountCents: cents,
			title: title.trim() || undefined,
			categoryId,
			date,
			paymentMethod: payment.kind === "card" ? "CARD" : payment.kind,
			cardId: payment.kind === "card" ? payment.cardId : undefined,
		});
	}

	function submit() {
		if (!categoryId) {
			setCategoryError(true);
			return;
		}
		if (editing) {
			if (editing.scopeSheet) setScopeOpen(true);
			else save("ONLY_THIS");
			return;
		}
		const payload: CreateInput = {
			clientId: clientId.current,
			kind: flow,
			amountCents: cents,
			title: title.trim() || undefined,
			categoryId,
			date,
			paymentMethod: payment.kind === "card" ? "CARD" : payment.kind,
			cardId: payment.kind === "card" ? payment.cardId : undefined,
			repeat: repeat ? { intervalMonths: 1, count: repeatCount } : undefined,
			splitWithPersonIds:
				splitting && splitPeople.length > 0
					? splitPeople.map((person) => person.id)
					: undefined,
		};
		if (navigator.onLine) create.mutate(payload);
		else queueOffline(payload);
	}

	const money = moneyParts(cents);
	const hint = creditHint(selectedCard, date);
	// Compra no crédito já tem o aviso da fatura; as demais avisam que a data ainda não chegou.
	const futureHint =
		selectedCard?.type === "CREDIT" ? null : futureDateHint(date, today);

	return (
		<>
			<div className="flex h-14 shrink-0 items-center gap-2 px-3 pt-1 pb-2">
				<button
					type="button"
					className="icon-btn"
					aria-label="Voltar ao valor"
					onClick={onBack}
				>
					<CaretLeftIcon size={22} aria-hidden />
				</button>
				<h2 className="text-(length:--text-size-headline) font-semibold leading-6">
					{dialogLabel(flow, Boolean(editing))}
				</h2>
			</div>

			<div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-4">
				<button
					type="button"
					className="self-start text-left"
					aria-label={`Valor ${formatMoney(cents)}, tocar para alterar`}
					disabled={editing?.lockAmount}
					onClick={onBack}
				>
					<span className="font-[family-name:var(--font-display)] text-[32px] leading-[38px] tracking-[-0.02em] [font-variation-settings:'SOFT'_100,'WONK'_0]">
						{money.integer}
					</span>
					<span className="font-[family-name:var(--font-display)] text-[var(--color-text-placeholder)] text-base leading-6 [font-variation-settings:'SOFT'_100,'WONK'_0]">
						{money.cents}
					</span>
				</button>

				{showWarning ? (
					<div className="banner m-0">
						<WarningCircleIcon size={20} aria-hidden />
						<p className="banner__text">
							Com esse gasto, seu saldo fica em{" "}
							<b>{formatMoney(warning.balanceAfterCents)}</b>, abaixo do seu
							mínimo de {formatMoney(settings.data?.minimumBalanceCents ?? 0)}.
						</p>
					</div>
				) : null}

				<Group label="Categoria">
					<div className="choices">
						{shown.map((category) => (
							<Chip
								key={category.id}
								selected={category.id === categoryId}
								onClick={() => {
									setCategoryId(category.id);
									setCategoryError(false);
								}}
								icon={<CategoryIcon name={category.icon} size={18} />}
							>
								{category.name}
							</Chip>
						))}
						{hasMore ? (
							<button
								type="button"
								className="choice choice--icon"
								onClick={() => setMoreOpen(true)}
							>
								<DotsThreeIcon size={18} className="icon" aria-hidden />
								Mais
							</button>
						) : null}
					</div>
					{categoryError ? (
						<p className="field__error" role="alert">
							<WarningCircleIcon size={16} aria-hidden />
							Escolha uma categoria para registrar.
						</p>
					) : null}
				</Group>

				<div className="field">
					<label className="field__label" htmlFor="register-title">
						Título <small>· opcional</small>
					</label>
					<div className="field__control">
						<input
							id="register-title"
							value={title}
							maxLength={80}
							placeholder={flow === "INCOME" ? "Ex.: Salário" : undefined}
							onChange={(event) => setTitle(event.target.value)}
						/>
					</div>
				</div>

				<div className="flex flex-col gap-3">
					<div className="field field--select">
						<span className="field__label" id="register-date-label">
							Data
						</span>
						<button
							type="button"
							className="field__control text-left"
							aria-labelledby="register-date-label"
							aria-haspopup="dialog"
							onClick={() => setDateOpen(true)}
						>
							<CalendarBlankIcon size={18} aria-hidden />
							<span className="field__value">
								{dateFieldLabel(date, today)}
							</span>
							<CaretDownIcon size={18} aria-hidden />
						</button>
					</div>
					{futureHint ? (
						<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-5">
							{futureHint}
						</p>
					) : null}
				</div>

				<Group
					label={
						flow === "EXPENSE" ? "Forma de pagamento" : "Forma de recebimento"
					}
				>
					<div className="flex flex-col gap-3">
						<div className="choices">
							{paymentChoices.map((option) => (
								<Chip
									key={option.label}
									selected={samePayment(option.payment, payment)}
									onClick={() => setPickedPayment(option.payment)}
								>
									{option.label}
								</Chip>
							))}
						</div>
						{hint ? (
							<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-5">
								{hint}
							</p>
						) : null}
					</div>
				</Group>

				{editing ? null : (
					<div className="flex flex-col">
						<div className="switch-row">
							<div className="switch-row__text">
								<span className="switch-row__title" id="repeat-title">
									Repetir todo mês
								</span>
								<span className="switch-row__desc">
									{flow === "EXPENSE"
										? "Para contas fixas e parcelas"
										: "Para salário e entradas fixas"}
								</span>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={repeat}
								aria-labelledby="repeat-title"
								className="switch"
								onClick={() => {
									setRepeat((value) => !value);
									if (!repeat) setSplit(false);
								}}
							/>
						</div>
						{repeat ? (
							<div className="flex flex-col gap-3 pt-1">
								<span className="field__label" id="repeat-count">
									Por quantos meses
								</span>
								<div className="choices">
									<Chip
										selected={repeatCount === null}
										onClick={() => setRepeatCount(null)}
									>
										Sem fim
									</Chip>
									{REPEAT_COUNTS.map((count) => (
										<Chip
											key={count}
											selected={repeatCount === count}
											onClick={() => setRepeatCount(count)}
										>
											{count}
										</Chip>
									))}
								</div>
								<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-5">
									{repeatSummary({
										amountCents: cents,
										date: today,
										count: repeatCount,
									})}
								</p>
							</div>
						) : null}
					</div>
				)}

				{flow === "EXPENSE" && !editing ? (
					<div className="flex flex-col">
						<div className="switch-row">
							<div className="switch-row__text">
								<span className="switch-row__title" id="split-title">
									Dividir a conta
								</span>
								<span className="switch-row__desc">
									Em partes iguais, contando você
								</span>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={splitting}
								aria-labelledby="split-title"
								className="switch"
								onClick={() => {
									if (splitting) {
										setSplit(false);
										return;
									}
									setSplit(true);
									setRepeat(false);
									if (splitPeople.length === 0) setSplitOpen(true);
								}}
							/>
						</div>
						{splitting ? (
							<div className="flex flex-col gap-3 pt-1">
								<div className="flex flex-wrap gap-2">
									<YouChip />
									{splitPeople.map((person) => (
										<PersonChip
											key={person.id}
											name={person.name}
											onRemove={() =>
												setSplitIds((ids) =>
													ids.filter((id) => id !== person.id),
												)
											}
										/>
									))}
									<button
										type="button"
										className="choice choice--icon bg-[var(--color-surface)] shadow-[inset_0_0_0_1px_var(--color-border)]"
										aria-haspopup="dialog"
										onClick={() => setSplitOpen(true)}
									>
										<PlusIcon size={18} className="icon" aria-hidden />
										Adicionar
									</button>
								</div>
								<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-5">
									{splitHint(cents, splitPeople.length)}
								</p>
							</div>
						) : null}
					</div>
				) : null}
			</div>

			<div className="shrink-0 px-5 pt-3 pb-6">
				<button
					type="button"
					className={cn(
						"btn-primary btn-primary--block",
						(create.isPending || update.isPending) && "is-loading",
					)}
					disabled={create.isPending || update.isPending}
					onClick={submit}
				>
					<span>
						{editing
							? "Salvar alterações"
							: flow === "EXPENSE"
								? "Registrar saída"
								: "Registrar entrada"}
					</span>
					{create.isPending || update.isPending ? (
						<span
							className="spinner"
							role="status"
							aria-label={editing ? "Salvando" : "Registrando"}
						/>
					) : null}
				</button>
			</div>

			{scopeOpen && editing?.scopeSheet ? (
				<EditScopeSheet
					sheet={editing.scopeSheet}
					pending={update.isPending}
					onSave={save}
					onClose={() => setScopeOpen(false)}
				/>
			) : null}
			{dateOpen ? (
				<DateSheet
					value={date}
					today={today}
					onSelect={(picked) => {
						setDate(picked);
						setDateOpen(false);
					}}
					onClose={() => setDateOpen(false)}
				/>
			) : null}
			{splitOpen ? (
				<SplitSheet
					people={peopleList}
					selectedIds={splitIds}
					amountCents={cents}
					onDone={(ids) => {
						setSplitIds(ids);
						setSplitOpen(false);
					}}
					onClose={() => setSplitOpen(false)}
				/>
			) : null}
			{moreOpen ? (
				<CategorySheet
					categories={flowCategories}
					flow={flow}
					allCategories={categories.data ?? []}
					selectedId={categoryId}
					onSelect={(id) => {
						setCategoryId(id);
						setCategoryError(false);
					}}
					onClose={() => setMoreOpen(false)}
				/>
			) : null}
		</>
	);
}

// 3.2 "salvar recorrente": a pergunta começa em "Esta e as próximas", o caso mais comum; as
// anteriores nunca mudam.
function EditScopeSheet({
	sheet,
	pending,
	onSave,
	onClose,
}: {
	sheet: NonNullable<EditingTransaction["scopeSheet"]>;
	pending: boolean;
	onSave: (scope: DeleteScope) => void;
	onClose: () => void;
}) {
	const [scope, setScope] = useState<DeleteScope>("THIS_AND_NEXT");
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
					className={cn(
						"btn-primary btn-primary--block",
						pending && "is-loading",
					)}
					disabled={pending}
					onClick={() => onSave(scope)}
				>
					<span>Salvar alterações</span>
					{pending ? (
						<span className="spinner" role="status" aria-label="Salvando" />
					) : null}
				</button>
			</div>
		</Sheet>
	);
}

function Group({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-[6px]">
			<span className="field__label">{label}</span>
			{children}
		</div>
	);
}

// "Todas as categorias" (tela 6.3 no registro): a folha do "Mais", com "Nova categoria" no fim. A
// categoria criada já fica escolhida.
function CategorySheet({
	categories,
	flow,
	allCategories,
	selectedId,
	onSelect,
	onClose,
}: {
	categories: { id: string; name: string; icon: string }[];
	flow: Flow;
	allCategories: readonly {
		id: string;
		name: string;
		kind: "EXPENSE" | "INCOME";
	}[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	onClose: () => void;
}) {
	const [creating, setCreating] = useState(false);
	useEscape(onClose);
	return (
		<div className="fixed inset-0 z-[60] flex items-end justify-center bg-[var(--color-overlay)]">
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Categoria"
				className="w-full max-w-[480px] rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-strong)]"
			>
				<Grabber />
				<div className="flex h-14 items-center px-3 pt-1 pb-2">
					<button
						type="button"
						className="icon-btn"
						aria-label="Fechar"
						onClick={onClose}
					>
						<XIcon size={22} aria-hidden />
					</button>
					<h2 className="text-(length:--text-size-headline) flex-1 text-center font-semibold leading-6">
						Categoria
					</h2>
					<span className="size-11" aria-hidden />
				</div>
				<div className="choices px-5 pt-2">
					{categories.map((category) => (
						<Chip
							key={category.id}
							selected={category.id === selectedId}
							onClick={() => onSelect(category.id)}
							icon={<CategoryIcon name={category.icon} size={18} />}
						>
							{category.name}
						</Chip>
					))}
					<button
						type="button"
						className="choice choice--icon"
						onClick={() => setCreating(true)}
					>
						<PlusIcon size={18} className="icon" aria-hidden />
						Nova categoria
					</button>
				</div>
				<div className="px-5 pt-6 pb-6">
					<button
						type="button"
						className="btn-primary btn-primary--block"
						onClick={onClose}
					>
						Pronto
					</button>
				</div>
			</div>
			{creating ? (
				<CategoryFormSheet
					initialKind={flow}
					existing={allCategories}
					onSaved={(saved) => {
						onSelect(saved.id);
						onClose();
					}}
					onClose={() => setCreating(false)}
				/>
			) : null}
		</div>
	);
}
