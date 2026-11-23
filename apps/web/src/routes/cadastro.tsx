import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { type FormEvent, type ReactNode, useState } from "react";

import { AuthField, PasswordField } from "@/components/auth-field";
import { Logo } from "@/components/logo";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_TOO_SHORT = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;

export const Route = createFileRoute("/cadastro")({
	component: SignUpPage,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (session.data) {
			throw redirect({ to: "/inicio" });
		}
	},
});

type Errors = {
	name?: ReactNode;
	email?: ReactNode;
	password?: ReactNode;
	form?: ReactNode;
};

function SignUpPage() {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<Errors>({});
	const [loading, setLoading] = useState(false);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		if (loading) return;

		const next: Errors = {};
		if (!name.trim()) next.name = "Diga como você quer ser chamado.";
		if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
			next.email = "Esse e-mail não parece certo.";
		}
		if (password.length < MIN_PASSWORD_LENGTH) {
			next.password = PASSWORD_TOO_SHORT;
		}
		setErrors(next);
		if (Object.keys(next).length > 0) return;

		setLoading(true);
		try {
			const { error } = await authClient.signUp.email({
				name: name.trim(),
				email: email.trim(),
				password,
			});
			if (error) {
				if (error.code?.startsWith("USER_ALREADY_EXISTS")) {
					setErrors({
						email: (
							<>
								Esse e-mail já tem conta.{" "}
								<Link
									to="/login"
									className="font-semibold text-primary underline"
								>
									Entrar com ele
								</Link>
							</>
						),
					});
				} else if (error.code === "PASSWORD_TOO_SHORT") {
					setErrors({ password: PASSWORD_TOO_SHORT });
				} else {
					setErrors({
						form: "Não deu para criar a conta agora. Tente de novo.",
					});
				}
				return;
			}
			await navigate({ to: "/inicio" });
		} catch {
			setErrors({ form: "Sem internet. Confira a conexão e tente de novo." });
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="mx-auto flex min-h-svh w-full max-w-md flex-col">
			<div className="auth">
				<header className="auth__head mb-3">
					<Logo width={72} />
					<h1 className="display text-(length:--text-size-display) pt-2 leading-(--text-leading-display)">
						Criar conta
					</h1>
					<p className="auth__text">
						Leva menos de um minuto. O saldo começa em zero e se monta com o que
						você registrar.
					</p>
				</header>
				<form onSubmit={onSubmit} noValidate className="auth__form">
					<AuthField
						id="name"
						label="Seu nome"
						autoComplete="name"
						placeholder="Como quer ser chamado"
						value={name}
						onChange={(e) => setName(e.target.value)}
						error={errors.name}
						disabled={loading}
					/>
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
						autoComplete="new-password"
						placeholder="Sua senha"
						hint={`Pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						error={errors.password}
						disabled={loading}
					/>
					{errors.form && (
						<p role="alert" className="field__error">
							{errors.form}
						</p>
					)}
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
						<span>Criar conta</span>
					</button>
				</form>
				<p className="auth__foot">
					Já tem conta?
					<Link to="/login" className="text-btn text-btn--accent">
						Entrar
					</Link>
				</p>
			</div>
		</main>
	);
}
