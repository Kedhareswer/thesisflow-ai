export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any,
  ) {
    super(message)
    this.name = "APIError"
  }
}

/**
 * Tiny wrapper around fetch that the rest of the codebase imports as either
 *
 *   import { api } from "@/lib/utils/api"
 *   import api       from "@/lib/utils/api"
 *
 * Both styles now work.
 */

export async function api<T>(input: RequestInfo, init?: RequestInit & { parseAsJson?: boolean }): Promise<T> {
  const res = await fetch(input, init)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return (init?.parseAsJson ?? true) ? ((await res.json()) as T) : ((await res.text()) as unknown as T)
}

// default export for `import api from …`
export default api
