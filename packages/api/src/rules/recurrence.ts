import {
	addMonths,
	type CalendarDate,
	compareDates,
	lastDayOfMonth,
	parseDate,
} from "./dates";
import { assertPositiveAmount } from "./money";

// Séries de transações: "repetir" (RECURRING) e parcelamento no crédito (INSTALLMENT).
//
// As ocorrências são geradas ao criar. "Sem fim" (`count` nulo) gera até o fim do 24º mês à frente
// e é renovada depois para manter sempre 24 à frente (P2). O valor digitado é sempre o de cada
// ocorrência: R$ 50,00 repetido 10 vezes são 10 ocorrências de R$ 50,00.

export type SeriesKind = "RECURRING" | "INSTALLMENT";

export type SeriesSpec = {
	kind: SeriesKind;
	/** Data da primeira ocorrência. */
	startDate: CalendarDate;
	/** A cada quantos meses: 1 = todo mês, 3 = a cada 3 meses, 12 = uma vez por ano. */
	intervalMonths: number;
	/** Quantidade de ocorrências; nulo = sem fim (só em RECURRING). */
	count: number | null;
	/** Dia do mês de cada ocorrência (1 a 31). Sem ele, vale o dia de `startDate`. */
	anchorDay?: number;
};

export type Occurrence = {
	/** Posição na série, a partir de 1. */
	index: number;
	date: CalendarDate;
};

/** Quantos meses à frente uma série sem fim é mantida (P2: igual ao seletor de mês). */
export const OPEN_ENDED_MONTHS_AHEAD = 24;

/** Limite de ocorrências numa série com fim, para não gerar milhares de linhas por engano. */
export const MAX_SERIES_COUNT = 600;

function validate(spec: SeriesSpec) {
	parseDate(spec.startDate);
	if (!Number.isInteger(spec.intervalMonths) || spec.intervalMonths < 1) {
		throw new Error("A periodicidade precisa ser de pelo menos 1 mês");
	}
	if (
		spec.anchorDay !== undefined &&
		(!Number.isInteger(spec.anchorDay) ||
			spec.anchorDay < 1 ||
			spec.anchorDay > 31)
	) {
		throw new Error(`Dia âncora inválido: ${spec.anchorDay}`);
	}
	if (spec.count === null) {
		if (spec.kind === "INSTALLMENT") {
			throw new Error("Parcelamento precisa de quantidade de parcelas");
		}
		return;
	}
	if (
		!Number.isInteger(spec.count) ||
		spec.count < 1 ||
		spec.count > MAX_SERIES_COUNT
	) {
		throw new Error(
			`A quantidade precisa ser um inteiro de 1 a ${MAX_SERIES_COUNT}`,
		);
	}
}

function dateAt(spec: SeriesSpec, index: number) {
	return addMonths(
		spec.startDate,
		(index - 1) * spec.intervalMonths,
		spec.anchorDay,
	);
}

/** Último dia do mês que fica 24 meses à frente da data de referência. */
export function openEndedHorizon(reference: CalendarDate): CalendarDate {
	return lastDayOfMonth(addMonths(reference, OPEN_ENDED_MONTHS_AHEAD));
}

// Todas as ocorrências de uma série. Com `count`, exatamente essa quantidade; sem fim, as que
// caem até o horizonte de 24 meses à frente de `reference`.
export function generateOccurrences(
	spec: SeriesSpec,
	reference: CalendarDate,
): Occurrence[] {
	validate(spec);
	if (spec.count !== null) {
		return Array.from({ length: spec.count }, (_, i) => ({
			index: i + 1,
			date: dateAt(spec, i + 1),
		}));
	}
	return occurrencesUntilHorizon(spec, 1, reference);
}

// Renovação de uma série sem fim: só as ocorrências novas, a partir de `lastIndex + 1`, sem
// repetir as que já existem. Série com fim não renova.
export function renewOccurrences(
	spec: SeriesSpec,
	lastIndex: number,
	reference: CalendarDate,
): Occurrence[] {
	validate(spec);
	if (!Number.isInteger(lastIndex) || lastIndex < 0) {
		throw new Error("lastIndex precisa ser um inteiro a partir de 0");
	}
	if (spec.count !== null) return [];
	return occurrencesUntilHorizon(spec, lastIndex + 1, reference);
}

function occurrencesUntilHorizon(
	spec: SeriesSpec,
	firstIndex: number,
	reference: CalendarDate,
) {
	const horizon = openEndedHorizon(reference);
	const result: Occurrence[] = [];
	for (let index = firstIndex; ; index++) {
		const date = dateAt(spec, index);
		if (compareDates(date, horizon) > 0) break;
		result.push({ index, date });
	}
	return result;
}

/** Data da última ocorrência de uma série com fim; nulo se for sem fim. */
export function lastOccurrenceDate(spec: SeriesSpec): CalendarDate | null {
	validate(spec);
	return spec.count === null ? null : dateAt(spec, spec.count);
}

/** "parcela 3/10" */
export function installmentLabel(index: number, count: number) {
	if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1) {
		throw new Error("Parcela e quantidade precisam ser inteiros");
	}
	if (index < 1 || index > count) {
		throw new Error(
			`A parcela ${index} não existe num parcelamento de ${count}`,
		);
	}
	return `parcela ${index}/${count}`;
}

/** Soma de todas as parcelas: valor da parcela × quantidade. */
export function installmentTotalCents(amountCents: number, count: number) {
	assertPositiveAmount(amountCents, "valor da parcela");
	if (!Number.isInteger(count) || count < 1) {
		throw new Error("Parcelamento precisa de pelo menos 1 parcela");
	}
	return amountCents * count;
}

export type EditScope = "ONLY_THIS" | "THIS_AND_NEXT";

// Quais ocorrências um editar ou apagar atinge: "só esta" mexe só na escolhida; "esta e as
// próximas" na escolhida e nas seguintes. As anteriores nunca mudam.
export function affectedOccurrences(
	occurrences: readonly Occurrence[],
	targetIndex: number,
	scope: EditScope,
): Occurrence[] {
	if (!occurrences.some((occurrence) => occurrence.index === targetIndex)) {
		throw new Error(`A ocorrência ${targetIndex} não existe na série`);
	}
	return occurrences.filter((occurrence) =>
		scope === "ONLY_THIS"
			? occurrence.index === targetIndex
			: occurrence.index >= targetIndex,
	);
}
