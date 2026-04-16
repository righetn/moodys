export function isProductionApi(): boolean {
  return process.env.NODE_ENV === "production"
}
