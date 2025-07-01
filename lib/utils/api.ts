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

// Convenience methods for common HTTP operations
api.get = async function<T>(url: string, init?: RequestInit): Promise<T> {
  return api<T>(url, { ...init, method: 'GET' })
}

api.post = async function<T>(url: string, data?: any, init?: RequestInit): Promise<T> {
  return api<T>(url, {
    ...init,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  })
}

api.put = async function<T>(url: string, data?: any, init?: RequestInit): Promise<T> {
  return api<T>(url, {
    ...init,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  })
}

api.delete = async function<T>(url: string, init?: RequestInit): Promise<T> {
  return api<T>(url, { ...init, method: 'DELETE' })
}

// default export for `import api from …`
export default api
