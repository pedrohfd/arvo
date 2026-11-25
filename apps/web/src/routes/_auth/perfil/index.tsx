import { createFileRoute } from "@tanstack/react-router";

import { PerfilList } from "@/components/perfil/perfil-list";

export const Route = createFileRoute("/_auth/perfil/")({
	component: Perfil,
});

function Perfil() {
	const { session } = Route.useRouteContext();
	return <PerfilList user={session.data?.user} />;
}
