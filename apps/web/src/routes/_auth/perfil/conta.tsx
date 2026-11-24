import { cn } from "@arvo/ui/lib/utils";
import {
	CaretLeftIcon,
	TrashIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteAccountSheet } from "@/components/account/account-sheets";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/perfil/conta")({
	component: Conta,
});

// Tela 6.7 "Editar perfil": o nome (o e-mail só aparece; trocar e-mail pede confirmação por
// e-mail, que depende do P5) e, no fim, "Apagar conta".
function Conta() {
	const router = useRouter();
	const { session } = Route.useRouteContext();
	const user = session.data?.user;
	const savedName = user?.name ?? "";

	const [name, setName] = useState(savedName);
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const changed = name.trim() !== savedName;

	async function save() {
		if (name.trim() === "") {
			setError("Diga como quer ser chamado.");
			return;
		}
		if (!changed || pending) return;
		setPending(true);
		const result = await authClient.updateUser({ name: name.trim() });
		setPending(false);
		if (result.error) {
			toast.error("Não deu pra salvar agora. Tente de novo.");
			return;
		}
		toast.success("Perfil atualizado");
		// Lê a sessão de novo para o nome novo aparecer no Perfil e na barra lateral.
		await router.invalidate();
	}

	return (
		<div className="mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			<div className="flex h-12 items-center pt-1 pr-3 pl-2">
				<Link to="/perfil" className="icon-btn" aria-label="Voltar">
					<CaretLeftIcon size={22} aria-hidden />
				</Link>
			</div>
			<div className="flex h-10 items-center px-5">
				<h1 className="display text-(length:--text-size-display) leading-[var(--text-leading-display)]">
					Editar perfil
				</h1>
			</div>

			<form
				className="flex flex-col gap-6 px-5 pt-4"
				onSubmit={(event) => {
					event.preventDefault();
					save();
				}}
			>
				<div className={cn("field", error && "field--error")}>
					<label className="field__label" htmlFor="profile-name">
						Nome
					</label>
					<div className="field__control">
						<input
							id="profile-name"
							value={name}
							maxLength={60}
							autoComplete="name"
							aria-invalid={error ? true : undefined}
							aria-describedby={error ? "profile-name-error" : undefined}
							onChange={(event) => {
								setName(event.target.value);
								setError(null);
							}}
						/>
					</div>
					{error ? (
						<p className="field__error" id="profile-name-error" role="alert">
							<WarningCircleIcon size={16} aria-hidden />
							{error}
						</p>
					) : null}
				</div>

				<div className="field is-disabled">
					<label className="field__label" htmlFor="profile-email">
						E-mail
					</label>
					<div className="field__control">
						<input id="profile-email" value={user?.email ?? ""} disabled />
					</div>
				</div>

				<button
					type="submit"
					className={cn(
						"btn-primary btn-primary--block",
						pending && "is-loading",
					)}
					disabled={!changed || pending}
				>
					<span>Salvar</span>
					{pending ? (
						<span className="spinner" role="status" aria-label="Salvando" />
					) : null}
				</button>
			</form>

			<div className="px-5 pt-10 pb-32">
				<button
					type="button"
					className="btn-secondary btn-secondary--lg btn-secondary--danger btn-secondary--block"
					onClick={() => setDeleting(true)}
				>
					<TrashIcon size={18} aria-hidden />
					Apagar conta
				</button>
			</div>

			{deleting ? (
				<DeleteAccountSheet onClose={() => setDeleting(false)} />
			) : null}
		</div>
	);
}
