/**
 * One-off / repeatable normalizer: align data.json with dashboardClientSchema
 * (strip legacy trend/sentiment, add csm + emails).
 *
 * Run: npx tsx scripts/normalize-data-json.ts
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { parseClientsJson } from "../lib/schemas/dashboard"

const POLARISE_SAMPLE_EMAILS = [
  {
    subject: "Re: Tomorro <> Polarise - Follow up meeting",
    direction: "outbound" as const,
    sentiment: "Neutral",
    sender: "thibaut@tomorro.com",
    date: "26/03/24",
    hubspotUrl: "https://app.hubspot.com/contacts/7016971/record/0-2/41392015388",
  },
  {
    subject: "Zugesagt: Tomorro <> Polarise - Follow up meeting - juin 2026",
    direction: "inbound" as const,
    sentiment: "Neutral",
    sender: "m.damm@polarise.eu",
    date: "15/04/26",
    hubspotUrl: "https://app.hubspot.com/contacts/7016971/record/0-2/41392015388",
  },
]

function main() {
  const path = join(process.cwd(), "data.json")
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown
  const arr = Array.isArray(raw) ? raw : (raw as { clients?: unknown }).clients
  if (!Array.isArray(arr)) {
    throw new Error("data.json must be a JSON array or { clients: [...] }")
  }

  const next = arr.map((row: Record<string, unknown>) => {
    const rest = { ...row }
    delete rest.trend
    delete rest.trendSymbol
    delete rest.sentiment
    const id = String(rest.id ?? "")
    const base = {
      ...rest,
      emails: Array.isArray(rest.emails) ? rest.emails : [],
      csm: rest.csm === undefined || rest.csm === "" ? null : String(rest.csm),
    }
    if (id === "41392015388" && Array.isArray(base.emails) && base.emails.length === 0) {
      return { ...base, emails: POLARISE_SAMPLE_EMAILS }
    }
    return base
  })

  const parsed = parseClientsJson(next)
  if (!parsed?.length) {
    throw new Error("Normalized data failed schema validation. Fix data.json manually.")
  }

  writeFileSync(path, JSON.stringify(parsed, null, 2) + "\n", "utf8")
  console.log("Wrote", parsed.length, "clients to data.json (validated).")
}

main()
