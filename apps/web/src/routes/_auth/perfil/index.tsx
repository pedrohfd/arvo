import {
	CaretRightIcon,
	CoinsIcon,
	CreditCardIcon,
	DownloadSimpleIcon,
	MoonIcon,
	SignOutIcon,
	TagIcon,
	UserCircleIcon,
	UsersThreeIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { formatMoney } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/perfil/")({
	component: Perfil,
});

// Tela 6.1 do Figma (página "Arvo · 6 Perfil"). As linhas ainda não abrem nada: cada destino é
// uma folha própria (6.2 cartões, 6.3 categorias, 6.4 pessoas, 6.6 aparência, 6.7 conta, 6.8 saldo
// mínimo) e entra com a sua tela. Ficam de fora o "Lembretes" (v2) e o aviso de sem internet, que
// depende da fila offline.
function Perfil() {
	const { session } = Route.useRouteContext();
	const user = session.data?.user;
	const name = user?.name ?? "";

	const cards = useQuery(trpc.card.list.queryOptions());
	const categories = useQuery(trpc.category.list.queryOptions());
	const people = useQuery(trpc.person.list.queryOptions());
	const settings = useQuery(trpc.settings.get.queryOptions());

	const minimum = settings.data?.minimumBalanceCents;

	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			<header className="flex items-center gap-4 px-5 pt-2">
				<span className="avatar-lg" aria-hidden>
					{name.trim().charAt(0).toUpperCase()}
				</span>
				<div className="flex min-w-0 flex-col">
					<h1 className="sheet__title truncate">{name}</h1>
					<p className="text-(length:--text-size-small) truncate text-[var(--color-text-muted)] leading-[var(--text-leading-small)]">
						{user?.email}
					</p>
				</div>
			</header>

			<div className="flex flex-col gap-5 px-5 pt-4 pb-32">
				<Group title="Dinheiro">
					<Row
						icon={<CreditCardIcon size={24} aria-hidden />}
						title="Meus cartões"
						to="/perfil/cartoes"
						value={cards.data ? String(cards.data.length) : undefined}
					/>
					<Row
						icon={<TagIcon size={24} aria-hidden />}
						title="Categorias"
						value={categories.data ? String(categories.data.length) : undefined}
					/>
					<Row
						icon={<UsersThreeIcon size={24} aria-hidden />}
						title="Pessoas"
						value={people.data ? String(people.data.length) : undefined}
					/>
					<Row
						icon={<CoinsIcon size={24} aria-hidden />}
						title="Saldo mínimo"
						value={
							minimum === undefined
								? undefined
								: minimum === 0
									? "Sem aviso"
									: formatMoney(minimum)
						}
					/>
				</Group>

				<Group title="App">
					<Row
						icon={<MoonIcon size={24} aria-hidden />}
						title="Aparência"
						value="Automática"
					/>
				</Group>

				<Group title="Conta">
					<Row
						icon={<UserCircleIcon size={24} aria-hidden />}
						title="Editar perfil"
					/>
					<Row
						icon={<DownloadSimpleIcon size={24} aria-hidden />}
						title="Exportar dados"
					/>
					<Row
						icon={<SignOutIcon size={24} aria-hidden />}
						title="Sair"
						danger
					/>
				</Group>
			</div>
		</div>
	);
}

function Group({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="setting-group">
			<h2 className="setting-group__title">{title}</h2>
			<div className="setting-group__body">{children}</div>
		</section>
	);
}

function Row({
	icon,
	title,
	value,
	to,
	danger = false,
}: {
	icon: ReactNode;
	title: string;
	/** Valor à direita; some enquanto carrega. */
	value?: string;
	/** Tela que a linha abre; sem ela a linha ainda não faz nada. */
	to?: "/perfil/cartoes";
	/** "Sair": sem seta, em vermelho. */
	danger?: boolean;
}) {
	const className = danger ? "setting-row setting-row--danger" : "setting-row";
	const content = (
		<>
			<span className="setting-row__icon">{icon}</span>
			<span className="setting-row__text">
				<span className="setting-row__title">{title}</span>
			</span>
			{value ? <span className="setting-row__value">{value}</span> : null}
			{danger ? null : (
				<CaretRightIcon
					size={18}
					className="setting-row__chevron"
					aria-hidden
				/>
			)}
		</>
	);
	if (to) {
		return (
			<Link to={to} className={className}>
				{content}
			</Link>
		);
	}
	return (
		<button type="button" className={className}>
			{content}
		</button>
	);
}
