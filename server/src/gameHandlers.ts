import type { Server } from 'socket.io'
import {
  type MatchState, type SpellTarget,
  endTurn as advanceTurn,
  projectMatch, opponentId,
  resolveAttack, getAttackTarget, getValidAttackTargets,
  resolveHeal, cleanupBoard,
  resolveSpell, resolveAutoTarget,
  playCardToBoard, playSwap, playSpellCard,
  isSpellCard,
} from '@cyber-deck/engine'
import type {
  ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData, GameIntent,
} from './protocol'
import type { Room } from './rooms'

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

// Applique une intention du joueur `actorId` sur l'état autoritaire.
// Pré-condition (vérifiée par l'appelant) : partie en cours ET tour de `actorId`.
export function applyIntent(match: MatchState, actorId: string, intent: GameIntent): void {
  const me    = match.players[actorId]
  const enemy = match.players[opponentId(match, actorId)]

  switch (intent.type) {
    case 'playCard':
      playCardToBoard(me, intent.instanceId)
      break

    case 'swap':
      playSwap(me)
      break

    case 'attack': {
      const attacker = me.board.find((c) => c.instanceId === intent.attackerId)
      if (!attacker) return
      const explicit = intent.targetId
        ? [...enemy.board, enemy.legend].find((c) => c.instanceId === intent.targetId)
        : undefined
      const valid = getValidAttackTargets(actorId, match)
      const target = explicit && valid.includes(explicit) ? explicit : getAttackTarget(actorId, match)
      if (!target) return
      resolveAttack(attacker, target, match)
      cleanupBoard(enemy)
      break
    }

    case 'heal': {
      const healer = me.board.find((c) => c.instanceId === intent.healerId)
      if (!healer) return
      const target = [...me.board, me.legend].find((c) => c.instanceId === intent.targetId)
      if (!target) return
      resolveHeal(healer, target, match)
      break
    }

    case 'playSpell': {
      const card = me.hand.find((c) => c.instanceId === intent.instanceId)
      if (!card || !isSpellCard(card) || !card.data.spellEffect) return
      const effect = card.data.spellEffect

      // Cible manuelle explicite (single_card manual)
      if (intent.targetId) {
        const targetCard = [...me.board, ...enemy.board].find((c) => c.instanceId === intent.targetId)
        if (!targetCard) return
        if (!playSpellCard(me, intent.instanceId)) return
        const target: SpellTarget = { kind: 'card', card: targetCard }
        resolveSpell(effect, target, match)
        return
      }

      // Résolution automatique (champion, board entier, single_card auto)
      if (!playSpellCard(me, intent.instanceId)) return
      const auto = resolveAutoTarget(effect, actorId, match)
      if (auto) resolveSpell(effect, auto, match)
      break
    }

    case 'endTurn':
      advanceTurn(match, actorId)
      break
  }
}

// Envoie à chaque participant SA vue projetée (main adverse masquée).
export function broadcastState(io: IO, room: Room): void {
  const over = room.match.result.status !== 'ongoing'
  for (const p of Object.values(room.participants)) {
    if (!p.socketId) continue
    const state = projectMatch(room.match, p.userId, { maskOpponent: true })
    if (over) io.to(p.socketId).emit('game:over', { state, result: state.result })
    else      io.to(p.socketId).emit('game:state', { state })
  }
}
