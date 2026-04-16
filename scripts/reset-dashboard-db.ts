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
  // Une seule commande : Postgres refuse TRUNCATE sur `organization` dans un
  // appel séparé tant que `score` référence cette table (même vide).
  await sql`TRUNCATE TABLE score, organization RESTART IDENTITY`
  console.log("Tables `score` et `organization` ont été vidées.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
