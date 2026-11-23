import { expect, test } from "bun:test";

// Prova que o runner funciona. Apague quando a primeira regra real
// (ver TESTES.md) ganhar seus testes.
test("o runner de testes executa", () => {
	expect(1 + 1).toBe(2);
});
