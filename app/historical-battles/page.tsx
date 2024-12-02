'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Battle {
  id: number
  date: string
  winningFaction: string
  score: {
    Red: number
    Blue: number
    Green: number
  }
}

export default function HistoricalBattles() {
  const [battles, setBattles] = useState<Battle[]>([])

  useEffect(() => {
    // In a real application, you would fetch this data from an API
    const mockBattles: Battle[] = [
      {
        id: 1,
        date: '2023-05-01',
        winningFaction: 'Red',
        score: { Red: 30, Blue: 20, Green: 14 }
      },
      {
        id: 2,
        date: '2023-05-02',
        winningFaction: 'Blue',
        score: { Red: 18, Blue: 28, Green: 18 }
      },
      {
        id: 3,
        date: '2023-05-03',
        winningFaction: 'Green',
        score: { Red: 22, Blue: 20, Green: 22 }
      },
    ]
    setBattles(mockBattles)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 pixel-text text-center">Historical Battles</h1>
      <div className="space-y-6">
        {battles.map((battle) => (
          <div key={battle.id} className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold pixel-text mb-2">Battle #{battle.id}</h2>
            <p className="pixel-text">Date: {battle.date}</p>
            <p className="pixel-text">Winning Faction: {battle.winningFaction}</p>
            <div className="mt-4">
              <h3 className="text-xl font-bold pixel-text mb-2">Final Score:</h3>
              <ul className="space-y-1">
                <li className="pixel-text">Red: {battle.score.Red}</li>
                <li className="pixel-text">Blue: {battle.score.Blue}</li>
                <li className="pixel-text">Green: {battle.score.Green}</li>
              </ul>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/" className="pixel-button px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors duration-200">
          Back to Game
        </Link>
      </div>
    </div>
  )
}

