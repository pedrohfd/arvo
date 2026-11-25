// Setas do teclado nos grupos de escolha, nos meses e no calendário (DESIGN.md, Acessibilidade: "para
// quem implementa"). As setas movem o foco entre os botões do grupo; Tab continua passando por todos.

/**
 * Para onde vai o foco ao apertar `key`, num grupo de `count` botões em `columns` colunas.
 * Esquerda e direita andam um e dão a volta; cima e baixo andam uma linha (numa lista de uma coluna,
 * andam um); Home e End vão ao primeiro e ao último. Devolve nulo se a tecla não é de navegação ou
 * não há para onde ir (cima na primeira linha).
 */
export function nextIndex(
	index: number,
	key: string,
	count: number,
	columns = 1,
): number | null {
	if (count === 0 || index < 0) return null;
	const wrap = (value: number) => (value + count) % count;
	switch (key) {
		case "ArrowRight":
			return wrap(index + 1);
		case "ArrowLeft":
			return wrap(index - 1);
		case "ArrowDown": {
			if (columns <= 1) return wrap(index + 1);
			const next = index + columns;
			return next < count ? next : null;
		}
		case "ArrowUp": {
			if (columns <= 1) return wrap(index - 1);
			const previous = index - columns;
			return previous >= 0 ? previous : null;
		}
		case "Home":
			return 0;
		case "End":
			return count - 1;
		default:
			return null;
	}
}

/**
 * `ref` para o contêiner de um grupo de botões: as setas movem o foco entre os botões habilitados.
 * Passe o número de colunas de um grid (3 nos meses, 7 no calendário). Cria o `ref` uma vez por
 * valor de `columns`, para a identidade ficar estável entre renderizações.
 */
const cache = new Map<number, (element: HTMLElement | null) => () => void>();

export function arrowKeys(columns = 1) {
	let ref = cache.get(columns);
	if (!ref) {
		ref = (element) => {
			if (!element) return () => {};
			const onKeyDown = (event: KeyboardEvent) => {
				if (event.altKey || event.ctrlKey || event.metaKey) return;
				const buttons = [
					...element.querySelectorAll<HTMLButtonElement>("button"),
				].filter((button) => !button.disabled);
				const target = nextIndex(
					buttons.indexOf(document.activeElement as HTMLButtonElement),
					event.key,
					buttons.length,
					columns,
				);
				if (target === null) return;
				event.preventDefault();
				buttons[target]?.focus();
			};
			element.addEventListener("keydown", onKeyDown);
			return () => element.removeEventListener("keydown", onKeyDown);
		};
		cache.set(columns, ref);
	}
	return ref;
}
