import { useState } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { useGameEngine } from '../hooks/useGameEngine'
import { BoardZone } from './BoardZone'
import { PlayerHand } from './PlayerHand'
import { CardComponent } from './CardComponent'
import { GamePhase } from '../engine/GameEngine'
import { isSwapCard } from '../engine/CardInstance'

export function GameBoard() {
  const { game, playCard, swap, attack, endTurn, restart } = useGameEngine()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const isPlayerTurn = game.phase === GamePhase.PlayerTurn
  const isGameOver   = game.phase === GamePhase.GameOver

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || over.id !== 'player-board') return

    const instanceId = active.id as string
    const card = game.player.hand.find(c => c.instanceId === instanceId)
    if (!card) return

    if (isSwapCard(card)) {
      swap()
    } else {
      playCard(instanceId)
    }
  }

  function handleBoardClick(instanceId: string) {
    if (!isPlayerTurn) return
    setSelectedId(prev => prev === instanceId ? null : instanceId)
  }

  function handleAttack() {
    if (!selectedId) return
    attack(selectedId)
    setSelectedId(null)
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div style={{
        minHeight: '100vh',
        background: '#0f0f1a',
        color: '#fff',
        fontFamily: 'monospace',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxWidth: '900px',
        margin: '0 auto',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>🃏 Card Game</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ color: '#888', fontSize: '13px' }}>Turn {game.turn}</div>
            <div style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              background: isGameOver ? '#c0392b' : isPlayerTurn ? '#2ecc71' : '#e67e22',
              color: '#fff',
            }}>
              {isGameOver
                ? game.result.status.replace('_', ' ').toUpperCase()
                : isPlayerTurn ? 'YOUR TURN' : 'ENEMY TURN'}
            </div>
          </div>
        </div>

        {/* Champions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>YOUR CHAMPION</div>
            <CardComponent card={game.player.champion} />
          </div>
          <div style={{ color: '#888', fontSize: '12px', alignSelf: 'center' }}>VS</div>
          <div>
            <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>ENEMY CHAMPION</div>
            <CardComponent card={game.enemy.champion} />
          </div>
        </div>

        {/* Enemy board */}
        <BoardZone
          id="enemy-board"
          label="Enemy Board"
          cards={game.enemy.board}
          attackable={!!selectedId && isPlayerTurn}
        />

        {/* Player board */}
        <BoardZone
          id="player-board"
          label="Your Board — drop cards here to play them"
          cards={game.player.board}
          onCardClick={handleBoardClick}
          selectedId={selectedId}
          highlight={isPlayerTurn}
        />

        {/* Player hand */}
        <PlayerHand
          cards={game.player.hand}
          disabled={!isPlayerTurn}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleAttack}
            disabled={!selectedId || !isPlayerTurn}
            style={{
              padding: '10px 20px',
              background: selectedId && isPlayerTurn ? '#e74c3c' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: selectedId && isPlayerTurn ? 'pointer' : 'not-allowed',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}
          >
            ⚔️ {selectedId ? 'Attack with selected' : 'Select a card to attack'}
          </button>

          <button
            onClick={endTurn}
            disabled={!isPlayerTurn}
            style={{
              padding: '10px 20px',
              background: isPlayerTurn ? '#2ecc71' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: isPlayerTurn ? 'pointer' : 'not-allowed',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}
          >
            ✅ End Turn
          </button>

          {isGameOver && (
            <button
              onClick={restart}
              style={{
                padding: '10px 20px',
                background: '#9b59b6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '14px',
              }}
            >
              🔄 Restart
            </button>
          )}
        </div>

        {/* Combat log */}
        <div style={{
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '12px',
          maxHeight: '150px',
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.3)',
        }}>
          <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>COMBAT LOG</div>
          {[...game.log].reverse().map((entry, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#aaa', marginBottom: '2px' }}>
              {entry.message}
            </div>
          ))}
          {game.log.length === 0 && (
            <div style={{ color: '#444', fontSize: '12px' }}>No events yet.</div>
          )}
        </div>

        {/* Deck info */}
        <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#666' }}>
          <span>Active deck: {game.player.activeDeck.length} cards</span>
          <span>Passive deck: {game.player.passiveDeck.length} cards</span>
          <span>Discard: {game.player.discard.length} cards</span>
        </div>

      </div>
    </DndContext>
  )
}