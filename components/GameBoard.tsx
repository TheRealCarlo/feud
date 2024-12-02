import { useState } from 'react'

interface Square {
  id: number
  occupiedBy: string | null
  factionColor: string | null
}

interface GameBoardProps {
  playerFaction: string
  onGameStart: () => void
}

const GameBoard: React.FC<GameBoardProps> = ({ playerFaction, onGameStart }) => {
  const [squares, setSquares] = useState<Square[]>(
    Array(64).fill(null).map((_, index) => ({
      id: index,
      occupiedBy: null,
      factionColor: null
    }))
  )

  const handleSquareClick = (id: number) => {
    setSquares(prevSquares => {
      const newSquares = [...prevSquares]
      const clickedSquare = newSquares[id]

      if (!clickedSquare.occupiedBy) {
        clickedSquare.occupiedBy = 'player'
        clickedSquare.factionColor = getFactionColor(playerFaction)
        onGameStart() // Trigger game start on first placement
      } else if (clickedSquare.factionColor !== getFactionColor(playerFaction)) {
        // Simulate battle
        if (Math.random() > 0.5) {
          clickedSquare.occupiedBy = 'player'
          clickedSquare.factionColor = getFactionColor(playerFaction)
        }
      }

      return newSquares
    })
  }

  const getFactionColor = (faction: string): string => {
    switch (faction) {
      case 'Red': return 'border-red-500'
      case 'Blue': return 'border-blue-500'
      case 'Green': return 'border-green-500'
      default: return 'border-gray-500'
    }
  }

  return (
    <div className="grid grid-cols-8 gap-1 p-4 bg-gray-800 rounded-lg shadow-lg">
      {squares.map((square) => (
        <div
          key={square.id}
          className={`w-12 h-12 bg-gray-700 rounded-sm cursor-pointer hover:bg-gray-600 transition-colors duration-200 ${
            square.occupiedBy ? `border-2 ${square.factionColor}` : ''
          }`}
          onClick={() => handleSquareClick(square.id)}
        >
          {square.occupiedBy && (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl">🐻</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default GameBoard

