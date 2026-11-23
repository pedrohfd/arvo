import {
	EyeIcon,
	EyeSlashIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { type ComponentProps, type ReactNode, useState } from "react";

type AuthFieldProps = Omit<ComponentProps<"input">, "id"> & {
	id: string;
	label: string;
	/** Mensagem embaixo do campo; também deixa a borda vermelha. */
	error?: ReactNode;
	/** Borda vermelha sem mensagem (quando o erro é mostrado em outro campo). */
	invalid?: boolean;
	/** Texto de apoio embaixo do campo, enquanto não há erro. */
	hint?: string;
	/** Algo à direita dentro do campo (o olho da senha). */
	trailing?: ReactNode;
};

// Campo de texto com rótulo em cima e erro embaixo (peça `.field` do guia).
export function AuthField({
	id,
	label,
	error,
	invalid,
	hint,
	trailing,
	...input
}: AuthFieldProps) {
	const messageId = `${id}-message`;
	const hasError = Boolean(error) || Boolean(invalid);
	const hasMessage = Boolean(error) || Boolean(hint);

	return (
		<div className={hasError ? "field field--error" : "field"}>
			<label className="field__label" htmlFor={id}>
				{label}
			</label>
			<div className="field__control">
				<input
					id={id}
					aria-invalid={hasError ? true : undefined}
					aria-describedby={hasMessage ? messageId : undefined}
					{...input}
				/>
				{trailing}
			</div>
			{error ? (
				<p id={messageId} role="alert" className="field__error">
					<WarningCircleIcon size={16} weight="fill" aria-hidden />
					<span>{error}</span>
				</p>
			) : (
				hint && (
					<p
						id={messageId}
						className="text-(length:--text-size-small) text-text-muted"
					>
						{hint}
					</p>
				)
			)}
		</div>
	);
}

// Campo de senha com o olho que mostra ou oculta.
export function PasswordField(
	props: Omit<AuthFieldProps, "type" | "trailing">,
) {
	const [visible, setVisible] = useState(false);

	return (
		<AuthField
			{...props}
			type={visible ? "text" : "password"}
			trailing={
				<button
					type="button"
					className="icon-btn"
					aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
					aria-pressed={visible}
					onClick={() => setVisible((v) => !v)}
				>
					{visible ? (
						<EyeSlashIcon size={20} aria-hidden />
					) : (
						<EyeIcon size={20} aria-hidden />
					)}
				</button>
			}
		/>
	);
}
