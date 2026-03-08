export function getBaseUrl() {
  if (typeof window !== "undefined") return ""

  // VERCEL_URL is provided by Vercel automatically (without protocol)
  // NEXT_PUBLIC_BASE_URL is set manually in Vercel env vars (with protocol)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "") // remove trailing slash
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return "http://localhost:3000"
}