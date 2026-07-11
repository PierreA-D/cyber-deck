import type { GameState, GameResult } from '@cyber-deck/engine'

export interface PlayerInfo {
  userId:   string
  username: string
}

// Intentions de jeu envoyées par le client (miroir des actions du moteur).
export type GameIntent =
  | { type: 'playCard';  instanceId: string }
  | { type: 'swap' }
  | { type: 'attack';    attackerId: string; targetId?: string }
  | { type: 'heal';      healerId: string;   targetId: string }
  | { type: 'playSpell'; instanceId: string; targetId?: string }
  | { type: 'endTurn' }

export interface ServerToClientEvents {
  'queue:waiting':         () => void
  'match:found':           (payload: { matchId: string; you: PlayerInfo; opponent: PlayerInfo }) => void
  'game:state':            (payload: { state: GameState }) => void
  'game:over':             (payload: { state: GameState; result: GameResult }) => void
  'opponent:disconnected': (payload: { graceMs: number }) => void
  'opponent:reconnected':  () => void
  'game:error':            (payload: { message: string }) => void
}

export interface ClientToServerEvents {
  'queue:join':  () => void
  'queue:leave': () => void
  'game:intent': (intent: GameIntent) => void
}

export type InterServerEvents = Record<string, never>

export interface SocketData {
  userId:   string
  username: string
  token:    string
}
