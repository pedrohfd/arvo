import { addMonths, type CalendarDate, parseDate } from "../rules/dates";

// "Editar esta e as próximas" com outra data: a ocorrência editada passa para `newDate` e as
// seguintes a acompanham, mês a mês, pelo novo dia âncora. As anteriores nunca mudam. A série
// também guarda o novo dia e uma data de início "reconstruída", para a renovação de uma série sem
// fim continuar do mesmo ponto (a data da ocorrência N é sempre início + (N − 1) períodos).
export function planDateShift(input: {
	editedIndex: number;
	newDate: CalendarDate;
	intervalMonths: number;
}) {
	const { editedIndex, newDate, intervalMonths } = input;
	const anchorDay = parseDate(newDate).day;
	return {
		anchorDay,
		startDate: addMonths(
			newDate,
			-(editedIndex - 1) * intervalMonths,
			anchorDay,
		),
		dateFor: (index: number) =>
			addMonths(newDate, (index - editedIndex) * intervalMonths, anchorDay),
	};
}
