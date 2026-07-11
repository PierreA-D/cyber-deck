import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { Server } from 'socket.io'
import { createMatchState, projectMatch, buildPlayerFromActiveDecks } from '@cyber-deck/engine'
import { env } from './env'
import { authenticate } from './auth'
import { fetchActiveDecks, saveGameResult } from './decks'
import { enqueue, removeFromQueue, type WaitingPlayer } from './matchmaking'
import { createRoom, roomOfUser, opponentOf, destroyRoom, type Participant, type Room } from './rooms'
import { applyIntent, broadcastState } from './gameHandlers'
import type {
  ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData,
  GameIntent, PlayerInfo,
} from './protocol'

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('ok')
    return
  }
  res.writeHead(404)
  res.end()
})

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  { cors: { origin: env.CLIENT_ORIGIN, methods: ['GET', 'POST'] } },
)

io.use(authenticate)

io.on('connection', (socket) => {
  const { userId, username } = socket.data
  console.log(`[io] ${username} (${userId}) connecté`)

  // Reconnexion : une partie en cours existe déjà pour ce joueur → resync.
  const current = roomOfUser(userId)
  if (current && current.match.result.status === 'ongoing') {
    const me = current.participants[userId]
    if (me) {
      if (me.disconnectTimer) { clearTimeout(me.disconnectTimer); me.disconnectTimer = null }
      me.socketId = socket.id
      me.connected = true
      void socket.join(current.id)
      const opp = opponentOf(current, userId)
      socket.emit('match:found', { matchId: current.id, you: toInfo(me), opponent: toInfo(opp) })
      socket.emit('game:state', { state: projectMatch(current.match, userId, { maskOpponent: true }) })
      if (opp.socketId) io.to(opp.socketId).emit('opponent:reconnected')
    }
  }

  socket.on('queue:join', async () => {
    if (roomOfUser(userId)) {
      socket.emit('game:error', { message: 'Vous êtes déjà en partie.' })
      return
    }
    try {
      const decks = await fetchActiveDecks(socket.data.token)
      const player = buildPlayerFromActiveDecks(userId, decks) // valide les decks
      const pair = enqueue({ userId, username, token: socket.data.token, socketId: socket.id, player })
      if (!pair) {
        socket.emit('queue:waiting')
        return
      }
      startMatch(pair[0], pair[1])
    } catch (e) {
      socket.emit('game:error', { message: e instanceof Error ? e.message : 'Échec de la mise en file.' })
    }
  })

  socket.on('queue:leave', () => {
    removeFromQueue(userId)
  })

  socket.on('game:intent', (intent: GameIntent) => {
    const room = roomOfUser(userId)
    if (!room) {
      socket.emit('game:error', { message: 'Aucune partie active.' })
      return
    }
    if (room.match.result.status !== 'ongoing') return
    if (room.match.activePlayerId !== userId) {
      socket.emit('game:error', { message: "Ce n'est pas votre tour." })
      return
    }
    try {
      applyIntent(room.match, userId, intent)
    } catch (e) {
      socket.emit('game:error', { message: e instanceof Error ? e.message : 'Action invalide.' })
      return
    }
    broadcastState(io, room)
    if (room.match.result.status !== 'ongoing') finishMatch(room)
  })

  socket.on('disconnect', () => {
    removeFromQueue(userId)
    const room = roomOfUser(userId)
    if (!room) return
    const me = room.participants[userId]
    if (me) {
      me.connected = false
      me.socketId = null
    }
    if (room.match.result.status !== 'ongoing') return
    const opp = opponentOf(room, userId)
    if (opp.socketId) io.to(opp.socketId).emit('opponent:disconnected', { graceMs: env.DISCONNECT_GRACE_MS })
    if (me) me.disconnectTimer = setTimeout(() => forfeit(room, userId), env.DISCONNECT_GRACE_MS)
  })
})

function toInfo(p: Participant): PlayerInfo {
  return { userId: p.userId, username: p.username }
}

function startMatch(a: WaitingPlayer, b: WaitingPlayer): void {
  const match = createMatchState(
    { playerId: a.userId, controller: 'human' }, a.player,
    { playerId: b.userId, controller: 'human' }, b.player,
  )

  const pa: Participant = { userId: a.userId, username: a.username, token: a.token, socketId: a.socketId, connected: true, disconnectTimer: null }
  const pb: Participant = { userId: b.userId, username: b.username, token: b.token, socketId: b.socketId, connected: true, disconnectTimer: null }
  const room = createRoom(randomUUID(), match, [pa, pb])

  const sa = io.sockets.sockets.get(a.socketId)
  const sb = io.sockets.sockets.get(b.socketId)
  void sa?.join(room.id)
  void sb?.join(room.id)
  sa?.emit('match:found', { matchId: room.id, you: toInfo(pa), opponent: toInfo(pb) })
  sb?.emit('match:found', { matchId: room.id, you: toInfo(pb), opponent: toInfo(pa) })
  broadcastState(io, room)
}

function finishMatch(room: Room): void {
  if (!room.saved) {
    room.saved = true
    for (const p of Object.values(room.participants)) {
      const state = projectMatch(room.match, p.userId, { maskOpponent: true })
      void saveGameResult(p.token, state.result.status, room.match.turn)
    }
  }
  destroyRoom(room)
}

function forfeit(room: Room, quitterId: string): void {
  if (room.match.result.status !== 'ongoing') return
  const winnerId = room.order[0] === quitterId ? room.order[1] : room.order[0]
  room.match.result = { status: 'win', winnerId }
  broadcastState(io, room) // émet game:over
  finishMatch(room)
}

httpServer.listen(env.PORT, () => {
  console.log(`[server] Socket.IO en écoute sur :${env.PORT}`)
})
