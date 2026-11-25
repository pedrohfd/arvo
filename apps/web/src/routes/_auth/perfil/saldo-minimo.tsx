import { cn } from "@arvo/ui/lib/utils";
import { CaretLeftIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { toCents } from "@/lib/amount-input";
import { centsToRaw } from "@/lib/goal-amount";
import { formatTarget, typedToRaw } from "@/lib/goal-form";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/perfil/saldo-minimo")({
	component: SaldoMinimo,
});

// Tela 6.8: o saldo abaixo do qual o arvo avisa (aviso âmbar ao registrar e no Horizonte; nunca
// bloqueia). Vazio ou zero desliga o aviso.
function SaldoMinimo() {
	const settings = useQuery(trpc.settings.get.queryOptions());
	const saved = settings.data?.minimumBalanceCents;

	const [text, setText] = useState("");
	const [loaded, setLoaded] = useState(false);
	// Preenche o campo uma vez, quando o valor salvo chega.
	useEffect(() => {
		if (saved !== undefined && !loaded) {
			setText(saved > 0 ? formatTarget(centsToRaw(saved)) : "");
			setLoaded(true);
		}
	}, [saved, loaded]);

	const cents = toCents(typedToRaw(text));
	const changed = saved !== undefined && cents !== saved;

	const save = useMutation(
		trpc.settings.setMinimumBalance.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(trpc.settings.pathFilter());
				queryClient.invalidateQueries(trpc.summary.pathFilter());
				toast.success(cents === 0 ? "Aviso desligado" : "Saldo mínimo salvo");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<div className="perfil-screen mx-auto flex min-h-svh max-w-[640px] flex-col pt-[62px] max-sm:-mb-[calc(68px+var(--spacing-6)+env(safe-area-inset-bottom))]">
			<div className="perfil-back-bar flex h-12 items-center pt-1 pr-3 pl-2">
				<Link to="/perfil" className="icon-btn" aria-label="Voltar">
					<CaretLeftIcon size={22} aria-hidden />
				</Link>
			</div>
			<div className="flex h-10 items-center px-5">
				<h1 className="display text-(length:--text-size-display) leading-[var(--text-leading-display)]">
					Saldo mínimo
				</h1>
			</div>

			{settings.isError ? (
				<div className="flex flex-1 items-center justify-center pb-24">
					<div className="empty empty--problem">
						<span className="empty__icon">
							<WarningCircleIcon size={28} aria-hidden />
						</span>
						<h2 className="empty__title">Não deu pra carregar</h2>
						<p className="empty__text">
							Seus dados estão salvos. Foi a conexão com o arvo que falhou
							agora.
						</p>
						<button
							type="button"
							className="btn-secondary empty__action"
							onClick={() => settings.refetch()}
						>
							Tentar de novo
						</button>
					</div>
				</div>
			) : (
				<form
					className="flex flex-col gap-4 px-5 pt-4 pb-32"
					onSubmit={(event) => {
						event.preventDefault();
						if (changed && !save.isPending) {
							save.mutate({ minimumBalanceCents: cents });
						}
					}}
				>
					<p className="text-(length:--text-size-body) text-[var(--color-text-muted)] leading-6">
						Quando o saldo ficar abaixo desse valor, o arvo avisa. É só um
						aviso: nada é bloqueado. Deixe vazio para não ser avisado.
					</p>
					<div className="field">
						<label className="field__label" htmlFor="minimum-balance">
							Valor
						</label>
						<div className="field__control !h-[52px]">
							<span aria-hidden>R$</span>
							<input
								id="minimum-balance"
								inputMode="decimal"
								value={text}
								placeholder="0,00"
								disabled={!loaded}
								onFocus={() => setText(typedToRaw(text))}
								onChange={(event) => setText(typedToRaw(event.target.value))}
								onBlur={() => setText(formatTarget(typedToRaw(text)))}
							/>
						</div>
					</div>
					<button
						type="submit"
						className={cn(
							"btn-primary btn-primary--block",
							save.isPending && "is-loading",
						)}
						disabled={!changed || save.isPending}
					>
						<span>Salvar</span>
						{save.isPending ? (
							<span className="spinner" role="status" aria-label="Salvando" />
						) : null}
					</button>
				</form>
			)}
		</div>
	);
}
