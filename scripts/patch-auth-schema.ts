// `bun run auth:generate` reescreve packages/db/prisma/schema/auth.prisma do zero e apaga as
// relações do `model User` com os modelos de finance.prisma (o Prisma exige os dois lados).
// Este script as injeta de volta; pode rodar quantas vezes quiser (é idempotente).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const file = join(
	import.meta.dirname,
	"../packages/db/prisma/schema/auth.prisma",
);

const relations = [
	"categories   Category[]",
	"cards        Card[]",
	"people       Person[]",
	"series       Series[]",
	"transactions Transaction[]",
	"goals        Goal[]",
	"settings     UserSettings?",
];

const source = readFileSync(file, "utf8");
const lineEnding = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);

const start = lines.findIndex((line) => /^model User \{/.test(line));
if (start === -1) throw new Error("model User não encontrado em auth.prisma");
const end = lines.findIndex((line, i) => i > start && line === "}");

const body = lines.slice(start, end);
const missing = relations.filter((relation) => {
	const field = relation.split(/\s+/)[0];
	return !body.some((line) => new RegExp(`^ +${field} `).test(line));
});
if (missing.length === 0) {
	console.log("auth.prisma já tem as relações de finance.prisma");
	process.exit(0);
}

// Entra logo depois do último campo (antes da linha em branco e dos @@ do modelo).
let insertAt = end;
for (let i = start + 1; i < end; i++) {
	if (lines[i].trim() === "" || lines[i].trim().startsWith("@@")) {
		insertAt = i;
		break;
	}
}
lines.splice(insertAt, 0, ...missing.map((relation) => `  ${relation}`));
writeFileSync(file, lines.join(lineEnding));
console.log(
	`auth.prisma: ${missing.length} relação(ões) adicionada(s) ao model User`,
);
