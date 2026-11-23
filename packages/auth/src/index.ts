import type { Database } from "@arvo/db";
import { createDefaultCategories } from "@arvo/db/default-categories";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export type AuthConfig = {
	BETTER_AUTH_URL: string;
	BETTER_AUTH_SECRET: string;
	CORS_ORIGIN: string;
	NODE_ENV?: string;
};

export function createAuth(
	env: AuthConfig,
	database: Database,
	desktopOrigins: readonly string[] = [],
) {
	return betterAuth({
		database: prismaAdapter(database, {
			provider: "postgresql",
		}),
		trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
		emailAndPassword: {
			enabled: true,
			sendResetPassword: async ({ user, url }) => {
				// P5: o envio real é pelo Resend (ainda não configurado). Em dev, o link vai para o log.
				if (env.NODE_ENV === "production") {
					throw new Error("Envio de e-mail ainda não configurado (P5).");
				}
				console.log(`[recuperar senha] ${user.email}: ${url}`);
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "lax",
				secure: env.BETTER_AUTH_URL.startsWith("https://"),
				httpOnly: true,
			},
		},
		databaseHooks: {
			user: {
				create: {
					// Toda conta nova já começa com as categorias padrão.
					after: async (user) => {
						await createDefaultCategories(database, user.id);
					},
				},
			},
		},
		plugins: [],
	});
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
