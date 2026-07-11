import 'dotenv/config'

function num(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export const env = {
  PORT:                num(process.env.PORT, 8081),
  JWT_SECRET:          process.env.JWT_SECRET ?? '',
  BACKEND_URL:         process.env.BACKEND_URL ?? 'http://localhost:8080',
  CLIENT_ORIGIN:       process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  DISCONNECT_GRACE_MS: num(process.env.DISCONNECT_GRACE_MS, 30_000),
}

if (!env.JWT_SECRET) {
  console.warn('[env] JWT_SECRET est vide — toutes les connexions socket seront rejetées.')
}
