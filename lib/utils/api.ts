import type { APIResponse } from "@/lib/types/common"

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

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<APIResponse<T>> {
  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
    },
  }

  const config = { ...defaultOptions, ...options }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new APIError(data.error || `HTTP error! status: ${response.status}`, response.status, data)
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message,
    }
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    }
  }
}

export const api = {
  get: <T>(url: string) => apiRequest<T>(url, { method: 'GET' }),

  post: <T>(url: string, data?: any) =>
    apiRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(url: string, data?: any) =>
    apiRequest<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  delete: <T>(url: string) => apiRequest<T>(url, { method: 'DELETE' }),
}
