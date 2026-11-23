import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import { AuthField } from "@/components/auth-field";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
	component: LoginPage,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (session.data) {
			throw redirect({ to: "/inicio" });
		}
	},
});

function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		if (loading) return;
		setError(null);
		setLoading(true);
		try {
			const { error: authError } = await authClient.signIn.email({
				email: email.trim(),
				password,
			});
			if (authError) {
				setError(
					authError.status === 401 || authError.status === 400
						? "E-mail ou senha incorretos."
						: "Não deu para entrar agora. Tente de novo.",
				);
				return;
			}
			await navigate({ to: "/inicio" });
		} catch {
			setError("Sem internet. Confira a conexão e tente de novo.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center gap-8 px-5 py-10">
			<header className="flex flex-col gap-2">
				<h1 className="display text-(length:--text-size-title)">Entrar</h1>
				<p className="text-text-muted">Que bom ter você de volta.</p>
			</header>
			<form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
				<AuthField
					id="email"
					label="E-mail"
					type="email"
					autoComplete="email"
					inputMode="email"
					placeholder="voce@exemplo.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					invalid={Boolean(error)}
				/>
				<AuthField
					id="password"
					label="Senha"
					type="password"
					autoComplete="current-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					error={error}
				/>
				<button
					type="submit"
					className={
						loading
							? "btn-primary btn-primary--block is-loading"
							: "btn-primary btn-primary--block"
					}
					disabled={loading || !email || !password}
				>
					{loading && <span className="spinner" aria-hidden />}
					<span>Entrar</span>
				</button>
			</form>
			<p className="text-center text-text-muted">
				Ainda não tem conta?{" "}
				<Link to="/cadastro" className="text-btn text-btn--accent">
					Criar conta
				</Link>
			</p>
		</main>
	);
}
