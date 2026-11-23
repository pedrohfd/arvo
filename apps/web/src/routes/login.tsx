import { LockIcon, WifiSlashIcon } from "@phosphor-icons/react";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import { AuthField, PasswordField } from "@/components/auth-field";
import { Logo } from "@/components/logo";
import { useOnline } from "@/hooks/use-online";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
	component: LoginPage,
	// `?sessao=expirada` mostra o aviso de sessão expirada (7.3).
	validateSearch: (search: Record<string, unknown>): { sessao?: "expirada" } =>
		search.sessao === "expirada" ? { sessao: "expirada" } : {},
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (session.data) {
			throw redirect({ to: "/inicio" });
		}
	},
});

type Errors = { email?: string; password?: string };

function LoginPage() {
	const navigate = useNavigate();
	const { sessao } = Route.useSearch();
	const online = useOnline();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<Errors>({});
	const [loading, setLoading] = useState(false);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		if (loading || !online) return;

		const next: Errors = {};
		if (!email.trim()) next.email = "Digite seu e-mail.";
		if (!password) next.password = "Digite sua senha.";
		setErrors(next);
		if (next.email || next.password) return;

		setLoading(true);
		try {
			const { error } = await authClient.signIn.email({
				email: email.trim(),
				password,
			});
			if (error) {
				setErrors({
					password:
						error.status === 401 || error.status === 400
							? "E-mail ou senha incorretos. Tente de novo."
							: "Não deu para entrar agora. Tente de novo.",
				});
				return;
			}
			await navigate({ to: "/inicio" });
		} catch {
			setErrors({
				password:
					"Não deu para entrar agora. Confira a conexão e tente de novo.",
			});
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="mx-auto flex min-h-svh w-full max-w-md flex-col">
			{!online && (
				<div className="banner" role="status">
					<WifiSlashIcon size={20} aria-hidden />
					<span className="banner__text">
						<b>Sem internet.</b> Conecte-se para entrar.
					</span>
				</div>
			)}
			{online && sessao === "expirada" && (
				<div className="banner banner--neutral" role="status">
					<LockIcon size={20} aria-hidden />
					<span className="banner__text">
						Sua sessão expirou. Entre de novo.
					</span>
				</div>
			)}
			<div className="auth">
				<header className="auth__head mb-3">
					<Logo width={72} />
					<h1 className="display text-(length:--text-size-display) pt-2 leading-(--text-leading-display)">
						Entrar
					</h1>
					<p className="auth__text">Que bom te ver de novo.</p>
				</header>
				<form onSubmit={onSubmit} noValidate className="auth__form">
					<AuthField
						id="email"
						label="E-mail"
						type="email"
						autoComplete="email"
						inputMode="email"
						placeholder="voce@email.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						error={errors.email}
						disabled={loading}
					/>
					<PasswordField
						id="password"
						label="Senha"
						autoComplete="current-password"
						placeholder="Sua senha"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						error={errors.password}
						disabled={loading}
						autoFocus={sessao === "expirada"}
					/>
					<div className="auth__aside">
						<Link to="/recuperar-senha" className="text-btn text-btn--accent">
							Esqueci a senha
						</Link>
					</div>
					<button
						type="submit"
						className={
							loading
								? "btn-primary btn-primary--block is-loading"
								: "btn-primary btn-primary--block"
						}
						disabled={loading || !online}
					>
						{loading && <span className="spinner" aria-hidden />}
						<span>Entrar</span>
					</button>
				</form>
				<p className="auth__foot">
					Ainda não tem conta?
					<Link to="/cadastro" className="text-btn text-btn--accent">
						Criar conta
					</Link>
				</p>
			</div>
		</main>
	);
}
