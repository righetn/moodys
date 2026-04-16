/**
 * RFC 4180–style CSV field: quote if needed, escape internal quotes.
 */
export function escapeCsvField(value: string): string {
  const needsQuotes =
    /[",\r\n]/.test(value) || value.startsWith(" ") || value.endsWith(" ")
  const inner = value.replace(/"/g, '""')
  return needsQuotes ? `"${inner}"` : inner
}
