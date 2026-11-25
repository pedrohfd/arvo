import { describe, expect, test } from "bun:test";

import { nextIndex } from "./arrow-keys";

describe("setas nos grupos de uma linha", () => {
	test("direita e esquerda andam um e dão a volta", () => {
		expect(nextIndex(0, "ArrowRight", 4)).toBe(1);
		expect(nextIndex(3, "ArrowRight", 4)).toBe(0);
		expect(nextIndex(0, "ArrowLeft", 4)).toBe(3);
		expect(nextIndex(2, "ArrowLeft", 4)).toBe(1);
	});

	test("cima e baixo também andam um", () => {
		expect(nextIndex(1, "ArrowDown", 4)).toBe(2);
		expect(nextIndex(1, "ArrowUp", 4)).toBe(0);
	});

	test("Home e End", () => {
		expect(nextIndex(2, "Home", 5)).toBe(0);
		expect(nextIndex(2, "End", 5)).toBe(4);
	});

	test("outras teclas, grupo vazio e foco fora do grupo não fazem nada", () => {
		expect(nextIndex(1, "Enter", 4)).toBeNull();
		expect(nextIndex(0, "ArrowRight", 0)).toBeNull();
		expect(nextIndex(-1, "ArrowRight", 4)).toBeNull();
	});
});

describe("setas na grade de meses (3 colunas) e no calendário (7)", () => {
	test("baixo e cima andam uma linha", () => {
		expect(nextIndex(0, "ArrowDown", 12, 3)).toBe(3);
		expect(nextIndex(10, "ArrowUp", 12, 3)).toBe(7);
		expect(nextIndex(3, "ArrowDown", 35, 7)).toBe(10);
	});

	test("na última linha, baixo fica onde está; na primeira, cima também", () => {
		expect(nextIndex(10, "ArrowDown", 12, 3)).toBeNull();
		expect(nextIndex(1, "ArrowUp", 12, 3)).toBeNull();
	});

	test("esquerda e direita seguem a ordem dos meses e viram a linha", () => {
		expect(nextIndex(2, "ArrowRight", 12, 3)).toBe(3);
		expect(nextIndex(3, "ArrowLeft", 12, 3)).toBe(2);
	});
});
