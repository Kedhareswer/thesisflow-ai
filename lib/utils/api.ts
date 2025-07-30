// This file provides utility functions for API interactions.

/**
 * Base URL for API endpoints.
 * For client-side usage, this should be a relative path or a NEXT_PUBLIC_ environment variable.
 */
export const API_BASE_URL = "/api"

/**
 * Helper function to construct a full API URL.
 * @param path The API endpoint path (e.g., '/ai/generate').
 * @returns The full API URL.
 */
export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

/**
 * Generic fetcher function for SWR or direct use.
 * @param url The URL to fetch.
 * @returns A promise that resolves to the JSON response.
 */
export async function fetcher<T = any>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "An unknown error occurred" }))
    throw new Error(errorData.message || "Failed to fetch data")
  }
  return response.json()
}

/**
 * Generic POST request function.
 * @param url The URL to post to.
 * @param data The data to send in the request body.
 * @returns A promise that resolves to the JSON response.
 */
export async function postData<T = any, U = any>(url: string, data: U): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "An unknown error occurred" }))
    throw new Error(errorData.message || "Failed to post data")
  }
  return response.json()
}
