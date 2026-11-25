import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { createPortal } from "react-dom";

import { useDetailSlot } from "@/components/app-shell";
import { PerfilList } from "@/components/perfil/perfil-list";
import { useDesktop } from "@/lib/use-desktop";

export const Route = createFileRoute("/_auth/perfil")({
	component: PerfilLayout,
});

// Perfil no computador (Figma D5.1 e D5.2): a lista de seções fica na coluna central e a tela da
// seção escolhida abre no painel de 400 px, sem trocar de tela. No celular cada seção é uma tela
// (a lista é a rota de índice).
function PerfilLayout() {
	const { session } = Route.useRouteContext();
	const desktop = useDesktop();
	const detailSlot = useDetailSlot();
	const pathname = useLocation({ select: (location) => location.pathname });
	const isIndex = pathname.replace(/\/$/, "") === "/perfil";

	if (!desktop) return <Outlet />;

	return (
		<>
			<PerfilList user={session.data?.user} />
			{detailSlot
				? createPortal(
						<div className="detail-panel perfil-panel">
							{isIndex ? (
								<>
									<header className="detail-panel__head">
										<div>
											<p className="detail-panel__eyebrow">Perfil</p>
											<h2 className="detail-panel__title">Escolha uma seção</h2>
										</div>
									</header>
									<p className="text-(length:--text-size-small) text-[var(--color-text-muted)] leading-5">
										Cartões, categorias, pessoas e o resto do app abrem aqui,
										sem trocar de tela.
									</p>
								</>
							) : (
								<Outlet />
							)}
						</div>,
						detailSlot,
					)
				: null}
		</>
	);
}
