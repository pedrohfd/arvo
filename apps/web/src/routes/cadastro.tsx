import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import { AuthField } from "@/components/auth-field";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;

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
	name?: string;
	email?: string;
	password?: string;
	form?: string;
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
			next.password = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
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
					setErrors({ email: "Já existe uma conta com esse e-mail." });
				} else if (error.code === "PASSWORD_TOO_SHORT") {
					setErrors({
						password: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
					});
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
		<main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center gap-8 px-5 py-10">
			<header className="flex flex-col gap-2">
				<h1 className="display text-(length:--text-size-title)">Criar conta</h1>
				<p className="text-text-muted">Leva menos de um minuto.</p>
			</header>
			<form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
				<AuthField
					id="name"
					label="Nome"
					autoComplete="name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					error={errors.name}
				/>
				<AuthField
					id="email"
					label="E-mail"
					type="email"
					autoComplete="email"
					inputMode="email"
					placeholder="voce@exemplo.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					error={errors.email}
				/>
				<AuthField
					id="password"
					label="Senha"
					type="password"
					autoComplete="new-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					error={errors.password}
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
			<p className="text-center text-text-muted">
				Já tem conta?{" "}
				<Link to="/login" className="text-btn text-btn--accent">
					Entrar
				</Link>
			</p>
		</main>
	);
}
