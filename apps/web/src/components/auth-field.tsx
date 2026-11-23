import type { ComponentProps } from "react";

type AuthFieldProps = Omit<ComponentProps<"input">, "id"> & {
	id: string;
	label: string;
	/** Mensagem embaixo do campo; também deixa a borda vermelha. */
	error?: string | null;
	/** Borda vermelha sem mensagem (quando o erro é mostrado em outro campo). */
	invalid?: boolean;
};

// Campo de texto com rótulo em cima e erro embaixo (peça `.field` do guia).
export function AuthField({
	id,
	label,
	error,
	invalid,
	...input
}: AuthFieldProps) {
	const errorId = `${id}-error`;
	const hasError = Boolean(error) || Boolean(invalid);

	return (
		<div className={hasError ? "field field--error" : "field"}>
			<label className="field__label" htmlFor={id}>
				{label}
			</label>
			<div className="field__control">
				<input
					id={id}
					aria-invalid={hasError ? true : undefined}
					aria-describedby={error ? errorId : undefined}
					{...input}
				/>
			</div>
			{error && (
				<p id={errorId} role="alert" className="field__error">
					{error}
				</p>
			)}
		</div>
	);
}
