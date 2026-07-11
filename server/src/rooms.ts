import type { MatchState } from '@cyber-deck/engine'

export interface Participant {
  userId:          string
  username:        string
  token:           string
  socketId:        string | null
  connected:       boolean
  disconnectTimer: ReturnType<typeof setTimeout> | null
}

export interface Room {
  id:           string
  match:        MatchState
  participants: Record<string, Participant>
  order:        [string, string]
  saved:        boolean
}

const rooms = new Map<string, Room>()
const userToRoom = new Map<string, string>()

export function createRoom(id: string, match: MatchState, participants: [Participant, Participant]): Room {
  const room: Room = {
    id,
    match,
    participants: {
      [participants[0].userId]: participants[0],
      [participants[1].userId]: participants[1],
    },
    order: [participants[0].userId, participants[1].userId],
    saved: false,
  }
  rooms.set(id, room)
  userToRoom.set(participants[0].userId, id)
  userToRoom.set(participants[1].userId, id)
  return room
}

export function roomOfUser(userId: string): Room | undefined {
  const id = userToRoom.get(userId)
  return id ? rooms.get(id) : undefined
}

export function opponentOf(room: Room, userId: string): Participant {
  const otherId = room.order[0] === userId ? room.order[1] : room.order[0]
  return room.participants[otherId]
}

export function destroyRoom(room: Room): void {
  for (const p of Object.values(room.participants)) {
    if (p.disconnectTimer) clearTimeout(p.disconnectTimer)
    userToRoom.delete(p.userId)
  }
  rooms.delete(room.id)
}
