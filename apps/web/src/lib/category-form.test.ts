import { describe, expect, test } from "bun:test";

import { transactionCountLabel, validateCategoryName } from "./category-form";

const existing = [
	{ id: "1", name: "Mercado", kind: "EXPENSE" as const },
	{ id: "2", name: "Salário", kind: "INCOME" as const },
];

describe("contagem de transações", () => {
	test("nenhuma, uma e várias", () => {
		expect(transactionCountLabel(0)).toBe("Nenhuma");
		expect(transactionCountLabel(1)).toBe("1 transação");
		expect(transactionCountLabel(2)).toBe("2 transações");
	});
});

describe("nome da categoria", () => {
	test("nome livre é válido", () => {
		expect(
			validateCategoryName({ name: "Presentes", kind: "EXPENSE", existing }),
		).toBeNull();
	});

	test("nome vazio é erro", () => {
		expect(
			validateCategoryName({ name: "  ", kind: "EXPENSE", existing }),
		).toBe("Dê um nome à categoria");
	});

	test("repetido no mesmo tipo é erro, sem ligar para maiúsculas nem espaços", () => {
		expect(
			validateCategoryName({ name: " mercado ", kind: "EXPENSE", existing }),
		).toBe("Já existe uma categoria chamada mercado.");
	});

	test("o mesmo nome em outro tipo é válido", () => {
		expect(
			validateCategoryName({ name: "Mercado", kind: "INCOME", existing }),
		).toBeNull();
	});

	test("ao editar, a própria categoria não conta como repetida", () => {
		expect(
			validateCategoryName({
				name: "Mercado",
				kind: "EXPENSE",
				existing,
				editingId: "1",
			}),
		).toBeNull();
	});
});
