import { useState, useEffect } from 'react';
import { PlacedBear, Faction, GameState } from '../types/game';

interface GameGridProps {
    gameState: GameState;
    userFaction: Faction;
    onSquareClick: (id: number) => void;
    selectedSquareId: number | null;
}

export function GameGrid({ gameState, userFaction, onSquareClick, selectedSquareId }: GameGridProps) {
    const getFactionColor = (faction: Faction): string => {
        switch (faction) {
            case 'IRON':
                return 'border-blue-500';
            case 'GEO':
                return 'border-orange-500';
            case 'TECH':
                return 'border-gray-500';
            case 'PAW':
                return 'border-purple-500';
            default:
                return 'border-gray-300';
        }
    };

    return (
        <div className="grid grid-cols-8 gap-1 p-4 bg-gray-800 rounded-lg shadow-lg">
            {gameState.squares.map((square) => (
                <div
                    key={square.id}
                    onClick={() => onSquareClick(square.id)}
                    className={`
                        w-16 h-16 bg-gray-700 rounded-sm cursor-pointer
                        hover:bg-gray-600 transition-all duration-200
                        border-2 ${square.faction ? getFactionColor(square.faction) : 'border-transparent'}
                        ${selectedSquareId === square.id ? 'ring-2 ring-yellow-400' : ''}
                        relative overflow-hidden
                    `}
                >
                    {square.bear && (
                        <div className="w-full h-full">
                            <img 
                                src={square.bear.metadata.image}
                                alt={square.bear.metadata.name}
                                className="w-full h-full object-cover rounded-sm"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                                {square.bear.metadata.name}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
} 