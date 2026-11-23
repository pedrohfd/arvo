import {
	ArrowDownLeftIcon,
	ArrowUpRightIcon,
	BriefcaseIcon,
	CarIcon,
	ForkKnifeIcon,
	HouseIcon,
	PillIcon,
	ShoppingCartIcon,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";

import { GoalRing } from "@/components/goal-ring";

// Ilustrações do onboarding (7.2): o próprio app, com as peças reais e dados de exemplo.
// São decorativas (o texto do passo vem em `.onb__text`), então ficam fora da leitura de tela.

export function ArtHome() {
	return (
		<div className="art-app">
			<div className="balance">
				<span className="balance__label">Saldo atual</span>
				<span className="balance__value">
					R$ 2.533<span className="balance__cents">,80</span>
				</span>
			</div>
			<div className="stat-pair">
				<div className="stat-card stat-card--in">
					<span className="stat-card__badge">
						<ArrowDownLeftIcon size={16} aria-hidden />
					</span>
					<div className="stat-card__text">
						<span className="stat-card__label">Entrou em nov.</span>
						<span className="stat-card__value">+ R$ 4.250,00</span>
					</div>
				</div>
				<div className="stat-card">
					<span className="stat-card__badge">
						<ArrowUpRightIcon size={16} aria-hidden />
					</span>
					<div className="stat-card__text">
						<span className="stat-card__label">Saiu em nov.</span>
						<span className="stat-card__value">− R$ 1.736,60</span>
					</div>
				</div>
			</div>
			<div className="tx-list">
				<TxRow
					Icon={ShoppingCartIcon}
					title="Mercado"
					meta="Nubank · fatura 27/11"
					value="− R$ 120,00"
				/>
				<TxRow
					Icon={BriefcaseIcon}
					income
					title="Salário"
					meta="Pix · 07h02"
					value="+ R$ 4.000,00"
				/>
				<TxRow
					Icon={CarIcon}
					title="Uber"
					meta="Pix · 08h10"
					value="− R$ 23,90"
				/>
			</div>
		</div>
	);
}

function TxRow({
	Icon,
	title,
	meta,
	value,
	income = false,
}: {
	Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
	title: string;
	meta: string;
	value: string;
	income?: boolean;
}) {
	return (
		<div className={income ? "tx-row tx-row--income" : "tx-row"}>
			<span className="tx-row__icon">
				<Icon size={22} aria-hidden />
			</span>
			<div className="tx-row__text">
				<span className="tx-row__title">{title}</span>
				<span className="tx-row__meta">
					<span>{meta}</span>
				</span>
			</div>
			<div className="tx-row__amount">
				<span className="tx-row__value">{value}</span>
			</div>
		</div>
	);
}

const CATEGORIES = [
	{ name: "Mercado", Icon: ShoppingCartIcon, value: "R$ 1.404,90", pct: 81 },
	{ name: "Restaurante", Icon: ForkKnifeIcon, value: "R$ 147,50", pct: 8 },
	{ name: "Casa", Icon: HouseIcon, value: "R$ 96,30", pct: 6 },
	{ name: "Saúde", Icon: PillIcon, value: "R$ 50,00", pct: 3 },
] as const;

export function ArtSummary() {
	// A barra é proporcional à maior categoria (a primeira).
	const max = CATEGORIES[0].pct;

	return (
		<div className="art-app">
			<div className="balance">
				<span className="balance__label">Sobrou em novembro</span>
				<span className="balance__value">
					R$ 2.513<span className="balance__cents">,40</span>
				</span>
			</div>
			<div className="flex flex-col">
				<div className="px-3 pt-2 pb-1">
					<span className="display text-(length:--text-size-title) font-medium leading-(--text-leading-title)">
						Para onde foi
					</span>
				</div>
				<div className="cat-bars">
					{CATEGORIES.map(({ name, Icon, value, pct }, index) => (
						<div
							key={name}
							className={index === 0 ? "cat-bar cat-bar--top" : "cat-bar"}
						>
							<div className="cat-bar__top">
								<Icon size={18} aria-hidden />
								<span className="cat-bar__name">{name}</span>
								<span className="cat-bar__value">{value}</span>
								<span className="cat-bar__pct">{pct}%</span>
							</div>
							<div className="cat-bar__track">
								<div
									className="cat-bar__fill"
									style={{ width: `${(pct / max) * 100}%` }}
								/>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export function ArtGoals() {
	return (
		<div className="art-app items-center">
			<div className="flex justify-center pt-2">
				<GoalRing percent={80} size={168} />
			</div>
			<div className="flex flex-col items-center text-center">
				<span className="display text-(length:--text-size-title) font-medium leading-(--text-leading-title)">
					Viagem para CJ
				</span>
				<span className="text-text-muted">
					<b className="font-semibold text-text">R$ 400,00</b> de R$ 500,00 ·
					faltam R$ 100,00
				</span>
			</div>
			<div className="goal-card">
				<GoalRing percent={30} size={56} />
				<div className="goal-card__text">
					<span className="goal-card__name">Notebook novo</span>
					<span className="goal-card__amount">
						<b>R$ 270,00</b> de R$ 900,00
					</span>
				</div>
			</div>
		</div>
	);
}
