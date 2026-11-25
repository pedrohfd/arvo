import type { AppRouter } from "@arvo/api/routers/index";
import {
	CaretLeftIcon,
	CaretRightIcon,
	PlusIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";

import { SwipeRow } from "@/components/card/swipe-row";
import { CategoryDeleteSheet } from "@/components/category/category-delete-sheet";
import { CategoryFormSheet } from "@/components/category/category-form-sheet";
import { CategoryIcon } from "@/components/category-icon";
import { transactionCountLabel } from "@/lib/category-form";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/perfil/categorias")({
	component: Categorias,
});

type Category = inferRouterOutputs<AppRouter>["category"]["list"][number];

// Tela 6.3 do Figma (página "Arvo · 6 Perfil"): categorias de saída e de entrada com quantas
// transações usam cada uma, "Nova categoria" e "Apagar categoria" (com o destino das transações).
// Como nos cartões, deslizar a linha para a direita edita; para a esquerda, apaga. As categorias
// que o app usa (ex.: Reembolso) só editam: apagar quebraria o app.
function Categorias() {
	const categories = useQuery(trpc.category.list.queryOptions());
	// Folha aberta: o formulário (nova, ou editar se vier a categoria) ou a de apagar.
	const [sheet, setSheet] = useState<
		| { kind: "form"; category?: Category }
		| { kind: "delete"; category: Category }
		| null
	>(null);

	const onNew = () => setSheet({ kind: "form" });
	const list = categories.data;

	return (
		<div className="perfil-screen mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			<div className="perfil-back-bar flex h-12 items-center pt-1 pr-3 pl-2">
				<Link to="/perfil" className="icon-btn" aria-label="Voltar">
					<CaretLeftIcon size={22} aria-hidden />
				</Link>
			</div>

			{categories.isError ? (
				<>
					<Title />
					<Problem onRetry={() => categories.refetch()} />
				</>
			) : !list ? (
				<>
					<Title />
					<Loading />
				</>
			) : (
				<>
					<Title onNew={onNew} />
					<div className="flex flex-col gap-5 px-5 pt-4 pb-32">
						<Group
							title="Saídas"
							categories={list.filter(
								(category) => category.kind === "EXPENSE",
							)}
							onEdit={(category) => setSheet({ kind: "form", category })}
							onDelete={(category) => setSheet({ kind: "delete", category })}
						/>
						<Group
							title="Entradas"
							categories={list.filter((category) => category.kind === "INCOME")}
							onEdit={(category) => setSheet({ kind: "form", category })}
							onDelete={(category) => setSheet({ kind: "delete", category })}
						/>
					</div>
				</>
			)}

			{sheet?.kind === "form" && list ? (
				<CategoryFormSheet
					category={sheet.category}
					existing={list}
					onClose={() => setSheet(null)}
				/>
			) : null}
			{sheet?.kind === "delete" && list ? (
				<CategoryDeleteSheet
					category={sheet.category}
					categories={list}
					onClose={() => setSheet(null)}
				/>
			) : null}
		</div>
	);
}

function Title({ onNew }: { onNew?: () => void }) {
	return (
		<div className="flex h-10 items-center justify-between px-5">
			<h1 className="display text-(length:--text-size-display) leading-[var(--text-leading-display)]">
				Categorias
			</h1>
			{onNew ? (
				<button
					type="button"
					className="month-btn !h-10 !px-4 !gap-2 font-semibold text-[var(--color-text)]"
					onClick={onNew}
				>
					<PlusIcon size={18} aria-hidden />
					Nova
				</button>
			) : null}
		</div>
	);
}

function Group({
	title,
	categories,
	onEdit,
	onDelete,
}: {
	title: string;
	categories: Category[];
	onEdit: (category: Category) => void;
	onDelete: (category: Category) => void;
}) {
	return (
		<section className="setting-group">
			<h2 className="setting-group__title">{title}</h2>
			<div className="setting-group__body">
				{categories.map((category) => (
					<SwipeRow
						key={category.id}
						variant="row"
						hint={
							category.systemKey
								? `Seta para a direita edita ${category.name}.`
								: `Seta para a direita edita ${category.name}; seta para a esquerda apaga.`
						}
						onSwipeRight={() => onEdit(category)}
						onSwipeLeft={
							category.systemKey ? undefined : () => onDelete(category)
						}
					>
						<span className="setting-row__icon">
							<CategoryIcon name={category.icon} size={24} />
						</span>
						<span className="setting-row__text">
							<span className="setting-row__title">{category.name}</span>
						</span>
						<span className="setting-row__value">
							{transactionCountLabel(category.transactionCount)}
						</span>
						<CaretRightIcon
							size={18}
							className="setting-row__chevron"
							aria-hidden
						/>
					</SwipeRow>
				))}
			</div>
		</section>
	);
}

// Carregando, com o mesmo desenho da lista.
function Loading() {
	return (
		<div
			className="flex flex-col gap-5 px-5 pt-4"
			role="status"
			aria-busy="true"
			aria-label="Carregando"
		>
			{[4, 2].map((rows) => (
				<div
					key={rows}
					className="flex flex-col gap-1 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-1"
				>
					{Array.from({ length: rows }, (_, i) => i).map((i) => (
						<div key={i} className="flex h-14 items-center gap-3 px-3">
							<div className="skel !rounded-full size-9" />
							<div className="skel h-3 w-[120px]" />
						</div>
					))}
				</div>
			))}
		</div>
	);
}

// Não carregou.
function Problem({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex flex-1 items-center justify-center pb-24">
			<div className="empty empty--problem">
				<span className="empty__icon">
					<WarningCircleIcon size={28} aria-hidden />
				</span>
				<h2 className="empty__title">Não deu pra carregar</h2>
				<p className="empty__text">
					Seus dados estão salvos. Foi a conexão com o arvo que falhou agora.
				</p>
				<button
					type="button"
					className="btn-secondary empty__action"
					onClick={onRetry}
				>
					Tentar de novo
				</button>
			</div>
		</div>
	);
}
