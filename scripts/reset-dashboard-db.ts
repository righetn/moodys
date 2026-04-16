/**
 * Vide les tables du dashboard (Neon). À lancer avant `npm run db:seed`
 * pour repartir de zéro.
 *
 * Requiert DATABASE_URL ou POSTGRES_URL dans .env
 *
 *   npm run db:reset
 */
import "dotenv/config"

import { neon } from "@neondatabase/serverless"

async function main() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
  if (!url?.trim()) {
    throw new Error(
      "DATABASE_URL (ou POSTGRES_URL) est requis dans .env pour reset la base.",
    )
  }
  const sql = neon(url)
  await sql`TRUNCATE TABLE score RESTART IDENTITY`
  await sql`TRUNCATE TABLE organization`
  console.log("Tables `score` et `organization` ont été vidées.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
