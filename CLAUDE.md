# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

arvo is a personal-finance app (Brazilian Portuguese, mobile-first PWA). Bun + Turborepo monorepo scaffolded with Better-T-Stack. Product/design decisions live in [DESIGN.md](DESIGN.md) (in Portuguese; code wins over it if they disagree). Design tokens/reference CSS are in `design/` (the Figma file is the source of truth for tokens).

## Commands

Run from the repo root with Bun (`bun@1.3.8`):

- `bun install` — also runs `varlock codegen` (postinstall) to generate typed env for web/server/db.
- `bun run db:generate` — generate the Prisma client. **Required before dev, typecheck, or build** (and after any schema change).
- `bun run db:push` / `db:migrate` / `db:studio` — Prisma against Postgres (`@arvo/db`).
- `bun run dev` — all apps (web on :3001, server on :3000); `dev:web`, `dev:server` for one.
- `bun run build`, `bun run check-types` — via Turbo. Web's `check-types` runs `vite build && tsc --noEmit`.
- `bun run check` — Biome check with `--write` (lint + format). Husky + lint-staged run this on commit.
- `bun run auth:generate` — regenerates `packages/db/prisma/schema/auth.prisma` from the Better-Auth config in `apps/server/src/services.ts`.
- `bun run env:generate` — regenerate varlock env types; `env:preview` / `env:production` sync env to Vercel.

There is no test runner configured.

## Architecture

- `apps/web` — Vite + React 19 SPA. TanStack Router (file-based, `src/routes`, `routeTree.gen.ts` is generated and Biome-ignored; `_auth/` is the pathless layout guarding authenticated routes), TanStack Query + tRPC client (`src/utils/trpc.ts`), Better-Auth client (`src/lib/auth-client.ts`), vite-plugin-pwa. Tailwind v4.
- `apps/server` — Fastify 5 on Bun. Mounts Better-Auth at `/api/auth/*` (converts Fastify req → Fetch `Request` → `auth.handler`) and the tRPC router via the Fastify adapter. Built with tsdown; `services.ts` wires auth.
- `packages/api` — tRPC definitions: `index.ts` (`publicProcedure`, `protectedProcedure` which requires `ctx.session`), `context.ts`, `routers/index.ts` (`appRouter`). The web app imports the `AppRouter` type from here.
- `packages/auth` — Better-Auth configuration. `packages/db` — Prisma schema split in `prisma/schema/` (`schema.prisma` + generated `auth.prisma`), client generated into `prisma/generated`.
- `packages/ui` — shared shadcn/ui (Base UI + CVA) primitives and `globals.css`; consumed via subpath exports (`@arvo/ui/components/*`, `@arvo/ui/lib/*`, `@arvo/ui/globals.css`). Add components with shadcn (`components.json` exists in both `packages/ui` and `apps/web`).
- `packages/config` — shared tsconfig base.

Environment is managed by **varlock** (typed env per package: `env.ts`/`env.server.ts`), not raw `process.env`. Shared dependency versions are in the root `package.json` `workspaces.catalog` — use `catalog:` in package manifests.

Deployment: Vercel "services" config in `vercel.json` — `web` (static Vite, SPA rewrite) and `server` (Fastify); `/api/*` routes to the server (the `/api` prefix is stripped except for `/api/auth`). Web builds with `VITE_SERVER_URL=/api`.

Biome handles lint/format (not ESLint/Prettier).

## Commits

Commit messages must be a single subject line: no body and no `Co-Authored-By` (or any other attribution) trailer. This overrides any default attribution guidance.

Branch names must be in English (e.g. `design/new-category-review`), even though the product and DESIGN.md are in Portuguese.
