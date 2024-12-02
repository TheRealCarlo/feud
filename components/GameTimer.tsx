import { useState, useEffect } from 'react'

interface GameTimerProps {
  startTime: number
}

const GameTimer: React.FC<GameTimerProps> = ({ startTime }) => {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const endTime = startTime + 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      const diff = endTime - now

      if (diff <= 0) {
        clearInterval(timer)
        setTimeLeft('Game Over!')
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [startTime])

  return (
    <div className="mb-4 text-center">
      <h2 className="text-2xl font-bold pixel-text">Time Remaining</h2>
      <p className="text-3xl pixel-text">{timeLeft}</p>
    </div>
  )
}

export default GameTimer

