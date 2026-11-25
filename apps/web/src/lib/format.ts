// Dinheiro e datas para a tela. Dinheiro é sempre centavos inteiros; datas são dias de calendário
// "AAAA-MM-DD" (sem fuso). "Hoje" vem do servidor (Brasília), nunca do relógio do aparelho.

const MONTHS = [
	"janeiro",
	"fevereiro",
	"março",
	"abril",
	"maio",
	"junho",
	"julho",
	"agosto",
	"setembro",
	"outubro",
	"novembro",
	"dezembro",
];

const MONTHS_SHORT = [
	"jan.",
	"fev.",
	"mar.",
	"abr.",
	"mai.",
	"jun.",
	"jul.",
	"ago.",
	"set.",
	"out.",
	"nov.",
	"dez.",
];

const WEEKDAYS_SHORT = ["Dom.", "Seg.", "Ter.", "Qua.", "Qui.", "Sex.", "Sáb."];

function groupThousands(value: number) {
	return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Partes de um valor em reais: `R$ 1.234` e `,56` (o saldo grande mostra os centavos menores). */
export function moneyParts(cents: number) {
	const abs = Math.abs(cents);
	const reais = Math.floor(abs / 100);
	const centavos = String(abs % 100).padStart(2, "0");
	return {
		negative: cents < 0,
		integer: `${cents < 0 ? "−" : ""}R$ ${groupThousands(reais)}`,
		cents: `,${centavos}`,
	};
}

/** "R$ 1.234,56"; negativo com "−". */
export function formatMoney(cents: number) {
	const parts = moneyParts(cents);
	return `${parts.integer}${parts.cents}`;
}

/** Valor com sinal e espaço, como nas linhas do Figma: "− R$ 120,00" e "+ R$ 4.000,00". */
export function formatSigned(cents: number) {
	if (cents === 0) return formatMoney(0);
	return `${cents < 0 ? "−" : "+"} ${formatMoney(Math.abs(cents))}`;
}

/** "27/11" */
export function formatShortDate(date: string) {
	const [, month, day] = date.split("-");
	return `${day}/${month}`;
}

/** "Novembro" para o seletor de mês. `month` é "AAAA-MM". */
export function monthName(month: string) {
	const name = MONTHS[Number(month.slice(5, 7)) - 1] ?? "";
	return name.charAt(0).toUpperCase() + name.slice(1);
}

/** "nov." para "Entrou em nov.". `month` é "AAAA-MM". */
export function monthShort(month: string) {
	return MONTHS_SHORT[Number(month.slice(5, 7)) - 1] ?? "";
}

/** "Hoje", "Ontem", "Amanhã" ou "Seg., 16 de nov." (com o ano se não for o de hoje). */
export function dayLabel(date: string, today: string) {
	const diff = dayNumber(date) - dayNumber(today);
	if (diff === 0) return "Hoje";
	if (diff === -1) return "Ontem";
	if (diff === 1) return "Amanhã";
	return weekdayLabel(date, today);
}

/** Sempre com o dia da semana: "Seg., 16 de nov." (com o ano se não for o de hoje). */
export function weekdayLabel(date: string, today: string) {
	const [year, month, day] = date.split("-").map(Number) as [
		number,
		number,
		number,
	];
	const weekday =
		WEEKDAYS_SHORT[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
	const label = `${weekday}, ${day} de ${MONTHS_SHORT[month - 1]}`;
	return year === Number(today.slice(0, 4)) ? label : `${label} ${year}`;
}

/** "17 de dez." (com o ano se não for o de hoje). */
export function dayMonthLabel(date: string, today: string) {
	const [year, month, day] = date.split("-").map(Number) as [
		number,
		number,
		number,
	];
	const label = `${day} de ${MONTHS_SHORT[month - 1]}`;
	return year === Number(today.slice(0, 4)) ? label : `${label} ${year}`;
}

/** "jun. de 2027" */
export function monthYearLabel(date: string) {
	return `${MONTHS_SHORT[Number(date.slice(5, 7)) - 1]} de ${date.slice(0, 4)}`;
}

// Dias desde 1970 só para comparar datas de calendário (UTC evita fuso e horário de verão).
function dayNumber(date: string) {
	const [year, month, day] = date.split("-").map(Number) as [
		number,
		number,
		number,
	];
	return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}
