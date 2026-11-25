import type { Icon } from "@phosphor-icons/react";
import {
	AirplaneTiltIcon,
	ArrowClockwiseIcon,
	BicycleIcon,
	BriefcaseIcon,
	CameraIcon,
	CarIcon,
	ChartLineUpIcon,
	CoinsIcon,
	FilmStripIcon,
	ForkKnifeIcon,
	GiftIcon,
	GraduationCapIcon,
	HeartbeatIcon,
	HouseIcon,
	LaptopIcon,
	MoneyIcon,
	PawPrintIcon,
	PiggyBankIcon,
	PillIcon,
	PlantIcon,
	ReceiptIcon,
	ShoppingCartIcon,
	TagIcon,
} from "@phosphor-icons/react";

// Categorias guardam o nome do ícone (kebab-case do Phosphor). Só os ícones usados no app entram
// no bundle: os das categorias padrão (Figma 6.3) e os da grade de "Nova categoria". Nome
// desconhecido cai numa etiqueta.
const ICONS: Record<string, Icon> = {
	"shopping-cart": ShoppingCartIcon,
	"fork-knife": ForkKnifeIcon,
	car: CarIcon,
	house: HouseIcon,
	pill: PillIcon,
	"film-strip": FilmStripIcon,
	tag: TagIcon,
	receipt: ReceiptIcon,
	plant: PlantIcon,
	briefcase: BriefcaseIcon,
	money: MoneyIcon,
	"arrow-clockwise": ArrowClockwiseIcon,
	gift: GiftIcon,
	"graduation-cap": GraduationCapIcon,
	"paw-print": PawPrintIcon,
	"airplane-tilt": AirplaneTiltIcon,
	bicycle: BicycleIcon,
	camera: CameraIcon,
	heartbeat: HeartbeatIcon,
	laptop: LaptopIcon,
	"piggy-bank": PiggyBankIcon,
	coins: CoinsIcon,
	"chart-line-up": ChartLineUpIcon,
};

// Os 12 ícones da grade da "Nova categoria" (Figma 6.3), na ordem de lá; o primeiro é o padrão.
export const CATEGORY_ICON_CHOICES: { name: string; label: string }[] = [
	{ name: "gift", label: "Presente" },
	{ name: "graduation-cap", label: "Estudo" },
	{ name: "paw-print", label: "Pet" },
	{ name: "airplane-tilt", label: "Viagem" },
	{ name: "bicycle", label: "Bicicleta" },
	{ name: "camera", label: "Foto" },
	{ name: "heartbeat", label: "Saúde" },
	{ name: "laptop", label: "Tecnologia" },
	{ name: "receipt", label: "Contas" },
	{ name: "piggy-bank", label: "Reserva" },
	{ name: "coins", label: "Dinheiro" },
	{ name: "chart-line-up", label: "Investimento" },
];

export const DEFAULT_CATEGORY_ICON = "gift";

export function CategoryIcon({
	name,
	size = 22,
}: {
	name: string;
	size?: number;
}) {
	const Component = ICONS[name] ?? TagIcon;
	return <Component size={size} aria-hidden />;
}
