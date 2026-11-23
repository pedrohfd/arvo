import type { Database } from "./index";

// Categorias criadas no cadastro. A pessoa pode renomear, trocar o ícone e apagar (menos as que
// têm `systemKey`, que o app precisa achar mesmo renomeadas). Ícones são nomes do Phosphor.
export const REIMBURSEMENT_KEY = "reimbursement";

export const DEFAULT_CATEGORIES = [
	{ kind: "EXPENSE", name: "Mercado", icon: "shopping-cart" },
	{ kind: "EXPENSE", name: "Restaurantes", icon: "fork-knife" },
	{ kind: "EXPENSE", name: "Transporte", icon: "car" },
	{ kind: "EXPENSE", name: "Moradia", icon: "house" },
	{ kind: "EXPENSE", name: "Contas", icon: "lightning" },
	{ kind: "EXPENSE", name: "Saúde", icon: "first-aid" },
	{ kind: "EXPENSE", name: "Lazer", icon: "film-strip" },
	{ kind: "EXPENSE", name: "Compras", icon: "shopping-bag" },
	{ kind: "EXPENSE", name: "Outros", icon: "dots-three" },
	{ kind: "INCOME", name: "Salário", icon: "briefcase" },
	{
		kind: "INCOME",
		name: "Reembolso",
		icon: "arrow-u-up-left",
		systemKey: REIMBURSEMENT_KEY,
	},
	{ kind: "INCOME", name: "Outras entradas", icon: "plus-circle" },
] as const satisfies readonly {
	kind: "EXPENSE" | "INCOME";
	name: string;
	icon: string;
	systemKey?: string;
}[];

export async function createDefaultCategories(db: Database, userId: string) {
	await db.category.createMany({
		data: DEFAULT_CATEGORIES.map((category) => ({ userId, ...category })),
		skipDuplicates: true,
	});
}
