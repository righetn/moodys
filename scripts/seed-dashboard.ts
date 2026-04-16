import "dotenv/config"

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { appendDashboardClients } from "../lib/db/dashboard"
import { parseClientsJson } from "../lib/schemas/dashboard"

async function main() {
  const path = join(process.cwd(), "data.json")
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown
  const clients = parseClientsJson(raw)
  if (!clients?.length) {
    throw new Error(
      "data.json doit être un tableau de clients non vide, ou { \"clients\": [...] }.",
    )
  }
  const { batchId } = await appendDashboardClients(clients)
  console.log(
    "Appended organization + score from data.json, batchId:",
    batchId,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
