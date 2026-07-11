import { io, type Socket } from 'socket.io-client'
import type { GameState, GameResult } from '@cyber-deck/engine'

export interface PlayerInfo {
  userId:   string
  username: string
}

// Intentions de jeu envoyées au serveur (miroir du protocole serveur).
export type GameIntent =
  | { type: 'playCard';  instanceId: string }
  | { type: 'swap' }
  | { type: 'attack';    attackerId: string; targetId?: string }
  | { type: 'heal';      healerId: string;   targetId: string }
  | { type: 'playSpell'; instanceId: string; targetId?: string }
  | { type: 'endTurn' }

interface ServerToClientEvents {
  'queue:waiting':         () => void
  'match:found':           (payload: { matchId: string; you: PlayerInfo; opponent: PlayerInfo }) => void
  'game:state':            (payload: { state: GameState }) => void
  'game:over':             (payload: { state: GameState; result: GameResult }) => void
  'opponent:disconnected': (payload: { graceMs: number }) => void
  'opponent:reconnected':  () => void
  'game:error':            (payload: { message: string }) => void
}

interface ClientToServerEvents {
  'queue:join':  () => void
  'queue:leave': () => void
  'game:intent': (intent: GameIntent) => void
}

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:8081'

// Ouvre une connexion authentifiée au serveur temps réel (JWT dans le handshake).
export function createSocket(token: string): GameSocket {
  return io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
  })
}
