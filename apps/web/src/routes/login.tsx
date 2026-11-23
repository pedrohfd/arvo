import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

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
				<div className={error ? "field field--error" : "field"}>
					<label className="field__label" htmlFor="email">
						E-mail
					</label>
					<div className="field__control">
						<input
							id="email"
							type="email"
							autoComplete="email"
							inputMode="email"
							placeholder="voce@exemplo.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							aria-invalid={error ? true : undefined}
							required
						/>
					</div>
				</div>
				<div className={error ? "field field--error" : "field"}>
					<label className="field__label" htmlFor="password">
						Senha
					</label>
					<div className="field__control">
						<input
							id="password"
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							aria-invalid={error ? true : undefined}
							aria-describedby={error ? "login-error" : undefined}
							required
						/>
					</div>
					{error && (
						<p id="login-error" role="alert" className="field__error">
							{error}
						</p>
					)}
				</div>
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
		</main>
	);
}
