import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/perfil")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="px-5 pt-6">
			<h1 className="display text-(length:--text-size-title)">Perfil</h1>
		</div>
	);
}
