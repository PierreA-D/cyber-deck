import jwt from 'jsonwebtoken'
import type { Socket } from 'socket.io'
import { env } from './env'
import type {
  ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData,
} from './protocol'

type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

function extractToken(socket: IOSocket): string | null {
  const fromAuth = socket.handshake.auth?.token
  if (typeof fromAuth === 'string' && fromAuth) return fromAuth
  const header = socket.handshake.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return null
}

// Middleware Socket.IO : valide le JWT (HS256) et renseigne socket.data.
export function authenticate(socket: IOSocket, next: (err?: Error) => void): void {
  try {
    const token = extractToken(socket)
    if (!token) return next(new Error('unauthorized'))

    const payload = jwt.verify(token, env.JWT_SECRET) as Record<string, unknown>
    const userId = String(payload.userId ?? payload.sub ?? payload.id ?? '')
    if (!userId) return next(new Error('unauthorized'))

    socket.data.userId = userId
    socket.data.username = String(payload.username ?? payload.name ?? `Player_${userId.slice(0, 6)}`)
    socket.data.token = token
    next()
  } catch {
    next(new Error('unauthorized'))
  }
}
