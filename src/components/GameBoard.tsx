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

  const statusColor = isGameOver ? '#ff3d3d' : isPlayerTurn ? '#00e5ff' : '#ff0060'
  const statusText  = isGameOver
    ? game.result.status.replace('_', '/').toUpperCase()
    : isPlayerTurn ? 'PLAYER_TURN' : 'AI_PROC...'

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div style={{
        minHeight: '100vh',
        /* subtle grid bg */
        background: `
          linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px),
          #050508
        `,
        backgroundSize: '40px 40px',
        color: '#c0c0e0',
        fontFamily: "'Share Tech Mono', 'Courier New', monospace",
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '960px',
        margin: '0 auto',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1c1c3a',
          paddingBottom: '12px',
        }}>
          <div className="glitch" style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#00e5ff',
            letterSpacing: '6px',
          }}>
            CYBER/DECK
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#36366a', letterSpacing: '3px' }}>
              TURN.{String(game.turn).padStart(2, '0')}
            </span>

            <div style={{
              padding: '4px 16px',
              fontSize: '11px',
              letterSpacing: '2px',
              color: statusColor,
              border: `1px solid ${statusColor}`,
              boxShadow: `0 0 10px ${statusColor}44`,
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span className="blink" style={{ fontSize: '8px' }}>■</span>
              {statusText}
            </div>
          </div>
        </div>

        {/* ── Champions ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#00e5ff55', marginBottom: '6px' }}>
              ALLY.CHAMPION
            </div>
            <CardComponent card={game.player.champion} />
          </div>

          <div style={{ alignSelf: 'center', textAlign: 'center' }}>
            <div style={{
              fontSize: '20px',
              color: '#ff0060',
              letterSpacing: '4px',
              textShadow: '0 0 12px #ff006099',
              fontWeight: 'bold',
            }}>VS</div>
            <div style={{ fontSize: '9px', color: '#2a2a5a', marginTop: '6px', letterSpacing: '2px' }}>
              {String(game.turn).padStart(2, '0')}/∞
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#ff006055', marginBottom: '6px' }}>
              ENEMY.CHAMPION
            </div>
            <CardComponent card={game.enemy.champion} />
          </div>
        </div>

        {/* ── Enemy field ── */}
        <BoardZone
          id="enemy-board"
          label="ENEMY.FIELD"
          cards={game.enemy.board}
          attackable={!!selectedId && isPlayerTurn}
        />

        {/* ── Battle line ── */}
        <div style={{ position: 'relative', borderTop: '1px dashed #1c1c3a' }}>
          <span style={{
            position: 'absolute', top: '-8px', left: '50%',
            transform: 'translateX(-50%)',
            background: '#050508',
            padding: '0 12px',
            fontSize: '9px',
            color: '#2a2a5a',
            letterSpacing: '4px',
          }}>BATTLE.LINE</span>
        </div>

        {/* ── Player field ── */}
        <BoardZone
          id="player-board"
          label="ALLY.FIELD"
          cards={game.player.board}
          onCardClick={handleBoardClick}
          selectedId={selectedId}
          highlight={isPlayerTurn}
        />

        {/* ── Hand ── */}
        <PlayerHand
          cards={game.player.hand}
          disabled={!isPlayerTurn}
        />

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="cy-btn"
            onClick={handleAttack}
            disabled={!selectedId || !isPlayerTurn}
            style={{
              padding: '10px 22px',
              fontSize: '11px',
              letterSpacing: '2px',
              color: selectedId && isPlayerTurn ? '#ff3d3d' : '#2a2a5a',
              border: `1px solid ${selectedId && isPlayerTurn ? '#ff3d3d' : '#1c1c3a'}`,
              boxShadow: selectedId && isPlayerTurn ? '0 0 10px rgba(255,61,61,0.35)' : 'none',
            }}
          >
            [STRIKE]{selectedId ? ' // EXEC' : ' // IDLE'}
          </button>

          <button
            className="cy-btn"
            onClick={endTurn}
            disabled={!isPlayerTurn}
            style={{
              padding: '10px 22px',
              fontSize: '11px',
              letterSpacing: '2px',
              color: isPlayerTurn ? '#00e5ff' : '#2a2a5a',
              border: `1px solid ${isPlayerTurn ? '#00e5ff' : '#1c1c3a'}`,
              boxShadow: isPlayerTurn ? '0 0 10px rgba(0,229,255,0.35)' : 'none',
            }}
          >
            [END_TURN]
          </button>

          {isGameOver && (
            <button
              className="cy-btn"
              onClick={restart}
              style={{
                padding: '10px 22px',
                fontSize: '11px',
                letterSpacing: '2px',
                color: '#ffe000',
                border: '1px solid #ffe000',
                boxShadow: '0 0 10px rgba(255,224,0,0.3)',
              }}
            >
              [REBOOT_SYS]
            </button>
          )}
        </div>

        {/* ── Combat log ── */}
        <div style={{
          border: '1px solid #1c1c3a',
          borderRadius: '1px',
          padding: '10px 12px',
          maxHeight: '130px',
          overflowY: 'auto',
          background: '#07070e',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 8, height: 8,
            borderTop: '2px solid #36366a', borderLeft: '2px solid #36366a' }} />
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8,
            borderBottom: '2px solid #36366a', borderRight: '2px solid #36366a' }} />

          <div style={{
            fontSize: '9px', letterSpacing: '3px', color: '#36366a',
            marginBottom: '8px', textTransform: 'uppercase',
          }}>
            COMBAT.LOG //
          </div>

          {[...game.log].reverse().map((entry, i) => (
            <div key={i} style={{
              fontSize: '10px',
              color: i === 0 ? '#8080c0' : '#2e2e5a',
              marginBottom: '2px',
              letterSpacing: '0.3px',
            }}>
              <span style={{ color: '#22224a' }}>&gt; </span>
              {entry.message}
            </div>
          ))}

          {game.log.length === 0 && (
            <div style={{ color: '#1e1e3a', fontSize: '10px', letterSpacing: '2px' }}>
              -- AWAITING_DATA --
            </div>
          )}
        </div>

        {/* ── System footer ── */}
        <div style={{
          display: 'flex',
          gap: '20px',
          fontSize: '9px',
          color: '#2a2a5a',
          letterSpacing: '1px',
          borderTop: '1px solid #1c1c3a',
          paddingTop: '8px',
        }}>
          <span>DECK_A:{game.player.activeDeck.length}</span>
          <span>DECK_B:{game.player.passiveDeck.length}</span>
          <span>DISC:{game.player.discard.length}</span>
        </div>

      </div>
    </DndContext>
  )
}