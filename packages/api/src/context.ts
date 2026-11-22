import type { Session } from "@arvo/auth";
import type { Database } from "@arvo/db";

export type Context = {
	session: Session | null;
	db: Database;
};
