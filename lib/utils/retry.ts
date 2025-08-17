// Generic retry helper with exponential backoff and jitter
// --------------------------------------------------------
// Usage:
//   const response = await fetchWithRetry(url, {}, 3)
// --------------------------------------------------------

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<Response> {
  let attempt = 0
  let nextDelayOverride: number | undefined

  const parseRetryAfterMs = (header?: string | null): number | undefined => {
    if (!header) return undefined
    const n = Number(header)
    if (!Number.isNaN(n)) return n * 1000
    const t = Date.parse(header)
    if (Number.isNaN(t)) return undefined
    const delta = t - Date.now()
    return delta > 0 ? delta : 0
  }

  const shouldRetry = (status: number) => status === 429 || status === 408 || status >= 500

  while (true) {
    try {
      const res = await fetch(url, init)
      // Return immediately if status is not retriable
      if (!shouldRetry(res.status)) return res

      // Exceeded retry count
      if (attempt >= maxRetries) return res

      // Check server-provided delay
      nextDelayOverride = parseRetryAfterMs(res.headers.get('retry-after'))
    } catch (err) {
      // Network error – retry if attempts left
      if (attempt >= maxRetries) throw err
    }

    // Backoff with jitter, preferring server hint
    const base = nextDelayOverride ?? baseDelayMs * 2 ** attempt
    const delay = base + Math.random() * 200
    await new Promise(r => setTimeout(r, delay))
    attempt++
    nextDelayOverride = undefined
  }
}
