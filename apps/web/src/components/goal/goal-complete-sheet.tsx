import { XIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Grabber, useEscape } from "@/components/register/parts";
import { formatMoney } from "@/lib/format";
import { queryClient, trpc } from "@/utils/trpc";

// Folha 5.6 do Figma: confirma o "Concluir meta" de uma meta "para gastar" já atingida. O valor
// guardado volta ao saldo e a meta vai para "Concluídas" na lista. O "Desfazer" do aviso do Figma
// ainda não existe: o servidor não tem como reabrir uma meta.
export function GoalCompleteSheet({
	goal,
	onClose,
}: {
	goal: { id: string; name: string; savedCents: number };
	onClose: () => void;
}) {
	const dialogRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();
	useEscape(onClose);

	const complete = useMutation(
		trpc.goal.complete.mutationOptions({
			onSuccess: ({ returnedCents }) => {
				// Concluir mexe no saldo e na lista de metas: tudo o que depende disso recarrega.
				queryClient.invalidateQueries(trpc.goal.pathFilter());
				queryClient.invalidateQueries(trpc.summary.pathFilter());
				toast.success(
					`Meta concluída · ${formatMoney(returnedCents)} voltaram ao saldo`,
				);
				navigate({ to: "/metas" });
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	// Segura a rolagem da tela de trás e leva o foco para a folha.
	useEffect(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		dialogRef.current?.focus();
		return () => {
			document.body.style.overflow = previous;
		};
	}, []);

	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)]">
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label="Concluir a meta?"
				tabIndex={-1}
				className="flex w-full max-w-[480px] flex-col rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-strong)] outline-none"
			>
				<Grabber />
				<div className="flex h-14 shrink-0 items-center gap-2 px-3 pt-1 pb-2">
					<button
						type="button"
						className="icon-btn"
						aria-label="Fechar"
						onClick={onClose}
					>
						<XIcon size={22} aria-hidden />
					</button>
					<h2 className="text-(length:--text-size-headline) min-w-0 flex-1 truncate text-center font-semibold leading-[var(--text-leading-headline)]">
						Concluir a meta?
					</h2>
					<span className="size-11" aria-hidden />
				</div>

				<p className="text-(length:--text-size-body) px-5 pt-2 pb-4 text-[var(--color-text-muted)] leading-6">
					Os{" "}
					<b className="font-semibold text-[var(--color-text)]">
						{formatMoney(goal.savedCents)}
					</b>{" "}
					guardados voltam para o seu saldo, para você pagar o que planejou. A
					meta vai para Concluídas.
				</p>

				<div className="flex flex-col gap-2 px-5 pt-3 pb-6">
					<button
						type="button"
						className="btn-primary btn-primary--block"
						disabled={complete.isPending}
						onClick={() => complete.mutate({ goalId: goal.id })}
					>
						Concluir meta
					</button>
					<button
						type="button"
						className="btn-secondary btn-secondary--lg btn-secondary--block"
						disabled={complete.isPending}
						onClick={onClose}
					>
						Agora não
					</button>
				</div>
			</div>
		</div>
	);
}
