import { describe, expect, test } from "bun:test";

import { findPersonByName, initials, splitHint } from "./split-with";

describe("dica da divisão", () => {
	test("só você convida a escolher alguém", () => {
		expect(splitHint(8550, 0)).toBe(
			"Só você por enquanto. Escolha com quem dividiu.",
		);
	});

	test("partes iguais quando a conta fecha", () => {
		expect(splitHint(10000, 1)).toBe("R$ 50,00 para cada, contando você.");
	});

	test("a sobra de centavos fica com você", () => {
		expect(splitHint(8550, 3)).toBe(
			"R$ 21,37 para cada · você fica com R$ 21,39.",
		);
	});
});

describe("iniciais", () => {
	test("um nome vira uma letra; nome e sobrenome, duas", () => {
		expect(initials("ana")).toBe("A");
		expect(initials("  Ana  Maria Souza ")).toBe("AS");
		expect(initials("   ")).toBe("");
	});
});

describe("pessoa pelo nome", () => {
	const people = [
		{ id: "1", name: "Ana" },
		{ id: "2", name: "Bruno" },
	];

	test("acha sem ligar para maiúsculas nem espaços", () => {
		expect(findPersonByName(people, "  ana ")?.id).toBe("1");
	});

	test("nome novo ou vazio não acha ninguém", () => {
		expect(findPersonByName(people, "Carla")).toBeUndefined();
		expect(findPersonByName(people, " ")).toBeUndefined();
	});
});
