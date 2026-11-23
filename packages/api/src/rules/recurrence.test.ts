import { describe, expect, test } from "bun:test";

import {
	affectedOccurrences,
	generateOccurrences,
	installmentLabel,
	installmentTotalCents,
	lastOccurrenceDate,
	MAX_SERIES_COUNT,
	openEndedHorizon,
	renewOccurrences,
	type SeriesSpec,
} from "./recurrence";

const HOJE = "2026-11-18";

const repetir = (
	startDate: string,
	count: number | null,
	intervalMonths = 1,
	anchorDay?: number,
): SeriesSpec => ({
	kind: "RECURRING",
	startDate,
	intervalMonths,
	count,
	anchorDay,
});

const parcelar = (startDate: string, count: number): SeriesSpec => ({
	kind: "INSTALLMENT",
	startDate,
	intervalMonths: 1,
	count,
});

const datas = (spec: SeriesSpec, reference = HOJE) =>
	generateOccurrences(spec, reference).map((o) => o.date);

describe("recorrência", () => {
	test('gera 3 ocorrências no mesmo dia de cada mês ao repetir "todo mês" por 3 meses', () => {
		expect(generateOccurrences(repetir("2026-11-15", 3), HOJE)).toEqual([
			{ index: 1, date: "2026-11-15" },
			{ index: 2, date: "2026-12-15" },
			{ index: 3, date: "2027-01-15" },
		]);
	});

	test("usa o último dia dos meses menores numa série iniciada no dia 31", () => {
		expect(datas(repetir("2027-01-31", 4))).toEqual([
			"2027-01-31",
			"2027-02-28",
			"2027-03-31",
			"2027-04-30",
		]);
	});

	test("cai em 29/02 no ano bissexto, tanto na série do dia 31 quanto na do dia 29", () => {
		expect(datas(repetir("2028-01-31", 2))).toEqual([
			"2028-01-31",
			"2028-02-29",
		]);
		expect(datas(repetir("2028-02-29", 5, 12))).toEqual([
			"2028-02-29",
			"2029-02-28",
			"2030-02-28",
			"2031-02-28",
			"2032-02-29",
		]);
	});

	test("vira o ano: série de 15/11 por 4 meses gera 15/11, 15/12, 15/01, 15/02", () => {
		expect(datas(repetir("2026-11-15", 4))).toEqual([
			"2026-11-15",
			"2026-12-15",
			"2027-01-15",
			"2027-02-15",
		]);
	});

	test('numera as parcelas como "parcela 3/10"', () => {
		expect(installmentLabel(3, 10)).toBe("parcela 3/10");
		expect(installmentLabel(1, 1)).toBe("parcela 1/1");
		expect(() => installmentLabel(0, 10)).toThrow();
		expect(() => installmentLabel(11, 10)).toThrow();
	});

	test("gera 10 parcelas de R$ 50,00 no parcelamento, sem divisão nem sobra de centavos", () => {
		const parcelas = generateOccurrences(parcelar("2026-11-18", 10), HOJE);
		expect(parcelas).toHaveLength(10);
		expect(parcelas.map((p) => p.index)).toEqual([
			1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
		]);
		expect(parcelas[0]?.date).toBe("2026-11-18");
		expect(parcelas[9]?.date).toBe("2027-08-18");
		expect(installmentTotalCents(5_000, 10)).toBe(50_000);
	});

	test("dá erro no parcelamento sem quantidade, com parcela zerada ou acima do máximo", () => {
		expect(() =>
			generateOccurrences({ ...parcelar("2026-11-18", 3), count: null }, HOJE),
		).toThrow();
		expect(() => installmentTotalCents(0, 3)).toThrow();
		expect(() => installmentTotalCents(1_000_000_000, 3)).toThrow();
		expect(() => installmentTotalCents(5_000, 0)).toThrow();
	});

	test('repete a cada 12 meses (licenciamento em 10/03) e "sem fim" gera 2 ocorrências em 24 meses', () => {
		const licenciamento = repetir("2027-03-10", null, 12);
		expect(datas(licenciamento, "2026-11-23")).toEqual([
			"2027-03-10",
			"2028-03-10",
		]);
	});

	test("repete a cada 3 meses a partir de 31/01 sem perder o dia âncora", () => {
		expect(datas(repetir("2026-01-31", 4, 3))).toEqual([
			"2026-01-31",
			"2026-04-30",
			"2026-07-31",
			"2026-10-31",
		]);
	});

	test('"sem fim" gera até o fim do 24º mês à frente e nada além disso', () => {
		const mensal = generateOccurrences(repetir("2026-11-18", null), HOJE);
		expect(openEndedHorizon(HOJE)).toBe("2028-11-30");
		expect(mensal).toHaveLength(25);
		expect(mensal[24]).toEqual({ index: 25, date: "2028-11-18" });
		// A próxima (18/12/2028) já passa do horizonte.
		expect(mensal.every((o) => o.date <= "2028-11-30")).toBe(true);
	});

	test("renova uma série sem fim acrescentando só as ocorrências novas, sem duplicar", () => {
		const spec = repetir("2026-11-18", null);
		const inicial = generateOccurrences(spec, HOJE);

		// No mesmo dia não há o que acrescentar.
		expect(renewOccurrences(spec, inicial.length, HOJE)).toEqual([]);

		// Um mês depois entra só a ocorrência de 18/12/2028.
		const depois = "2026-12-18";
		const novas = renewOccurrences(spec, inicial.length, depois);
		expect(novas).toEqual([{ index: 26, date: "2028-12-18" }]);

		// Renovar de novo não repete.
		expect(renewOccurrences(spec, 26, depois)).toEqual([]);

		// Gerar tudo de uma vez na data nova dá o mesmo que a série inicial mais a renovação.
		expect(generateOccurrences(spec, depois)).toEqual([...inicial, ...novas]);
	});

	test("inclui a ocorrência que cai exatamente no último dia do horizonte de 24 meses", () => {
		// Começa em 30/11: a 25ª ocorrência é 30/11/2028, o último dia do horizonte.
		const mensal = generateOccurrences(repetir("2026-11-30", null), HOJE);
		expect(mensal).toHaveLength(25);
		expect(mensal[24]?.date).toBe("2028-11-30");
	});

	test("não renova uma série com fim", () => {
		expect(renewOccurrences(repetir("2026-11-18", 3), 3, "2030-01-01")).toEqual(
			[],
		);
	});

	test('edita "só esta" mexendo só naquela ocorrência', () => {
		const ocorrencias = generateOccurrences(repetir("2026-11-18", 6), HOJE);
		expect(affectedOccurrences(ocorrencias, 3, "ONLY_THIS")).toEqual([
			{ index: 3, date: "2027-01-18" },
		]);
	});

	test('edita "esta e as próximas" mexendo naquela e nas seguintes, nunca nas anteriores', () => {
		const ocorrencias = generateOccurrences(repetir("2026-11-18", 6), HOJE);
		const afetadas = affectedOccurrences(ocorrencias, 3, "THIS_AND_NEXT");
		expect(afetadas.map((o) => o.index)).toEqual([3, 4, 5, 6]);
	});

	test("apagar usa o mesmo alcance: só esta, ou esta e as próximas, nunca as anteriores", () => {
		const ocorrencias = generateOccurrences(repetir("2026-11-18", 6), HOJE);
		expect(affectedOccurrences(ocorrencias, 6, "THIS_AND_NEXT")).toHaveLength(
			1,
		);
		expect(affectedOccurrences(ocorrencias, 1, "THIS_AND_NEXT")).toHaveLength(
			6,
		);
		expect(affectedOccurrences(ocorrencias, 1, "ONLY_THIS")).toHaveLength(1);
	});

	test("nunca altera ocorrências já passadas ao editar a série a partir de uma futura", () => {
		// Série iniciada em setembro: set, out e nov (hoje) já passaram ou são de hoje.
		const ocorrencias = generateOccurrences(repetir("2026-09-18", 6), HOJE);
		const alvo = ocorrencias.find((o) => o.date > HOJE);
		expect(alvo?.date).toBe("2026-12-18");
		const afetadas = affectedOccurrences(
			ocorrencias,
			alvo?.index ?? -1,
			"THIS_AND_NEXT",
		);
		expect(afetadas.every((o) => o.date > HOJE)).toBe(true);
		expect(afetadas.map((o) => o.date)).toEqual([
			"2026-12-18",
			"2027-01-18",
			"2027-02-18",
		]);
	});

	test("dá erro ao editar uma ocorrência que não existe na série", () => {
		const ocorrencias = generateOccurrences(repetir("2026-11-18", 3), HOJE);
		expect(() => affectedOccurrences(ocorrencias, 9, "ONLY_THIS")).toThrow();
	});

	test("informa a data da última ocorrência de uma série com fim, e nada se for sem fim", () => {
		expect(lastOccurrenceDate(parcelar("2026-11-18", 10))).toBe("2027-08-18");
		expect(lastOccurrenceDate(repetir("2026-11-18", null))).toBeNull();
	});

	test("aceita a quantidade máxima de ocorrências e a de parcelas igual ao total", () => {
		expect(
			generateOccurrences(repetir("2026-11-18", MAX_SERIES_COUNT), HOJE),
		).toHaveLength(MAX_SERIES_COUNT);
		expect(installmentLabel(10, 10)).toBe("parcela 10/10");
	});

	test("rejeita série com periodicidade, quantidade ou dia âncora inválidos", () => {
		expect(() =>
			generateOccurrences(repetir("2026-11-18", 3, 0), HOJE),
		).toThrow();
		expect(() =>
			generateOccurrences(repetir("2026-11-18", 3, 1.5), HOJE),
		).toThrow();
		expect(() => generateOccurrences(repetir("2026-11-18", 0), HOJE)).toThrow();
		expect(() =>
			generateOccurrences(repetir("2026-11-18", MAX_SERIES_COUNT + 1), HOJE),
		).toThrow();
		expect(() =>
			generateOccurrences(repetir("2026-11-18", 3, 1, 32), HOJE),
		).toThrow();
		expect(() => generateOccurrences(repetir("2026-02-30", 3), HOJE)).toThrow();
	});
});
