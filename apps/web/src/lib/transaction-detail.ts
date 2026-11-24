import {
	dayLabel,
	dayMonthLabel,
	formatMoney,
	formatShortDate,
	monthYearLabel,
	weekdayLabel,
} from "@/lib/format";

// Textos da tela 3.1 (detalhe da transação) e das folhas 3.3 (apagar), sem React, para testar.

type Kind = "EXPENSE" | "INCOME";
type Method = "CARD" | "PIX" | "CASH" | "DEPOSIT";

export type DetailSplit = {
	person: { name: string };
	amountCents: number;
	paidAt: string | null;
	/** O pagamento criou a entrada de Reembolso ("na conta"); sem ela foi "em dinheiro". */
	reimbursed: boolean;
};

export type DetailSeries = {
	kind: "RECURRING" | "INSTALLMENT";
	index: number;
	count: number | null;
	intervalMonths: number;
	anchorDay: number;
	nextDate: string | null;
	lastDate: string | null;
};

export type DetailTransaction = {
	today: string;
	kind: Kind;
	amountCents: number;
	title: string | null;
	category: { name: string };
	date: string;
	time: string | null;
	dueDate: string | null;
	paymentMethod: Method;
	cardName: string | null;
	cardType: "CREDIT" | "DEBIT" | null;
	series: DetailSeries | null;
	splits: DetailSplit[];
};

export function txName(tx: Pick<DetailTransaction, "title" | "category">) {
	return tx.title || tx.category.name;
}

/** "Qua., 18 de nov., 20h14": a hora só quando o registro foi feito no próprio dia. */
export function dateLabel(
	tx: Pick<DetailTransaction, "date" | "time" | "today">,
) {
	const day = weekdayLabel(tx.date, tx.today);
	return tx.time ? `${day}, ${tx.time}` : day;
}

const METHOD = { PIX: "Pix", CASH: "Dinheiro", DEPOSIT: "Depósito" } as const;

/** "Nubank · crédito", "Itaú · débito", "Pix". Cartão apagado fica só "Cartão". */
export function paymentLabel(
	tx: Pick<DetailTransaction, "paymentMethod" | "cardName" | "cardType">,
) {
	if (tx.paymentMethod !== "CARD") return METHOD[tx.paymentMethod];
	if (!tx.cardName) return "Cartão";
	return `${tx.cardName} · ${tx.cardType === "CREDIT" ? "crédito" : "débito"}`;
}

/** Saída futura ou compra no crédito ainda não vencida não tiraram do saldo; a data diz. */
function countsToday(
	tx: Pick<DetailTransaction, "date" | "dueDate" | "today">,
) {
	return (tx.dueDate ?? tx.date) <= tx.today;
}

export type Badge = { text: string; variant: "neutral" | "income" };

/** Selo sob o valor: a divisão, a parcela ou a data futura (nessa ordem). */
export function badgeFor(tx: DetailTransaction): Badge | null {
	if (tx.splits.length > 0) {
		const owed = tx.splits
			.filter((split) => !split.paidAt)
			.reduce((sum, split) => sum + split.amountCents, 0);
		return owed > 0
			? { text: `Falta ${formatMoney(owed)}`, variant: "neutral" }
			: { text: "Tudo acertado", variant: "income" };
	}
	if (tx.series?.kind === "INSTALLMENT" && tx.series.count) {
		return {
			text: `Parcela ${tx.series.index} de ${tx.series.count}`,
			variant: "neutral",
		};
	}
	if (tx.date > tx.today) {
		return { text: "Ainda não entra no saldo", variant: "neutral" };
	}
	return null;
}

function cadence(series: DetailSeries) {
	if (series.intervalMonths === 12) return "Todo ano";
	if (series.intervalMonths > 1) return `A cada ${series.intervalMonths} meses`;
	return series.count === null ? `Todo dia ${series.anchorDay}` : "Todo mês";
}

/** Linha "Repete": "Todo mês, até jun. de 2027" e embaixo a próxima (e quanto falta, na parcela). */
export function repeatLabel(
	tx: Pick<DetailTransaction, "series" | "amountCents" | "today">,
): { value: string; sub: string | null } | null {
	const series = tx.series;
	if (!series) return null;
	if (series.count === null) {
		return { value: cadence(series), sub: "Sem data para acabar" };
	}
	const value = series.lastDate
		? `${cadence(series)}, até ${monthYearLabel(series.lastDate)}`
		: cadence(series);
	const parts: string[] = [];
	if (series.nextDate) {
		parts.push(`Próxima em ${dayMonthLabel(series.nextDate, tx.today)}`);
	} else {
		parts.push(series.kind === "INSTALLMENT" ? "Última parcela" : "Última vez");
	}
	const left = series.count - series.index;
	if (series.kind === "INSTALLMENT" && left > 0) {
		parts.push(`faltam ${formatMoney(left * tx.amountCents)}`);
	}
	return { value, sub: parts.join(" · ") };
}

/** "Pagou hoje · na conta", "Pagou em 12/11 · em dinheiro" ou "Ainda não pagou". */
export function paidLabel(split: DetailSplit, today: string) {
	if (!split.paidAt) return "Ainda não pagou";
	const day = dayLabel(split.paidAt, today);
	const when =
		day === "Hoje" || day === "Ontem"
			? day.toLowerCase()
			: `em ${formatShortDate(split.paidAt)}`;
	return `Pagou ${when} · ${split.reimbursed ? "na conta" : "em dinheiro"}`;
}

/** Sua parte: o total menos as dos outros (os centavos que sobram ficam com você). */
export function yourShare(
	tx: Pick<DetailTransaction, "amountCents" | "splits">,
) {
	return (
		tx.amountCents -
		tx.splits.reduce((sum, split) => sum + split.amountCents, 0)
	);
}

/** Texto da folha 3.3 "Apagar esta saída?". */
export function deleteText(tx: DetailTransaction) {
	const name = `“${txName(tx)}”`;
	const amount = formatMoney(tx.amountCents);
	let text: string;
	if (tx.kind === "INCOME") {
		text = countsToday(tx)
			? `${name} sai da lista e ${amount} sai do saldo.`
			: `${name} sai da lista. Ainda não tinha entrado no saldo.`;
	} else if (tx.dueDate && tx.cardName) {
		text = `${name} sai da lista e da fatura do ${tx.cardName} (${amount}).`;
	} else {
		text = countsToday(tx)
			? `${name} sai da lista e ${amount} volta para o saldo.`
			: `${name} sai da lista. Ainda não tinha saído do saldo.`;
	}
	if (tx.splits.length === 0) return text;

	const reimbursed = tx.splits.filter(
		(split) => split.paidAt && split.reimbursed,
	);
	const total = reimbursed.reduce((sum, split) => sum + split.amountCents, 0);
	if (reimbursed.length === 0) return `${text} A divisão também é apagada.`;
	if (reimbursed.length === 1) {
		const [split] = reimbursed as [DetailSplit];
		return `${text} A divisão também é apagada — e a entrada de ${formatMoney(total)} de ${split.person.name} sai junto do seu saldo.`;
	}
	return `${text} A divisão também é apagada — e as entradas de ${formatMoney(total)} de quem já pagou saem junto do seu saldo.`;
}

export type DeleteScope = "ONLY_THIS" | "THIS_AND_NEXT";

/** Série com ocorrências depois desta pergunta "Só esta" ou "Esta e as próximas". */
export function asksScope(tx: Pick<DetailTransaction, "series">) {
	return Boolean(tx.series?.nextDate);
}

/** Título, opções e botão da folha 3.3 "apagar recorrente". */
export function scopeSheet(tx: DetailTransaction) {
	const series = tx.series as DetailSeries;
	const installment = series.kind === "INSTALLMENT";
	const effect =
		tx.kind === "INCOME"
			? countsToday(tx)
				? `${formatMoney(tx.amountCents)} sai do saldo`
				: "ainda não tinha entrado no saldo"
			: countsToday(tx)
				? `${formatMoney(tx.amountCents)} volta para o saldo`
				: "ainda não tinha saído do saldo";
	const first = series.index === 1;

	if (installment && series.count) {
		return {
			title: "Apagar quais parcelas?",
			only: {
				title: "Só esta",
				desc: `Parcela ${series.index} de ${series.count} · ${effect}`,
			},
			next: {
				title: first ? "Todas as parcelas" : "Esta e as próximas",
				desc: first
					? `Parcelas 1 a ${series.count}`
					: `Parcelas ${series.index} a ${series.count} · as anteriores continuam`,
			},
			button: (scope: DeleteScope) =>
				scope === "ONLY_THIS" ? "Apagar parcela" : "Apagar parcelas",
		};
	}
	return {
		title: "Apagar quais repetições?",
		only: {
			title: "Só esta",
			desc: `A de ${formatShortDate(tx.date)} · ${effect}`,
		},
		next: {
			title: first ? "Todas" : "Esta e as próximas",
			desc: first
				? "A repetição inteira"
				: `De ${formatShortDate(tx.date)} em diante · as anteriores continuam`,
		},
		button: () => "Apagar",
	};
}

/** Aviso depois de apagar: "Saída apagada · R$ 85,50" ou "3 saídas apagadas". */
export function deletedToast(kind: Kind, deleted: number, amountCents: number) {
	if (deleted <= 1) {
		return {
			title: kind === "INCOME" ? "Entrada apagada" : "Saída apagada",
			detail: formatMoney(amountCents),
		};
	}
	return {
		title: `${deleted} ${kind === "INCOME" ? "entradas apagadas" : "saídas apagadas"}`,
		detail: null,
	};
}
