import {
	ChartLineUpIcon,
	HouseIcon,
	PlusIcon,
	TargetIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const tabs = [
	{ to: "/inicio", label: "Início", Icon: HouseIcon },
	{ to: "/metas", label: "Metas", Icon: TargetIcon },
	{ to: "/resumo", label: "Resumo", Icon: ChartLineUpIcon },
	{ to: "/perfil", label: "Perfil", Icon: UserIcon },
] as const;

type ShellUser = { name: string; email: string };

/**
 * Casca do app autenticado.
 * Celular (< 640): barra inferior com o + no meio.
 * Largura média (640–1024): barra lateral compacta de 72, só ícones.
 * Desktop (≥ 1024): barra lateral de 240 com o Adicionar fixo.
 * O conteúdo de cada tela vem em children; o painel de detalhe do desktop
 * é responsabilidade de cada tela.
 */
export function AppShell({
	user,
	children,
}: {
	user: ShellUser;
	children: ReactNode;
}) {
	return (
		<div className="min-h-svh sm:flex">
			<CompactSidebar />
			<FullSidebar user={user} />
			<main className="min-w-0 flex-1 pb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))] sm:pb-0">
				{children}
			</main>
			<BottomBar />
		</div>
	);
}

function BottomBar() {
	const [first, second, third, fourth] = tabs;
	return (
		<nav
			aria-label="Principal"
			className="fixed inset-x-0 bottom-0 z-10 px-3 pb-[max(var(--spacing-2),env(safe-area-inset-bottom))] sm:hidden"
		>
			<div className="navbar">
				<TabLink tab={first} />
				<TabLink tab={second} />
				<button type="button" className="fab" aria-label="Adicionar">
					<PlusIcon size={26} weight="bold" aria-hidden />
				</button>
				<TabLink tab={third} />
				<TabLink tab={fourth} />
			</div>
		</nav>
	);
}

function TabLink({ tab }: { tab: (typeof tabs)[number] }) {
	const { to, label, Icon } = tab;
	return (
		<Link
			to={to}
			className="tab"
			activeProps={{ className: "tab is-active", "aria-current": "page" }}
		>
			{({ isActive }) => (
				<>
					<Icon size={24} weight={isActive ? "fill" : "regular"} aria-hidden />
					{label}
				</>
			)}
		</Link>
	);
}

function SideLink({
	tab,
	iconOnly,
}: {
	tab: (typeof tabs)[number];
	iconOnly?: boolean;
}) {
	const { to, label, Icon } = tab;
	return (
		<Link
			to={to}
			aria-label={iconOnly ? label : undefined}
			title={iconOnly ? label : undefined}
			className={iconOnly ? "side-item side-item--icon" : "side-item"}
			activeProps={{
				className: iconOnly
					? "side-item side-item--icon is-active"
					: "side-item is-active",
				"aria-current": "page",
			}}
		>
			{({ isActive }) => (
				<>
					<Icon size={24} weight={isActive ? "fill" : "regular"} aria-hidden />
					{iconOnly ? null : <span className="side-item__label">{label}</span>}
				</>
			)}
		</Link>
	);
}

function CompactSidebar() {
	return (
		<aside className="sidebar sidebar--compact sticky top-0 hidden h-svh sm:flex lg:hidden">
			<button
				type="button"
				className="btn-primary btn-primary--icon"
				aria-label="Adicionar"
			>
				<PlusIcon size={24} weight="bold" aria-hidden />
			</button>
			<nav aria-label="Principal" className="sidebar__nav">
				{tabs.map((tab) => (
					<SideLink key={tab.to} tab={tab} iconOnly />
				))}
			</nav>
		</aside>
	);
}

function FullSidebar({ user }: { user: ShellUser }) {
	return (
		<aside className="sidebar sticky top-0 hidden h-svh lg:flex">
			<div className="sidebar__brand">
				{/* Troque pelo logo em SVG quando o traço do Figma for exportado */}
				<span className="display text-(length:--text-size-title)">arvo</span>
			</div>
			<button type="button" className="btn-primary btn-primary--side">
				<span className="btn-primary__label">
					<PlusIcon size={24} weight="bold" aria-hidden />
					Adicionar
				</span>
				<kbd className="kbd">N</kbd>
			</button>
			<nav aria-label="Principal" className="sidebar__nav">
				{tabs.map((tab) => (
					<SideLink key={tab.to} tab={tab} />
				))}
			</nav>
			<div className="sidebar__foot">
				<b>{user.name}</b>
				<span>{user.email}</span>
			</div>
		</aside>
	);
}
