import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	useRef,
	useState,
} from "react";

import { ArtGoals, ArtHome, ArtSummary } from "@/components/onboarding-art";
import { markOnboardingDone } from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding")({
	component: OnboardingPage,
});

const SLIDES: { title: string; body: string; art: ReactNode }[] = [
	{
		title: "Organize suas finanças do seu jeito",
		body: "Acompanhe seus gastos, defina metas e veja pra onde seu dinheiro está indo de forma simples e visual.",
		art: <ArtHome />,
	},
	{
		title: "Entenda seus hábitos",
		body: "Descubra pra onde vai o seu dinheiro. O primeiro passo pra economizar é saber onde ele está sendo gasto.",
		art: <ArtSummary />,
	},
	{
		title: "Planeje, alcance, conquiste",
		body: "Crie metas e veja o progresso em tempo real. Com pequenas mudanças, grandes resultados acontecem.",
		art: <ArtGoals />,
	},
];

function OnboardingPage() {
	const navigate = useNavigate();
	const track = useRef<HTMLElement>(null);
	const drag = useRef<{ x: number; left: number } | null>(null);
	const [index, setIndex] = useState(0);
	const [dragging, setDragging] = useState(false);
	const last = index === SLIDES.length - 1;

	function finish() {
		markOnboardingDone();
		void navigate({ to: "/cadastro", replace: true });
	}

	function goTo(next: number) {
		const el = track.current;
		if (!el) return;
		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		el.scrollTo({
			left: next * el.clientWidth,
			behavior: reduced ? "auto" : "smooth",
		});
	}

	// O dedo arrasta pelo scroll nativo; o mouse não, então arrastamos à mão.
	function onPointerDown(event: PointerEvent<HTMLElement>) {
		if (event.pointerType !== "mouse" || event.button !== 0) return;
		drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft };
		setDragging(true);
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent<HTMLElement>) {
		if (!drag.current) return;
		event.currentTarget.scrollLeft =
			drag.current.left - (event.clientX - drag.current.x);
	}

	function onPointerUp(event: PointerEvent<HTMLElement>) {
		if (!drag.current) return;
		drag.current = null;
		setDragging(false);
		const el = event.currentTarget;
		// Sem o `scroll-snap` durante o arrasto, encaixa no passo mais próximo ao soltar.
		goTo(Math.round(el.scrollLeft / el.clientWidth));
	}

	function onKeyDown(event: KeyboardEvent<HTMLElement>) {
		if (event.key === "ArrowRight" && index < SLIDES.length - 1)
			goTo(index + 1);
		if (event.key === "ArrowLeft" && index > 0) goTo(index - 1);
	}

	return (
		<main className="mx-auto flex h-svh w-full max-w-md flex-col">
			<h1 className="sr-only">Bem-vindo ao arvo</h1>
			<section
				ref={track}
				className={dragging ? "onb__track is-dragging" : "onb__track"}
				aria-roledescription="carrossel"
				aria-label="Conheça o arvo"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: o carrossel recebe foco para navegar pelas setas
				tabIndex={0}
				onScroll={(e) => {
					const el = e.currentTarget;
					setIndex(Math.round(el.scrollLeft / el.clientWidth));
				}}
				onKeyDown={onKeyDown}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
			>
				{SLIDES.map((slide, i) => (
					<section
						key={slide.title}
						className="onb__slide"
						aria-roledescription="slide"
						aria-label={`${i + 1} de ${SLIDES.length}`}
					>
						<div className="onb__art" aria-hidden>
							{slide.art}
						</div>
						<div className="onb__text">
							<h2 className="onb__title">{slide.title}</h2>
							<p className="onb__body">{slide.body}</p>
						</div>
					</section>
				))}
			</section>
			<div className="onb__foot">
				<div
					className="dots"
					role="img"
					aria-label={`Passo ${index + 1} de ${SLIDES.length}`}
				>
					{SLIDES.map((slide, i) => (
						<i
							key={slide.title}
							className={i === index ? "is-active" : undefined}
						/>
					))}
				</div>
				{last ? (
					<button
						type="button"
						className="btn-primary btn-primary--block"
						onClick={finish}
					>
						Começar
					</button>
				) : (
					<div className="onb__actions">
						<button type="button" className="text-btn" onClick={finish}>
							Pular
						</button>
						<button
							type="button"
							className="btn-primary"
							onClick={() => goTo(index + 1)}
						>
							Avançar
						</button>
					</div>
				)}
			</div>
		</main>
	);
}
