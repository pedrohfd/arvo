import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../prisma/generated/client";
import type { DatabaseConfig } from "./config";

// Neon fala por WebSocket e só existe na nuvem; o Postgres do Docker local usa o driver comum.
function isLocalDatabase(connectionString: string) {
	try {
		const { hostname } = new URL(connectionString);
		return (
			hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
		);
	} catch {
		return false;
	}
}

export function createPrismaClient(env: DatabaseConfig) {
	const adapter = isLocalDatabase(env.DATABASE_URL)
		? new PrismaPg({ connectionString: env.DATABASE_URL })
		: new PrismaNeon({ connectionString: env.DATABASE_URL });

	return new PrismaClient({ adapter });
}

export type Database = ReturnType<typeof createPrismaClient>;
