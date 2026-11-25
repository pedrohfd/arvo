import { describe, expect, test } from "bun:test";

import {
	isSettled,
	markSplitPaid,
	receivable,
	reimbursementIdsToDelete,
	type SplitState,
	unmarkSplitPaid,
} from "./settlement";
import { splitBill } from "./split";

const parte = (
	personId: string,
	amountCents: number,
	paidAt: string | null = null,
	reimbursementId: string | null = null,
): SplitState => ({ personId, amountCents, paidAt, reimbursementId });

describe("reembolso ao marcar pago", () => {
	test("cria uma entrada de Reembolso com o valor da parte e a data do pagamento ao marcar que a pessoa pagou", () => {
		const r = markSplitPaid(parte("camilly", 2_850), {
			paidAt: "2026-11-20",
			createReimbursement: true,
		});
		expect(r.split.paidAt).toBe("2026-11-20");
		expect(r.reimbursement).toEqual({ amountCents: 2_850, date: "2026-11-20" });
	});

	test("marca como pago e não cria entrada com a opção desligada (pagou em dinheiro)", () => {
		const r = markSplitPaid(parte("camilly", 2_850), {
			paidAt: "2026-11-20",
			createReimbursement: false,
		});
		expect(r.split.paidAt).toBe("2026-11-20");
		expect(r.reimbursement).toBeNull();
	});

	test("dá erro ao marcar como paga uma parte que já está paga", () => {
		expect(() =>
			markSplitPaid(parte("camilly", 2_850, "2026-11-19"), {
				paidAt: "2026-11-20",
				createReimbursement: true,
			}),
		).toThrow();
	});

	test("remove a entrada de reembolso gerada ao desmarcar o pagamento", () => {
		const r = unmarkSplitPaid(
			parte("camilly", 2_850, "2026-11-20", "tx-reembolso"),
		);
		expect(r.split.paidAt).toBeNull();
		expect(r.split.reimbursementId).toBeNull();
		expect(r.removeReimbursementId).toBe("tx-reembolso");
	});

	test("não remove entrada nenhuma ao desmarcar um pagamento feito em dinheiro", () => {
		const r = unmarkSplitPaid(parte("camilly", 2_850, "2026-11-20", null));
		expect(r.split.paidAt).toBeNull();
		expect(r.removeReimbursementId).toBeNull();
	});

	test("dá erro ao desmarcar uma parte que não estava paga", () => {
		expect(() => unmarkSplitPaid(parte("camilly", 2_850))).toThrow();
	});

	test("apaga as entradas de reembolso geradas ao apagar a saída dividida", () => {
		const ids = reimbursementIdsToDelete([
			parte("camilly", 2_850, "2026-11-20", "tx-a"),
			parte("thalles", 2_850, "2026-11-21", null), // pagou em dinheiro: sem entrada
			parte("ana", 2_850), // ainda deve
			parte("bia", 2_850, "2026-11-22", "tx-b"),
		]);
		expect(ids).toEqual(["tx-a", "tx-b"]);
	});

	test('soma em "a receber" só as partes ainda não pagas, por pessoa', () => {
		const r = receivable([
			parte("camilly", 2_850),
			parte("camilly", 1_000),
			parte("thalles", 2_850, "2026-11-20"), // já pagou
			parte("ana", 500),
		]);
		expect(r.totalCents).toBe(4_350);
		expect(r.byPerson).toEqual([
			{ personId: "camilly", totalCents: 3_850 },
			{ personId: "ana", totalCents: 500 },
		]);
	});

	test('mostra "a receber" 0 e "Tudo acertado" quando todos pagaram', () => {
		const partes = [
			parte("camilly", 2_850, "2026-11-20"),
			parte("thalles", 2_850, "2026-11-21"),
		];
		expect(receivable(partes)).toEqual({ totalCents: 0, byPerson: [] });
		expect(isSettled(partes)).toBe(true);
	});

	test("não considera acertada uma saída sem divisão, nem uma com parte pendente", () => {
		expect(isSettled([])).toBe(false);
		expect(isSettled([parte("a", 100, "2026-11-20"), parte("b", 100)])).toBe(
			false,
		);
	});

	test("nunca inclui a parte do próprio usuário em a receber", () => {
		// 85,50 entre você e mais 2: a sua parte (28,50) não existe entre as divisões.
		const { othersCents, yourShareCents } = splitBill(8_550, 3);
		const divisoes = othersCents.map((valor, i) => parte(`pessoa-${i}`, valor));
		const { totalCents } = receivable(divisoes);
		expect(totalCents).toBe(5_700);
		expect(totalCents + yourShareCents).toBe(8_550);
	});
});
