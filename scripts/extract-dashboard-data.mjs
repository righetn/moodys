import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const htmlPath = path.join(root, "Customer_Sentiment_Dashboard.html")
const outPath = path.join(root, "data.json")

const html = fs.readFileSync(htmlPath, "utf8")

function textContent(s) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractTds(trInner) {
  const tds = []
  let pos = 0
  while (pos < trInner.length) {
    const open = trInner.indexOf("<td", pos)
    if (open === -1) break
    const gt = trInner.indexOf(">", open)
    const close = trInner.indexOf("</td>", gt)
    if (close === -1) break
    tds.push(trInner.slice(gt + 1, close))
    pos = close + 5
  }
  return tds
}

function pillsFromTd(td, kind) {
  const re =
    kind === "problem"
      ? /<span class="pill pill-problem"[^>]*>([^<]*)<\/span>/g
      : /<span class="pill pill-feature"[^>]*>([^<]*)<\/span>/g
  const out = []
  let m
  while ((m = re.exec(td)) !== null) out.push(m[1])
  return out
}

function parseCalls(inner) {
  const cards = []
  const startTag = '<div class="call-card">'
  const sumTag = '<div class="call-summary">'
  let pos = 0
  while (true) {
    const i = inner.indexOf(startTag, pos)
    if (i === -1) break
    const headerStart = i + startTag.length
    const sIdx = inner.indexOf(sumTag, headerStart)
    if (sIdx === -1) break
    const header = inner.slice(headerStart, sIdx)
    const sumContentStart = sIdx + sumTag.length
    const sumContentEnd = inner.indexOf("</div>", sumContentStart)
    if (sumContentEnd === -1) break
    const summary = inner.slice(sumContentStart, sumContentEnd).trim()
    const titleM = header.match(/<span class="call-title">([^<]*)<\/span>/)
    const sentM = header.match(/<span class="call-sentiment"[^>]*>([^<]*)<\/span>/)
    const dateM = header.match(/<span class="call-date">([^<]*)<\/span>/)
    cards.push({
      title: titleM ? titleM[1].trim() : "",
      sentiment: sentM ? sentM[1].trim() : "",
      date: dateM ? dateM[1].trim() : "",
      summary,
    })
    const afterSummary = sumContentEnd + "</div>".length
    const cardClose = inner.indexOf("</div>", afterSummary)
    pos = cardClose === -1 ? afterSummary : cardClose + "</div>".length
  }
  return cards
}

const subtitleMatch = html.match(
  /<div class="subtitle">([^<]+)<\/div>/,
)
const subtitle = subtitleMatch ? subtitleMatch[1].trim() : ""

const kpis = []
const kpiRe =
  /<div class="kpi-card ([^"]+)">\s*<div class="kpi-label">([^<]+)<\/div>\s*<div class="kpi-value">([^<]+)<\/div>\s*<div class="kpi-label">([^<]+)<\/div>\s*<\/div>/g
let km
while ((km = kpiRe.exec(html)) !== null) {
  kpis.push({
    tone: km[1].trim(),
    label: km[2].trim(),
    value: km[3].trim(),
    sublabel: km[4].trim(),
  })
}

const segmentOptions = [{ value: "all", label: "Tous les segments" }]
const segSelect = html.match(
  /<select id="filterSegment"[\s\S]*?<\/select>/,
)
if (segSelect) {
  const optRe = /<option value="([^"]+)">([^<]+)<\/option>/g
  let om
  while ((om = optRe.exec(segSelect[0])) !== null) {
    if (om[1] !== "all") segmentOptions.push({ value: om[1], label: om[2] })
  }
}

const clients = []
const rowRe =
  /<tr class="clickable"[^>]*onclick="toggleDetail\('([^']+)'\)"[^>]*data-score="([^"]*)"[^>]*data-segment="([^"]*)"[^>]*data-name="([^"]*)">([\s\S]*?)<\/tr>\s*<tr class="detail-row" id="detail-\1">([\s\S]*?)<\/tr>/g

let rm
while ((rm = rowRe.exec(html)) !== null) {
  const id = rm[1]
  const scoreRaw = rm[2]
  const segment = rm[3]
  const searchName = rm[4]
  const rowInner = rm[5]
  const detailInner = rm[6]

  const tds = extractTds(rowInner)
  const linkM = tds[0]?.match(
    /<a href="([^"]+)"[^>]*>([^<]+)<\/a>/,
  )
  const hubspotUrl = linkM ? linkM[1] : ""
  const displayName = linkM ? linkM[2].trim() : textContent(tds[0] || "")

  const scoreText = textContent(tds[2] || "")
  const score =
    scoreText === "N/A" ? null : Number.parseInt(scoreText, 10) || null

  const trendSpan = tds[3] || ""
  let trend = "stable"
  if (trendSpan.includes("trend-up")) trend = "up"
  else if (trendSpan.includes("trend-down")) trend = "down"
  else if (trendSpan.includes("trend-stable")) trend = "stable"

  const trendSymbol = textContent(trendSpan) || "—"

  const sentiment = textContent(tds[4] || "") || null
  const lastCallRaw = textContent(tds[5] || "")
  const lastCall = lastCallRaw === "—" ? null : lastCallRaw

  const problems = pillsFromTd(tds[6] || "", "problem")
  const features = pillsFromTd(tds[7] || "", "feature")

  const noDataMsg = detailInner.match(
    /<p class="no-data">([^<]*)<\/p>/,
  )
  const detailContent = detailInner.match(
    /<div class="detail-content">([\s\S]*?)<\/div>\s*<\/td>/,
  )
  const inner = detailContent ? detailContent[1] : ""
  const detailTitle = inner.match(/<h4>([^<]*)<\/h4>/)
  const calls = noDataMsg
    ? []
    : parseCalls(inner)
  const emptyMessage = noDataMsg ? noDataMsg[1].trim() : null

  clients.push({
    id,
    searchName,
    displayName,
    hubspotUrl,
    segment,
    score,
    scoreFilter: scoreRaw,
    trend,
    trendSymbol,
    sentiment,
    lastCall,
    problems,
    features,
    detailTitle: detailTitle ? detailTitle[1].trim() : displayName,
    emptyMessage,
    calls,
  })
}

const footerMatch = html.match(/<footer>([^<]+)<\/footer>/)
const footer = footerMatch ? footerMatch[1].trim() : ""

const scoreOptions = [
  { value: "all", label: "Tous les scores" },
  { value: "1", label: "🔴 Alerte (1)" },
  { value: "2", label: "🟠 Attention (2)" },
  { value: "3", label: "🟢 Excellent (3)" },
  { value: "na", label: "Sans données" },
]

const payload = {
  meta: {
    title: "Tomorro — Customer Sentiment Dashboard",
    subtitle,
    footer,
  },
  kpis,
  filters: {
    segments: segmentOptions,
    scoreOptions,
  },
  clients,
}

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8")
console.log("Wrote", outPath, "clients:", clients.length)
