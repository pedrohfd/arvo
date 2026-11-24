import type { AppRouter } from "@arvo/api/routers/index";
import {
	CaretLeftIcon,
	PlusIcon,
	UserIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";

import { SwipeRow } from "@/components/card/swipe-row";
import {
	PersonDeleteSheet,
	PersonFormSheet,
} from "@/components/person/person-sheets";
import { formatMoney } from "@/lib/format";
import { owedLabel } from "@/lib/person-form";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/perfil/pessoas")({
	component: Pessoas,
});

type Person = inferRouterOutputs<AppRouter>["person"]["list"][number];

// Tela 6.4: as pessoas de "Dividir a conta" (só nomes) e quanto cada uma ainda deve. Deslizar a
// linha para a direita renomeia; para a esquerda apaga (quem já aparece numa divisão não se apaga).
function Pessoas() {
	const people = useQuery(trpc.person.list.queryOptions());
	const [sheet, setSheet] = useState<
		| { kind: "form"; person?: Person }
		| { kind: "delete"; person: Person }
		| null
	>(null);
	const list = people.data;
	const onNew = () => setSheet({ kind: "form" });

	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			<div className="flex h-12 items-center pt-1 pr-3 pl-2">
				<Link to="/perfil" className="icon-btn" aria-label="Voltar">
					<CaretLeftIcon size={22} aria-hidden />
				</Link>
			</div>

			<div className="flex h-10 items-center justify-between px-5">
				<h1 className="display text-(length:--text-size-display) leading-[var(--text-leading-display)]">
					Pessoas
				</h1>
				{list ? (
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

			{people.isError ? (
				<div className="flex flex-1 items-center justify-center pb-24">
					<div className="empty empty--problem">
						<span className="empty__icon">
							<WarningCircleIcon size={28} aria-hidden />
						</span>
						<h2 className="empty__title">Não deu pra carregar</h2>
						<p className="empty__text">
							Seus dados estão salvos. Foi a conexão com o arvo que falhou
							agora.
						</p>
						<button
							type="button"
							className="btn-secondary empty__action"
							onClick={() => people.refetch()}
						>
							Tentar de novo
						</button>
					</div>
				</div>
			) : !list ? (
				<div
					className="flex flex-col gap-1 px-5 pt-4"
					role="status"
					aria-busy="true"
					aria-label="Carregando"
				>
					{[0, 1, 2].map((i) => (
						<div key={i} className="flex h-14 items-center gap-3 px-3">
							<div className="skel !rounded-full size-9" />
							<div className="skel h-3 w-[120px]" />
						</div>
					))}
				</div>
			) : list.length === 0 ? (
				<div className="flex flex-1 items-center justify-center pb-24">
					<div className="empty">
						<span className="empty__icon">
							<UserIcon size={28} aria-hidden />
						</span>
						<h2 className="empty__title">Nenhuma pessoa ainda</h2>
						<p className="empty__text">
							Elas aparecem aqui quando você divide uma conta. Também dá para
							adicionar agora.
						</p>
						<button
							type="button"
							className="btn-secondary empty__action"
							onClick={onNew}
						>
							Adicionar pessoa
						</button>
					</div>
				</div>
			) : (
				<div className="flex flex-col gap-5 px-5 pt-4 pb-32">
					<section className="setting-group">
						<div className="setting-group__body">
							{list.map((person) => (
								<SwipeRow
									key={person.id}
									variant="row"
									hint={`Seta para a direita renomeia ${person.name}; seta para a esquerda apaga.`}
									onSwipeRight={() => setSheet({ kind: "form", person })}
									onSwipeLeft={() => setSheet({ kind: "delete", person })}
								>
									<span className="setting-row__icon">
										<UserIcon size={24} aria-hidden />
									</span>
									<span className="setting-row__text">
										<span className="setting-row__title">{person.name}</span>
									</span>
									<span className="setting-row__value">
										{owedLabel(person.owedCents, formatMoney)}
									</span>
								</SwipeRow>
							))}
						</div>
					</section>
				</div>
			)}

			{sheet?.kind === "form" && list ? (
				<PersonFormSheet
					person={sheet.person}
					existing={list}
					onClose={() => setSheet(null)}
				/>
			) : null}
			{sheet?.kind === "delete" ? (
				<PersonDeleteSheet
					person={sheet.person}
					onClose={() => setSheet(null)}
				/>
			) : null}
		</div>
	);
}
