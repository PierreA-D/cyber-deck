import type { PlayerState } from '@cyber-deck/engine'

export interface WaitingPlayer {
  userId:   string
  username: string
  token:    string
  socketId: string
  player:   PlayerState
}

const queue: WaitingPlayer[] = []

// Ajoute un joueur à la file. Si un adversaire distinct attend déjà,
// renvoie la paire [adversaire, entrant] ; sinon empile et renvoie null.
export function enqueue(entry: WaitingPlayer): [WaitingPlayer, WaitingPlayer] | null {
  removeFromQueue(entry.userId)

  const idx = queue.findIndex((w) => w.userId !== entry.userId)
  if (idx !== -1) {
    const [opponent] = queue.splice(idx, 1)
    return [opponent, entry]
  }

  queue.push(entry)
  return null
}

export function removeFromQueue(userId: string): void {
  const idx = queue.findIndex((w) => w.userId === userId)
  if (idx !== -1) queue.splice(idx, 1)
}
