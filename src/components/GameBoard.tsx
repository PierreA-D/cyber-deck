import { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragMoveEvent, type DragStartEvent } from '@dnd-kit/core'
import { useGameEngine } from '../hooks/useGameEngine'
import { BoardZone } from './BoardZone'
import { PlayerHand } from './PlayerHand'
import { CardComponent } from './CardComponent'
import { GamePhase } from '../engine/GameEngine'
import { CardType } from '../engine/CardEnums'
import { isSpellCard, isAlive } from '../engine/CardInstance'
import { AnimatePresence } from 'motion/react'
import { useAttackAnimation } from '../hooks/useAttackAnimation'
import { DroppableCard } from './DroppableCard'
import { AttackArrow } from './AttackArrow'
import { GameOverScreen } from './GameOverScreen'

export function GameBoard() {
  const savedRef = useRef(false)
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [targetId,      setTargetId]      = useState<string | null>(null)
  const [activeDragId,  setActiveDragId]  = useState<string | null>(null)
  const [arrowRects,    setArrowRects]    = useState<{ from: DOMRect; to: DOMRect; color: string } | null>(null)
  const [dragArrowRects, setDragArrowRects] = useState<{ from: DOMRect; to: DOMRect; color: string } | null>(null)
  const navigate = useNavigate()

  // Capteurs DnD : souris (desktop) + tactile (mobile).
  // Le délai sur le tactile permet de distinguer un drag d'un scroll de zone.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  // 1. useAttackAnimation en premier
  const { registerRef, playAttack } = useAttackAnimation({
    onArrow: (from, to, color) => {
      setArrowRects({ from, to, color })
      setTimeout(() => setArrowRects(null), 500)
    },
  })

  // 2. useGameEngine qui utilise playAttack
  const {
    game, loading, error, playCard, swap, heal, attack, endTurn, restart, saveGame,
    playSpell, pendingSpell, resolvePendingSpellTarget, cancelPendingSpell,
  } = useGameEngine({
    onAIAttack: async (attackerId, targetId) => {
      await playAttack(attackerId, targetId, '#ff0060')
    },
  })

  useEffect(() => {
    if (!game) return
    if (game.phase !== GamePhase.GameOver) return
    if (savedRef.current) return

    savedRef.current = true
    void saveGame(game.result.status, game.turn)
  }, [game, saveGame])

  const handleRestart = () => {
    savedRef.current = false
    restart()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050508] font-mono text-[#00e5ff]">
        <span className="blink text-sm tracking-[0.3em]">LOADING_DECK...</span>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] font-mono text-cyan-400 flex flex-col items-center justify-center gap-6">
        <p className="tracking-[2px] text-red-500 text-sm border border-red-500 p-4">
          {error}
        </p>
        <button
          onClick={() => navigate({ to: '/decks' })}
          className="px-8 py-3 border border-cyan-400 text-cyan-400 text-xs tracking-[2px] hover:bg-cyan-400 hover:text-[#0a0a0f] transition-all"
        >
          MANAGE DECKS
        </button>
      </div>
    )
  }

  const isPlayerTurn = game.phase === GamePhase.PlayerTurn
  const isGameOver   = game.phase === GamePhase.GameOver

  function isAttackDrag(instanceId: string) {
    if (!isPlayerTurn) return false
    const unit = game.player.board.find(card => card.instanceId === instanceId)
    return !!unit && !unit.isExhausted
  }

  function toDomRect(rect: { left: number; top: number; width: number; height: number }) {
    return new DOMRect(rect.left, rect.top, rect.width, rect.height)
  }

  function sameArrowRects(
    prev: { from: DOMRect; to: DOMRect; color: string } | null,
    next: { from: DOMRect; to: DOMRect; color: string },
  ) {
    if (!prev) return false
    return (
      prev.color === next.color &&
      prev.from.left === next.from.left &&
      prev.from.top === next.from.top &&
      prev.from.width === next.from.width &&
      prev.from.height === next.from.height &&
      prev.to.left === next.to.left &&
      prev.to.top === next.to.top &&
      prev.to.width === next.to.width &&
      prev.to.height === next.to.height
    )
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    setDragArrowRects(null)
    if (!game) return

    const { active, over } = event
    if (!over) return

    const overId = over.id as string

    // Drop sur le board joueur — jouer une carte (unité ou sort)
    if (overId === 'player-board') {
      const instanceId = active.id as string
      const card = game.player.hand.find(c => c.instanceId === instanceId)
      if (!card) return

      if (isSpellCard(card)) {
        playSpell(instanceId) // résout auto, ou arme pendingSpell si manual
        return
      }

      playCard(instanceId)
      return
    }

    // Drop sur une carte ennemie — attaquer
    if (overId.startsWith('target-')) {
      const attackerId   = active.id as string
      const attackerCard = game.player.board.find(c => c.instanceId === attackerId)
      if (!attackerCard || attackerCard.isExhausted) return

      const targetInstanceId = overId.replace('target-', '')
      await playAttack(attackerId, targetInstanceId, '#ff3d3d')
      attack(attackerId, targetInstanceId)
      setSelectedId(null)
      return
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const draggedId = event.active.id as string
    setActiveDragId(draggedId)

    if (!isAttackDrag(draggedId)) {
      setDragArrowRects(null)
      return
    }

    const fromRect = event.active.rect.current.initial
    const toRect = event.active.rect.current.translated ?? fromRect
    if (!fromRect || !toRect) return

    const nextArrow = {
      from: toDomRect(fromRect),
      to: toDomRect(toRect),
      color: '#ff3d3d',
    }

    setDragArrowRects(prev => sameArrowRects(prev, nextArrow) ? prev : nextArrow)
  }

  function handleDragMove(event: DragMoveEvent) {
    const draggedId = event.active.id as string
    if (!isAttackDrag(draggedId)) return

    const fromRect = event.active.rect.current.initial
    if (!fromRect) return

    const overId = event.over?.id as string | undefined
    const targetRect = overId?.startsWith('target-')
      ? event.over?.rect
      : event.active.rect.current.translated

    if (!targetRect) return

    const nextArrow = {
      from: toDomRect(fromRect),
      to: toDomRect(targetRect),
      color: '#ff3d3d',
    }

    setDragArrowRects(prev => sameArrowRects(prev, nextArrow) ? prev : nextArrow)
  }

  function handleDragCancel() {
    setActiveDragId(null)
    setDragArrowRects(null)
  }

  async function executeAttackOnTarget(targetInstanceId: string) {
    if (!selectedId) return
    if (selectedCard?.data.type !== CardType.Warrior) return

    setTargetId(targetInstanceId)
    await playAttack(selectedId, targetInstanceId, '#ff3d3d')
    attack(selectedId, targetInstanceId)
    setSelectedId(null)
    setTargetId(null)
  }

  function handleEnemyLegendClick(instanceId: string) {
    if (!isPlayerTurn || !selectedId) return
    if (selectedCard?.data.type !== CardType.Warrior) return
    void executeAttackOnTarget(instanceId)
  }

  // Soigne une cible alliée (unité ou champion) avec le Healer sélectionné.
  function healSelectedTarget(targetInstanceId: string): boolean {
    if (!selectedId || selectedCard?.data.type !== CardType.Healer) return false
    if (targetInstanceId === selectedId) return false

    const allies = [...game.player.board, game.player.legend]
    const target = allies.find(c => c.instanceId === targetInstanceId)
    if (!target || !isAlive(target)) return false
    if (target.data.maxHp === undefined || target.currentHp >= target.data.maxHp) return false

    heal(selectedId, targetInstanceId)
    setSelectedId(null)
    setTargetId(null)
    return true
  }

  function handleAllyLegendClick() {
    if (!isPlayerTurn) return
    healSelectedTarget(game.player.legend.instanceId)
  }

  function handleBoardClick(instanceId: string) {
    if (!isPlayerTurn) return

    // Un sort attend une cible — priorité sur la logique d'attaque
    if (pendingSpell) {
      resolvePendingSpellTarget(instanceId)
      return
    }

    // Un Healer est sélectionné — on tente de soigner l'allié cliqué
    if (selectedCard?.data.type === CardType.Healer && healSelectedTarget(instanceId)) {
      return
    }

    const card = game.player.board.find(c => c.instanceId === instanceId)
    if (!card || card.isExhausted) return
    // Seuls les Warriors (attaque) et Healers (soin) peuvent être sélectionnés.
    if (card.data.type !== CardType.Warrior && card.data.type !== CardType.Healer) return
    setSelectedId(prev => prev === instanceId ? null : instanceId)
    setTargetId(null)
  }

  function handleEnemyCardClick(instanceId: string) {
    if (!isPlayerTurn) return

    if (pendingSpell) {
      resolvePendingSpellTarget(instanceId)
      return
    }

    if (!selectedId) return
    void executeAttackOnTarget(instanceId)
  }

  const statusColor = isGameOver ? '#ff3d3d' : isPlayerTurn ? '#00e5ff' : '#ff0060'
  const statusText  = isGameOver
    ? game.result.status.replace('_', '/').toUpperCase()
    : isPlayerTurn ? 'PLAYER_TURN' : 'AI_PROC...'

  const selectedCard = game.player.board.find(c => c.instanceId === selectedId)
  const isWarriorSelected = selectedCard?.data.type === CardType.Warrior
  const isHealerSelected  = selectedCard?.data.type === CardType.Healer
  const strikeReady  = !!selectedId && isPlayerTurn && isWarriorSelected && !selectedCard?.isExhausted
  const swapReady    = isPlayerTurn && !game.player.hasSwappedThisTurn

  const activeDraggedCard = activeDragId
    ? game.player.hand.find(c => c.instanceId === activeDragId)
    : undefined

  return (
    <div className="mx-auto grid h-screen w-full max-w-[1820px] grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-3 overflow-hidden px-3 py-3 sm:px-4 sm:py-4 xl:grid-cols-[240px_minmax(0,1fr)_240px] xl:grid-rows-1 xl:gap-4">

      {/* Combat log */}
      <aside className="anim-boot hidden min-h-0 flex-col rounded-sm border border-[#1c1c3a] bg-[#07070e] p-3 xl:flex">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-[#1c1c3a] px-3 py-2.5">
          <div className="absolute left-[-1px] top-[-1px] h-2 w-2 border-l-2 border-t-2 border-[#36366a]" />
          <div className="absolute bottom-[-1px] right-[-1px] h-2 w-2 border-b-2 border-r-2 border-[#36366a]" />

          <div className="mb-2 text-[9px] uppercase tracking-[0.3em] text-[#36366a]">COMBAT.LOG //</div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {[...game.log].reverse().map((entry, i) => (
              <div
                key={i}
                className={`anim-log-reveal mb-0.5 text-[10px] tracking-[0.3px] ${i === 0 ? 'text-[#8080c0]' : 'text-[#2e2e5a]'}`}
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <span className="text-[#22224a]">&gt; </span>
                {entry.message}
              </div>
            ))}
            {game.log.length === 0 && (
              <div className="text-[10px] tracking-[0.2em] text-[#1e1e3a]">-- AWAITING_DATA --</div>
            )}
          </div>
        </div>
      </aside>

      {/* Main board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        <div className="anim-boot min-h-0 w-full rounded-sm border border-[#1c1c3a] bg-[#050508] bg-[linear-gradient(rgba(0,229,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.025)_1px,transparent_1px)] bg-[size:40px_40px] p-3 transition-colors duration-300 sm:p-4 lg:px-5">
          <div className="flex h-full min-h-0 flex-col gap-1.5 overflow-hidden xl:gap-1">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1c1c3a] pb-2 sm:pb-3">
              <div className="glitch text-[15px] font-bold tracking-[0.2em] text-[#00e5ff] sm:text-[22px] sm:tracking-[0.38em]">
                CYBER_DECK
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] tracking-[0.3em] text-[#36366a]">
                  TURN.{String(game.turn).padStart(2, '0')}
                </span>
                <div
                  className={`flex items-center gap-1.5 px-4 py-1 text-[11px] tracking-[0.2em] [clip-path:polygon(8px_0%,100%_0%,calc(100%-8px)_100%,0%_100%)] ${isPlayerTurn ? 'anim-neon-pulse' : ''}`}
                  style={{
                    color: statusColor,
                    border: `1px solid ${statusColor}`,
                    boxShadow: `0 0 10px ${statusColor}44`,
                  }}
                >
                  <span className="blink text-[8px]">■</span>
                  {statusText}
                </div>
              </div>
            </div>

            {/* Pending Spell */}
            {pendingSpell && (
              <div className="flex items-center justify-between border border-[#b000ff] bg-[rgba(176,0,255,0.06)] px-3 py-2 text-[11px] tracking-[0.2em] text-[#b000ff]">
                <span>⚡ {pendingSpell.data.name.toUpperCase()} — SELECT_TARGET</span>
                <button
                  onClick={cancelPendingSpell}
                  className="text-[10px] text-[#b000ff] underline hover:text-white"
                >
                  CANCEL
                </button>
              </div>
            )}

            {/* Enemy Legend */}
            <div className="anim-boot flex justify-end gap-3 [animation-delay:80ms]">
              <div className="text-right">
                <div className="mb-1.5 text-[9px] tracking-[0.3em] text-[#ff006055]">ENEMY.LEGEND</div>
                <div className="origin-top-right scale-[0.9] xl:scale-[0.86]">
                  <DroppableCard
                    card={game.enemy.legend}
                    onRegisterRef={registerRef}
                    animateAs="legend"
                    isTarget={targetId === game.enemy.legend.instanceId}
                    onClick={handleEnemyLegendClick}
                  />
                </div>
              </div>
            </div>

            {/* Enemy field */}
            <div className="anim-boot flex min-h-0 flex-1 flex-col [animation-delay:120ms] xl:flex-none">
              <BoardZone
                id="enemy-board"
                label="ENEMY.FIELD"
                cards={game.enemy.board}
                onCardClick={handleEnemyCardClick}
                onRegisterRef={registerRef}
                selectedId={targetId}
                attackable={strikeReady}
                droppableTargets={isPlayerTurn}
              />
            </div>

            {/* Battle line */}
            <div className="relative border-t border-dashed border-[#1c1c3a]">
              <span className="absolute left-1/2 top-[-8px] -translate-x-1/2 bg-[#050508] px-3 text-[9px] tracking-[0.35em] text-[#2a2a5a]">
                BATTLE.LINE
              </span>
            </div>

            {/* Player field */}
            <div className="anim-boot flex min-h-0 flex-1 flex-col [animation-delay:170ms] xl:flex-none">
              <BoardZone
                id="player-board"
                label="ALLY.FIELD"
                cards={game.player.board}
                onCardClick={handleBoardClick}
                onRegisterRef={registerRef}
                selectedId={selectedId}
                highlight={isPlayerTurn}
                draggableUnits={isPlayerTurn}
              />
            </div>

            {/* Hand */}
            <div className="anim-boot flex min-h-0 flex-1 flex-col gap-1.5 [animation-delay:220ms] xl:flex-none xl:gap-1">
              <PlayerHand cards={game.player.hand} disabled={!isPlayerTurn} />
            </div>

          </div>
        </div>

        <DragOverlay zIndex={12000}>
          {activeDraggedCard ? <CardComponent card={activeDraggedCard} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Right sidebar — desktop */}
      <aside className="anim-boot hidden min-h-0 flex-col rounded-sm border border-[#1c1c3a] bg-[#07070e] p-3 [animation-delay:320ms] xl:flex">
        <div className="mb-3">
          <div className="mb-1.5 text-[9px] tracking-[0.3em] text-[#00e5ff55]">ALLY.LEGEND</div>
          <AnimatePresence>
            <CardComponent card={game.player.legend} animateAs="legend" onRegisterRef={registerRef} selected={isHealerSelected} onClick={handleAllyLegendClick} />
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-[#1c1c3a] pt-3">
          <button
            onClick={swap}
            disabled={!swapReady}
            className="cursor-pointer bg-transparent px-4 py-2 text-[11px] uppercase tracking-[0.2em] [clip-path:polygon(6px_0%,100%_0%,calc(100%-6px)_100%,0%_100%)] transition-[filter,transform,box-shadow,color,border-color] duration-200 ease-out hover:-translate-y-px hover:brightness-150 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#b000ff]/70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100"
            style={{
              color:     swapReady ? '#b000ff' : '#2a2a5a',
              border:    `1px solid ${swapReady ? '#b000ff' : '#1c1c3a'}`,
              boxShadow: swapReady ? '0 0 10px rgba(176,0,255,0.35)' : 'none',
            }}
          >
            [SWAP_DECK]
          </button>

          <button
            onClick={endTurn}
            disabled={!isPlayerTurn}
            className="cursor-pointer bg-transparent px-4 py-2 text-[11px] uppercase tracking-[0.2em] [clip-path:polygon(6px_0%,100%_0%,calc(100%-6px)_100%,0%_100%)] transition-[filter,transform,box-shadow,color,border-color] duration-200 ease-out hover:-translate-y-px hover:brightness-150 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e5ff]/70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100"
            style={{
              color:     isPlayerTurn ? '#00e5ff' : '#2a2a5a',
              border:    `1px solid ${isPlayerTurn ? '#00e5ff' : '#1c1c3a'}`,
              boxShadow: isPlayerTurn ? '0 0 10px rgba(0,229,255,0.35)' : 'none',
            }}
          >
            [END_TURN]
          </button>

        </div>

        <div className="mt-auto flex flex-col gap-1 border-t border-[#1c1c3a] pt-3 text-[10px] tracking-[1px] text-[#2a2a5a]">
          <span>DECK_A:{game.player.activeDeck.length}</span>
          <span>DECK_B:{game.player.passiveDeck.length}</span>
          <span>DISC:{game.player.discard.length}</span>
        </div>
      </aside>

      {/* Bottom bar — mobile */}
      <div className="anim-boot flex items-stretch gap-3 rounded-sm border border-[#1c1c3a] bg-[#07070e] p-2.5 xl:hidden">
        <div className="flex shrink-0 flex-col gap-1">
          <div className="text-[8px] tracking-[0.3em] text-[#00e5ff55]">ALLY.LEGEND</div>
          <AnimatePresence>
            <CardComponent card={game.player.legend} animateAs="legend" onRegisterRef={registerRef} selected={isHealerSelected} onClick={handleAllyLegendClick} />
          </AnimatePresence>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <button
            onClick={swap}
            disabled={!swapReady}
            className="w-full cursor-pointer bg-transparent px-3 py-2.5 text-[11px] uppercase tracking-[0.2em] [clip-path:polygon(6px_0%,100%_0%,calc(100%-6px)_100%,0%_100%)] transition-[filter,transform,box-shadow,color,border-color] duration-200 ease-out hover:-translate-y-px hover:brightness-150 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#b000ff]/70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100"
            style={{
              color:     swapReady ? '#b000ff' : '#2a2a5a',
              border:    `1px solid ${swapReady ? '#b000ff' : '#1c1c3a'}`,
              boxShadow: swapReady ? '0 0 10px rgba(176,0,255,0.35)' : 'none',
            }}
          >
            [SWAP_DECK]
          </button>

          <button
            onClick={endTurn}
            disabled={!isPlayerTurn}
            className="w-full cursor-pointer bg-transparent px-3 py-2.5 text-[11px] uppercase tracking-[0.2em] [clip-path:polygon(6px_0%,100%_0%,calc(100%-6px)_100%,0%_100%)] transition-[filter,transform,box-shadow,color,border-color] duration-200 ease-out hover:-translate-y-px hover:brightness-150 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e5ff]/70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100"
            style={{
              color:     isPlayerTurn ? '#00e5ff' : '#2a2a5a',
              border:    `1px solid ${isPlayerTurn ? '#00e5ff' : '#1c1c3a'}`,
              boxShadow: isPlayerTurn ? '0 0 10px rgba(0,229,255,0.35)' : 'none',
            }}
          >
            [END_TURN]
          </button>
        </div>
      </div>

      {/* Flèche d'attaque */}
      {dragArrowRects && (
        <AttackArrow
          fromRect={dragArrowRects.from}
          toRect={dragArrowRects.to}
          color={dragArrowRects.color}
          persistent
        />
      )}

      {arrowRects && (
        <AttackArrow
          fromRect={arrowRects.from}
          toRect={arrowRects.to}
          color={arrowRects.color}
        />
      )}

      {isGameOver && (
        <GameOverScreen result={game.result} turn={game.turn} onReplay={handleRestart} />
      )}

    </div>
  )
}