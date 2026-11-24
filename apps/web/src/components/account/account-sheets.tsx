import { cn } from "@arvo/ui/lib/utils";
import {
	SignOutIcon,
	TrashIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/card/card-sheets";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";

// Depois de sair ou apagar a conta: nada do usuário anterior fica no cache.
function useLeave() {
	const navigate = useNavigate();
	return () => {
		queryClient.clear();
		navigate({ to: "/login", replace: true });
	};
}

// Folha "Sair da conta?": os dados ficam salvos; é só entrar de novo.
export function SignOutSheet({ onClose }: { onClose: () => void }) {
	const leave = useLeave();
	const [pending, setPending] = useState(false);

	async function signOut() {
		setPending(true);
		const { error } = await authClient.signOut();
		if (error) {
			setPending(false);
			toast.error("Não deu pra sair agora. Tente de novo.");
			return;
		}
		leave();
	}

	return (
		<Sheet title="Sair da conta?" onClose={onClose}>
			<p className="text-(length:--text-size-body) px-5 pt-2 pb-4 text-[var(--color-text-muted)] leading-6">
				Seus dados continuam salvos. É só entrar de novo com o seu e-mail e
				senha.
			</p>
			<div className="px-5 pt-3 pb-6">
				<button
					type="button"
					className={cn(
						"btn-secondary btn-secondary--lg btn-secondary--danger btn-secondary--block",
						pending && "is-loading",
					)}
					disabled={pending}
					onClick={signOut}
				>
					<SignOutIcon size={18} aria-hidden />
					Sair
				</button>
			</div>
		</Sheet>
	);
}

// Folha "Apagar conta?" (P6): apaga tudo na hora, sem carência. Pede a senha de novo.
export function DeleteAccountSheet({ onClose }: { onClose: () => void }) {
	const leave = useLeave();
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function remove() {
		if (password === "") {
			setError("Digite a sua senha para confirmar.");
			return;
		}
		setPending(true);
		const result = await authClient.deleteUser({ password });
		if (result.error) {
			setPending(false);
			if (result.error.code === "INVALID_PASSWORD") {
				setError("Senha incorreta.");
			} else {
				toast.error("Não deu pra apagar a conta agora. Tente de novo.");
			}
			return;
		}
		toast.success("Conta apagada");
		leave();
	}

	return (
		<Sheet title="Apagar conta?" onClose={onClose}>
			<form
				className="flex flex-col"
				onSubmit={(event) => {
					event.preventDefault();
					remove();
				}}
			>
				<p className="text-(length:--text-size-body) px-5 pt-2 pb-4 text-[var(--color-text-muted)] leading-6">
					Todas as transações, metas, cartões, categorias e pessoas são apagados
					agora, e não dá para desfazer.
				</p>
				<div className="px-5 pb-2">
					<div className={cn("field", error && "field--error")}>
						<label className="field__label" htmlFor="delete-password">
							Sua senha
						</label>
						<div className="field__control">
							<input
								id="delete-password"
								type="password"
								autoComplete="current-password"
								value={password}
								aria-invalid={error ? true : undefined}
								aria-describedby={error ? "delete-password-error" : undefined}
								onChange={(event) => {
									setPassword(event.target.value);
									setError(null);
								}}
							/>
						</div>
						{error ? (
							<p
								className="field__error"
								id="delete-password-error"
								role="alert"
							>
								<WarningCircleIcon size={16} aria-hidden />
								{error}
							</p>
						) : null}
					</div>
				</div>
				<div className="px-5 pt-3 pb-6">
					<button
						type="submit"
						className={cn(
							"btn-secondary btn-secondary--lg btn-secondary--danger btn-secondary--block",
							pending && "is-loading",
						)}
						disabled={pending}
					>
						<TrashIcon size={18} aria-hidden />
						Apagar conta
					</button>
				</div>
			</form>
		</Sheet>
	);
}
