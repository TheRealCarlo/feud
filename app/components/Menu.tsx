import { useState } from 'react';
import { GameGrid } from './GameGrid';
import { BearSelector } from './BearSelector';
import { Faction, GameState } from '../types/game';

interface MenuProps {
    gameState: GameState;
    userFaction: Faction;
    userAddress: string;
}

export function Menu({ gameState, userFaction, userAddress }: MenuProps) {
    const [selectedSquareId, setSelectedSquareId] = useState<number | null>(null);
    const [showBearSelector, setShowBearSelector] = useState(false);

    const handleSquareClick = (squareId: number) => {
        const square = gameState.squares[squareId];
        
        // If square belongs to user's faction, do nothing
        if (square.faction === userFaction) return;
        
        // If square is occupied by another faction, initiate battle
        if (square.faction && square.faction !== userFaction) {
            console.log('Battle initiated!');
            setSelectedSquareId(squareId);
            setShowBearSelector(true);
            return;
        }
        
        // If square is empty, allow placement
        setSelectedSquareId(squareId);
        setShowBearSelector(true);
    };

    const handleBearSelect = (bear: any) => {
        if (selectedSquareId === null) return;
        
        // Handle bear placement or battle logic here
        console.log('Bear selected:', bear, 'for square:', selectedSquareId);
        
        setShowBearSelector(false);
        setSelectedSquareId(null);
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Game Stats */}
            <div className="flex gap-4 justify-center text-sm">
                <div className="px-4 py-2 bg-gray-800 rounded-lg">
                    <span className="text-gray-400">Your Bears:</span>
                    <span className="ml-2 text-white">
                        {gameState.squares.filter(s => s.faction === userFaction).length}
                    </span>
                </div>
                <div className="px-4 py-2 bg-gray-800 rounded-lg">
                    <span className="text-gray-400">Territory:</span>
                    <span className="ml-2 text-white">
                        {Math.round((gameState.squares.filter(s => s.faction === userFaction).length / 64) * 100)}%
                    </span>
                </div>
            </div>

            {/* Game Grid */}
            <GameGrid
                gameState={gameState}
                userFaction={userFaction}
                onSquareClick={handleSquareClick}
                selectedSquareId={selectedSquareId}
            />

            {/* Bear Selector Modal */}
            {showBearSelector && selectedSquareId !== null && (
                <BearSelector
                    nfts={[]} // Pass your NFTs here
                    onSelect={handleBearSelect}
                    onClose={() => {
                        setShowBearSelector(false);
                        setSelectedSquareId(null);
                    }}
                    gameState={gameState}
                    isBattle={!!gameState.squares[selectedSquareId]?.faction}
                    walletAddress={userAddress}
                />
            )}
        </div>
    );
} 