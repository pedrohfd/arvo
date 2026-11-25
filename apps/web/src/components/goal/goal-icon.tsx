import type { Icon } from "@phosphor-icons/react";
import {
	AirplaneTiltIcon,
	CarIcon,
	CreditCardIcon,
	DotsThreeIcon,
	HouseIcon,
	LaptopIcon,
	PiggyBankIcon,
	PillIcon,
	ShoppingCartIcon,
	TargetIcon,
	UserIcon,
	UsersThreeIcon,
} from "@phosphor-icons/react";

// A meta guarda o nome do ícone (kebab-case do Phosphor), como as categorias. Estes são os 12 da
// grade da "Nova meta" (Figma 5.3), na ordem de lá; o primeiro é o padrão.
export const GOAL_ICONS: { name: string; label: string; Icon: Icon }[] = [
	{ name: "target", label: "Alvo", Icon: TargetIcon },
	{ name: "house", label: "Casa", Icon: HouseIcon },
	{ name: "car", label: "Carro", Icon: CarIcon },
	{ name: "credit-card", label: "Cartão", Icon: CreditCardIcon },
	{ name: "shopping-cart", label: "Compras", Icon: ShoppingCartIcon },
	{ name: "airplane-tilt", label: "Viagem", Icon: AirplaneTiltIcon },
	{ name: "pill", label: "Saúde", Icon: PillIcon },
	{ name: "laptop", label: "Computador", Icon: LaptopIcon },
	{ name: "user", label: "Pessoa", Icon: UserIcon },
	{ name: "users-three", label: "Família", Icon: UsersThreeIcon },
	{ name: "dots-three", label: "Outro", Icon: DotsThreeIcon },
	{ name: "piggy-bank", label: "Reserva", Icon: PiggyBankIcon },
];

export const DEFAULT_GOAL_ICON = "target";
