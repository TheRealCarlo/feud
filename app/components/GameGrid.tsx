import { useState, useEffect } from 'react';
import { PlacedBear, Faction, GameState, FACTION_COLORS } from '../types/game';

interface GameGridProps {
    gameState: GameState;
    selectedBear: string | null;
    userFaction: Faction;
    onPlaceBear: (position: { x: number; y: number }) => Promise<void>;
    userAddress: string;
}

export function GameGrid({ gameState, selectedBear, userFaction, onPlaceBear, userAddress }: GameGridProps) {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            const remaining = gameState.endTime - now;
            
            if (remaining <= 0) {
                setTimeLeft('Game Ended');
                clearInterval(timer);
            } else {
                const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
                const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`${days}d ${hours}h ${minutes}m`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState.endTime]);

    const getFactionColor = (faction: Faction) => {
        return `border-${FACTION_COLORS[faction]}-500`;
    };

    const handleCellClick = async (x: number, y: number) => {
        if (!selectedBear || !gameState.isActive) return;
        
        const cell = gameState.grid[y][x];
        if (cell) {
            // Can only challenge rival faction
            if (cell.faction === userFaction) return;
            // Can only challenge with your own bear
            if (!selectedBear) return;
        }
        
        await onPlaceBear({ x, y });
    };

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="flex justify-between w-full max-w-2xl px-4">
                <div className="text-lg font-bold">Time Left: {timeLeft}</div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                        <span>IronBearz: {gameState.factionScores.IRON}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                        <span>Geoscapez: {gameState.factionScores.GEO}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                        <span>Techheadz: {gameState.factionScores.TECH}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                        <span>Pawpunkz: {gameState.factionScores.PAW}</span>
                    </div>
                </div>
            </div>

            <div className="grid gap-1" 
                style={{ 
                    gridTemplateColumns: `repeat(${gameState.gridSize}, minmax(0, 1fr))` 
                }}>
                {gameState.grid.map((row, y) => 
                    row.map((cell, x) => (
                        <div
                            key={`${x}-${y}`}
                            onClick={() => handleCellClick(x, y)}
                            className={`
                                w-16 h-16 border-2 rounded-lg cursor-pointer
                                transition-all duration-300 hover:scale-105
                                ${cell ? getFactionColor(cell.faction) : 'border-gray-300'}
                                ${selectedBear && !cell ? 'hover:border-yellow-400' : ''}
                            `}
                        >
                            {cell && (
                                <div className="relative w-full h-full">
                                    <img 
                                        src={cell.image}
                                        alt={cell.name}
                                        className="w-full h-full object-cover rounded-md"
                                    />
                                    {cell.owner === userAddress && (
                                        <div className="absolute top-0 right-0 bg-yellow-400 rounded-full w-3 h-3"/>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {!gameState.isActive && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <h3 className="text-xl font-bold">Game Ended!</h3>
                    <p>Winner: {Object.entries(gameState.factionScores).sort(([,a], [,b]) => b - a)[0][0]} Faction</p>
                    {/* Add claim button here if user is winner */}
                </div>
            )}
        </div>
    );
} 