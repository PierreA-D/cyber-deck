import type { ZodSchema } from 'zod'

let onUnauthorized: (() => void) | null = null
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export async function apiFetch<T>(
  path: string,
  schema: ZodSchema<T>,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  if (res.status === 401) {
    onUnauthorized?.()
    throw new Error('Non autorisé')
  }
  if (!res.ok) throw new Error(`Erreur ${res.status}`)
  return schema.parse(await res.json())
}