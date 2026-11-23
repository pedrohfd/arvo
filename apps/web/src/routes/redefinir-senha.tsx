import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import { PasswordField } from "@/components/auth-field";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;

// Página aberta pelo link do e-mail de "Recuperar senha" (7.5). Não existe no Figma:
// montada com as peças da 7.4. O Better-Auth redireciona para cá com `?token=` ou `?error=`.
export const Route = createFileRoute("/redefinir-senha")({
	component: ResetPasswordPage,
	validateSearch: (
		search: Record<string, unknown>,
	): { token?: string; error?: string } => ({
		token: typeof search.token === "string" ? search.token : undefined,
		error: typeof search.error === "string" ? search.error : undefined,
	}),
});

function ResetPasswordPage() {
	const navigate = useNavigate();
	const { token, error: linkError } = Route.useSearch();
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		if (loading || !token) return;
		if (password.length < MIN_PASSWORD_LENGTH) {
			setError(
				`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
			);
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const { error: authError } = await authClient.resetPassword({
				newPassword: password,
				token,
			});
			if (authError) {
				setError(
					authError.code === "INVALID_TOKEN"
						? "Esse link venceu ou já foi usado. Peça um novo."
						: "Não deu para salvar a senha agora. Tente de novo.",
				);
				return;
			}
			await navigate({ to: "/login" });
		} catch {
			setError("Sem internet. Confira a conexão e tente de novo.");
		} finally {
			setLoading(false);
		}
	}

	const linkInvalid = !token || Boolean(linkError);

	return (
		<main className="mx-auto flex min-h-svh w-full max-w-md flex-col">
			<div className="auth">
				<header className="auth__head">
					<h1 className="display text-(length:--text-size-display) leading-(--text-leading-display)">
						Nova senha
					</h1>
					<p className="auth__text">
						{linkInvalid
							? "Esse link venceu ou não é válido. Peça um novo para continuar."
							: "Escolha uma senha nova para entrar."}
					</p>
				</header>
				{linkInvalid ? (
					<Link
						to="/recuperar-senha"
						className="btn-primary btn-primary--block"
					>
						Pedir novo link
					</Link>
				) : (
					<form onSubmit={onSubmit} noValidate className="auth__form">
						<PasswordField
							id="password"
							label="Nova senha"
							autoComplete="new-password"
							placeholder="Sua nova senha"
							hint={`Pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							error={error}
							disabled={loading}
							autoFocus
						/>
						<button
							type="submit"
							className={
								loading
									? "btn-primary btn-primary--block is-loading"
									: "btn-primary btn-primary--block"
							}
							disabled={loading}
						>
							{loading && <span className="spinner" aria-hidden />}
							<span>Salvar nova senha</span>
						</button>
					</form>
				)}
			</div>
		</main>
	);
}
