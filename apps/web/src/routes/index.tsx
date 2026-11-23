import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { LogoDraw } from "@/components/logo-draw";
import { authClient } from "@/lib/auth-client";

// 7.1 Splash: o logo se desenha (~1 s) e, passado esse tempo, segue para o app (com
// sessão) ou para o login. O onboarding (7.2) entra aqui quando existir.
const SPLASH_MS = 1500;

export const Route = createFileRoute("/")({
	component: Splash,
});

function Splash() {
	const navigate = useNavigate();

	useEffect(() => {
		let cancelled = false;
		const minimum = new Promise((resolve) => setTimeout(resolve, SPLASH_MS));
		Promise.all([authClient.getSession().catch(() => null), minimum]).then(
			([session]) => {
				if (cancelled) return;
				navigate({ to: session?.data ? "/inicio" : "/login", replace: true });
			},
		);
		return () => {
			cancelled = true;
		};
	}, [navigate]);

	return (
		<main className="flex min-h-svh items-center justify-center pb-20">
			<LogoDraw />
		</main>
	);
}
