import { createAuth } from "@arvo/auth";
import { createPrismaClient } from "@arvo/db";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);
export const auth = createAuth(ENV, db);
