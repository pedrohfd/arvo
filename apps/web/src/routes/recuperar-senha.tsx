import { CaretLeftIcon, EnvelopeIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import { AuthField } from "@/components/auth-field";
import { authClient } from "@/lib/auth-client";
import { trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/recuperar-senha")({
	component: RecoverPasswordPage,
});

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function RecoverPasswordPage() {
	const [email, setEmail] = useState("");
	const [sentTo, setSentTo] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Devolve true quando o link foi pedido; senão, deixa a mensagem em `error`.
	async function requestLink(address: string) {
		setError(null);
		setLoading(true);
		try {
			const exists = await trpcClient.emailExists.query({ email: address });
			if (!exists) {
				setError(
					"Não achamos uma conta com esse e-mail. Confira se digitou certo.",
				);
				return false;
			}
			const { error: authError } = await authClient.requestPasswordReset({
				email: address,
				redirectTo: `${window.location.origin}/redefinir-senha`,
			});
			if (authError) {
				setError("Não deu para enviar o link agora. Tente de novo.");
				return false;
			}
			return true;
		} catch {
			setError("Sem internet. Confira a conexão e tente de novo.");
			return false;
		} finally {
			setLoading(false);
		}
	}

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		if (loading) return;
		const address = email.trim();
		if (!EMAIL_PATTERN.test(address)) {
			setError("Esse e-mail não parece certo.");
			return;
		}
		if (await requestLink(address)) setSentTo(address);
	}

	return (
		<main className="mx-auto flex min-h-svh w-full max-w-md flex-col">
			<div className="flex h-12 items-center pt-1 pr-3 pl-2">
				<Link to="/login" className="icon-btn" aria-label="Voltar para entrar">
					<CaretLeftIcon size={22} aria-hidden />
				</Link>
			</div>
			{sentTo ? (
				<div className="flex flex-col gap-8 px-6 pt-10">
					<div className="flex flex-col items-center gap-3 text-center">
						<span className="flex size-[72px] items-center justify-center rounded-full bg-primary-soft text-primary-soft-text">
							<EnvelopeIcon size={32} aria-hidden />
						</span>
						<h1 className="display text-(length:--text-size-title) leading-(--text-leading-title)">
							Confira seu e-mail
						</h1>
						<p className="text-text-muted">
							Enviamos um link para <b className="text-text">{sentTo}</b>. Se
							não chegar em alguns minutos, olhe o spam.
						</p>
					</div>
					<div className="flex flex-col gap-3">
						{error && (
							<p role="alert" className="field__error">
								{error}
							</p>
						)}
						<button
							type="button"
							className={
								loading
									? "btn-secondary btn-secondary--block btn-secondary--lg is-loading"
									: "btn-secondary btn-secondary--block btn-secondary--lg"
							}
							disabled={loading}
							onClick={() => requestLink(sentTo)}
						>
							{loading && <span className="spinner" aria-hidden />}
							<span>Reenviar e-mail</span>
						</button>
						<Link
							to="/login"
							className="w-full justify-center text-btn text-btn--accent"
						>
							Voltar para entrar
						</Link>
					</div>
				</div>
			) : (
				<div className="flex flex-col gap-8 px-6 pt-4">
					<header className="auth__head">
						<h1 className="display text-(length:--text-size-display) leading-(--text-leading-display) tracking-[-0.64px]">
							Recuperar senha
						</h1>
						<p className="auth__text">
							Digite o e-mail da sua conta e enviaremos um link para criar uma
							nova senha.
						</p>
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
							<span>Enviar link</span>
						</button>
					</form>
				</div>
			)}
		</main>
	);
}
