import type { Database } from "./index";

// Categorias criadas no cadastro, como no Figma (6.3 Categorias e "Todas as categorias"). A pessoa
// pode renomear, trocar o ícone e apagar (menos as que têm `systemKey`, que o app precisa achar
// mesmo renomeadas). Ícones são nomes do Phosphor.
export const REIMBURSEMENT_KEY = "reimbursement";

export const DEFAULT_CATEGORIES = [
	{ kind: "EXPENSE", name: "Mercado", icon: "shopping-cart" },
	{ kind: "EXPENSE", name: "Restaurante", icon: "fork-knife" },
	{ kind: "EXPENSE", name: "Transporte", icon: "car" },
	{ kind: "EXPENSE", name: "Casa", icon: "house" },
	{ kind: "EXPENSE", name: "Saúde", icon: "pill" },
	{ kind: "EXPENSE", name: "Lazer", icon: "film-strip" },
	{ kind: "EXPENSE", name: "Presentes", icon: "tag" },
	{ kind: "EXPENSE", name: "Educação", icon: "receipt" },
	{ kind: "EXPENSE", name: "Plantas", icon: "plant" },
	{ kind: "INCOME", name: "Salário", icon: "briefcase" },
	{ kind: "INCOME", name: "Extra", icon: "money" },
	{
		kind: "INCOME",
		name: "Reembolso",
		icon: "arrow-clockwise",
		systemKey: REIMBURSEMENT_KEY,
	},
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
