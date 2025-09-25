# Database Setup — Project Momentum

This guide explains how to set up Postgres and Prisma for the C3PL Quote Calculator.

---

## Prereqs

- Postgres running locally
- `pnpm` installed
- `DATABASE_URL` exported in your shell

Example DATABASE_URL for local dev:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/momentum_dev?schema=public"
```

Tip: Prisma also reads from a local .env file. You can create one at the repo root containing the same line above.

## Create DB

```bash
createdb momentum_dev
```

## Install deps

```bash
pnpm install
```

## Generate Prisma client

```bash
pnpm db:generate
```

## Run migrations

```bash
pnpm db:migrate
```

## Seed data

```bash
pnpm db:seed
```

## Explore data (optional)

```bash
pnpm db:studio
```

### Quick local Postgres (optional)

If you prefer Docker, you can spin up Postgres quickly:

```bash
docker run --name momentum-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
createdb -h localhost -U postgres momentum_dev
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/momentum_dev?schema=public"
```
