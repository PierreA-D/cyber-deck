# Cyber Deck

Prototype de jeu de cartes tactique en tour par tour, construit avec React + TypeScript + Vite.

Le joueur et l'IA s'affrontent avec une légende, un board, une main, et deux decks (actif/passif) pouvant etre echanges via une carte Swap.

## Stack

- React 19
- TypeScript
- Vite
- dnd-kit (drag & drop des cartes)
- ESLint
- Docker / Docker Compose

## Lancer le projet

### En local

Prerequis:
- Node.js 20+
- npm

Commandes:

```bash
npm install
npm run dev
```

Application disponible sur http://localhost:5173

### Avec Docker Compose

```bash
docker compose up --build
```

Application disponible sur http://localhost:5173

## Scripts npm

- `npm run dev` : lance le serveur de dev Vite
- `npm run build` : verifie TypeScript puis build la version production
- `npm run preview` : sert le build localement
- `npm run lint` : lance ESLint

## Regles du jeu (etat actuel)

### Setup

- Chaque joueur possede:
  - 1 Legend (5 HP)
  - 1 deck actif
  - 1 deck passif
  - 1 main initiale de 4 cartes
- La main initiale contient toujours 1 carte Swap + 3 cartes piochees du deck actif.

### Tour du joueur

- Glisser-deposer une carte de la main vers le board pour la jouer.
- Si la carte posee est Swap:
  - les decks actif et passif sont echanges
  - Swap est defaussee
  - une seule utilisation par tour
- Selectionner une unite de son board puis cliquer sur Attack pour attaquer.
- Finir le tour avec End Turn.

### Ciblage des attaques

Priorite des cibles:
1. Defender adverse sur le board
2. Warrior adverse sur le board
3. Premiere unite adverse restante
4. Legende adverse si le board est vide

### Effets importants

- Une unite qui attaque devient exhausted (ne peut plus agir ce tour).
- Les Healer peuvent soigner (utilise par l'IA actuellement).
- En fin de tour, les unites du board ne sont plus exhausted, puis une carte est piochee.

### Conditions de victoire

Un joueur est considere vaincu si:
- sa légende tombe a 0 HP
- ou son deck actif est vide ET sa main est vide

Resultats possibles:
- `player_wins`
- `enemy_wins`
- `draw`

## IA (etat actuel)

Le tour IA execute:
1. Jeu des cartes de la main par priorite: Defender > Warrior > Healer
2. Soin des unites les plus blessees (ou de la légende)
3. Attaque avec les unites disponibles (hors Healer)

## Structure du projet

```text
src/
  components/
    GameBoard.tsx      # UI principale
    BoardZone.tsx      # zones de board droppables
    PlayerHand.tsx     # main du joueur
    CardComponent.tsx  # rendu et drag des cartes
  hooks/
    useGameEngine.ts   # orchestration UI <-> moteur
  engine/
    GameEngine.ts      # phases, combat, logs, win conditions
    PlayerState.ts     # etat joueur, pioche, swap, fin de tour
    AIPlayer.ts        # logique du tour IA
    CardDatabase.ts    # catalogue cartes + generation decks
    CardData.ts        # modele des cartes
    CardInstance.ts    # instances, stats, degats, etat
    CardEnums.ts       # enums types/couleurs
```

## Limites connues

- UI principalement stylisee inline (pas de design system).
- Le soin joueur n'est pas expose dans les actions UI (aujourd'hui surtout pilote par l'IA).
- Pas encore de suite de tests metier automatisee sur le moteur.

## Pistes d'amelioration

- Ajouter des tests unitaires sur le moteur (`GameEngine`, `PlayerState`, `AIPlayer`).
- Ajouter de nouveaux types de cartes (buff, taunt avance, effets de zone).
- Ajouter un mode multijoueur local/online.
- Externaliser les styles vers une approche plus modulaire.
