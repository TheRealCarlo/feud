import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';
import { BearSelector } from './BearSelector';
import { Faction, GameState, Battle } from '../types/game';
import { gameService } from '../services/gameService';
import { battleService } from '../services/battleService';
import { supabase } from '../lib/supabase';

interface GameBoardProps {
    userFaction: Faction;
    nfts: any[];
    onGameStart: () => void;
}

interface Cooldown {
    tokenId: string;
    end_time: number;
}

// Define the Square type based on your data structure
interface Square {
    id: string;
    faction: Faction | null;
    bear: any; // Replace 'any' with the actual type if available
    // Add other properties as needed
}

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

const GameBoard: React.FC<GameBoardProps> = React.memo(({ userFaction, nfts, onGameStart }) => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedSquareId, setSelectedSquareId] = useState<number | null>(null);
    const [showBearSelector, setShowBearSelector] = useState(false);
    const [isBattling, setIsBattling] = useState(false);
    const [cooldowns, setCooldowns] = useState<Cooldown[]>([]);
    const [territoryStats, setTerritoryStats] = useState<{
        userPercentage: number;
        leadingFaction: Faction | null;
        factionPercentages: Record<Faction, number>;
    }>({
        userPercentage: 0,
        leadingFaction: null,
        factionPercentages: {
            IRON: 0,
            GEO: 0,
            PAW: 0,
            TECH: 0
        }
    });

    const refreshGameState = useCallback(async () => {
        console.log('Refreshing game state...');
        try {
            const { data: currentGame, error: gameError } = await supabase
                .from('games')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (gameError) {
                console.error('Error refreshing game state:', {
                    message: gameError.message,
                    details: gameError.details,
                    hint: gameError.hint,
                    code: gameError.code
                });
                return;
            }

            console.log('Current game data:', currentGame);

            if (currentGame && 'squares' in currentGame) {
                const cooldowns = currentGame.cooldowns || [];
                setCooldowns(cooldowns);

                const updatedSquares = currentGame.squares.map((square: Square) => {
                    if (!square.bear) return square;

                    const isInCooldown = cooldowns?.some(
                        (cooldown: Cooldown) => 
                            cooldown.tokenId === String(square.bear?.tokenId) &&
                            cooldown.end_time > Date.now()
                    );

                    if (isInCooldown) {
                        return {
                            ...square,
                            bear: null,
                            faction: null
                        };
                    }

                    return square;
                });

                const updatedGame = {
                    ...currentGame,
                    squares: updatedSquares
                };

                console.log('Updated game state:', updatedGame);
                setGameState(updatedGame as GameState);
            } else {
                console.log('No active game found or invalid game data structure');
            }
        } catch (err) {
            console.error('Error during refresh:', {
                error: err,
                message: err instanceof Error ? err.message : 'Unknown error',
                stack: err instanceof Error ? err.stack : undefined
            });
        }
    }, []);

    useEffect(() => {
        refreshGameState();

        // Set up periodic refresh every 5 minutes
        const intervalId = setInterval(refreshGameState, 5 * 60 * 1000);

        // Clean up interval on component unmount
        return () => clearInterval(intervalId);
    }, [refreshGameState]);

    const calculateTerritoryStats = useCallback((squares: Square[]) => {
        const totalSquares = squares.length;
        const factionCounts: Record<Faction, number> = {
            IRON: 0,
            GEO: 0,
            PAW: 0,
            TECH: 0
        };

        // Count squares for each faction
        squares.forEach(square => {
            if (square.faction) {
                factionCounts[square.faction]++;
            }
        });

        // Calculate percentages
        const factionPercentages: Record<Faction, number> = {
            IRON: (factionCounts.IRON / totalSquares) * 100,
            GEO: (factionCounts.GEO / totalSquares) * 100,
            PAW: (factionCounts.PAW / totalSquares) * 100,
            TECH: (factionCounts.TECH / totalSquares) * 100
        };

        // Find leading faction
        let leadingFaction: Faction | null = null;
        let maxCount = 0;
        Object.entries(factionCounts).forEach(([faction, count]) => {
            if (count > maxCount) {
                maxCount = count;
                leadingFaction = faction as Faction;
            }
        });

        // Calculate user's percentage
        const userPercentage = factionPercentages[userFaction];

        setTerritoryStats({
            userPercentage,
            leadingFaction,
            factionPercentages
        });
    }, [userFaction]);

    useEffect(() => {
        if (gameState?.squares) {
            calculateTerritoryStats(gameState.squares as Square[]);
        }
    }, [gameState?.squares, calculateTerritoryStats]);

    const handleSquareClick = (index: number) => {
        if (isBattling) return;
        setSelectedSquareId(index);
        setShowBearSelector(true);
    };

    return (
        <div className="game-board max-w-4xl mx-auto">
            {/* Game Board Container */}
            <div className="bg-gray-800/90 rounded-2xl shadow-2xl p-6 backdrop-blur-sm">
                {/* Territory Stats */}
                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Capture Town Square</h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* User Territory */}
                        <div className="bg-gray-700/50 rounded-lg p-3">
                            <h3 className="text-sm text-gray-300 mb-1">Your Territory</h3>
                            <p className="text-2xl font-bold text-white">
                                {territoryStats.userPercentage.toFixed(1)}%
                            </p>
                        </div>
                        
                        {/* Leading Faction */}
                        <div className="bg-gray-700/50 rounded-lg p-3">
                            <h3 className="text-sm text-gray-300 mb-1">Leading Faction</h3>
                            {territoryStats.leadingFaction ? (
                                <div className={`
                                    text-2xl font-bold
                                    ${territoryStats.leadingFaction === 'IRON' ? 'text-blue-400' :
                                      territoryStats.leadingFaction === 'GEO' ? 'text-orange-400' :
                                      territoryStats.leadingFaction === 'TECH' ? 'text-gray-400' :
                                      'text-purple-400'}
                                `}>
                                    {territoryStats.leadingFaction}
                                    <span className="text-white text-lg ml-2">
                                        ({territoryStats.factionPercentages[territoryStats.leadingFaction].toFixed(1)}%)
                                    </span>
                                </div>
                            ) : (
                                <p className="text-gray-400">No leader yet</p>
                            )}
                        </div>
                    </div>
                    
                    {/* Faction Progress Bars */}
                    <div className="grid grid-cols-1 gap-2 mt-4">
                        {Object.entries(territoryStats.factionPercentages).map(([faction, percentage]) => (
                            <div key={faction} className="flex items-center gap-2">
                                <div className="w-20 text-left text-sm">{faction}</div>
                                <div className="flex-1 bg-gray-700 rounded-full h-2">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ease-out
                                            ${faction === 'IRON' ? 'bg-blue-500' :
                                              faction === 'GEO' ? 'bg-orange-500' :
                                              faction === 'TECH' ? 'bg-gray-500' :
                                              'bg-purple-500'}
                                        `}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <div className="w-16 text-right text-sm">
                                    {percentage.toFixed(1)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Game Board Grid */}
                <div className="aspect-square">
                    <div className="grid grid-cols-8 gap-1 p-2 bg-gray-900/50 rounded-xl">
                        {Array.from({ length: 64 }).map((_, index) => {
                            const square = gameState?.squares[index] || { id: index, bear: null, faction: null };
                            return (
                                <div
                                    key={index}
                                    onClick={() => handleSquareClick(index)}
                                    className={`
                                        aspect-square
                                        bg-gray-800/80 rounded-lg cursor-pointer
                                        hover:bg-gray-700/80 transition-all duration-200
                                        border-2 ${square.faction ? getFactionColor(square.faction) : 'border-transparent'}
                                        ${selectedSquareId === index ? 'ring-2 ring-yellow-400' : ''}
                                        ${isBattling && selectedSquareId === index ? 'animate-pulse' : ''}
                                        relative overflow-hidden
                                        transform hover:scale-[1.02] hover:-translate-y-0.5
                                        shadow-lg hover:shadow-xl
                                    `}
                                >
                                    {square.bear && (
                                        <div className="absolute inset-0 w-full h-full">
                                            <img 
                                                src={square.bear.metadata.image}
                                                alt={square.bear.metadata.name}
                                                className="w-full h-full object-cover rounded-md"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm 
                                                           text-white text-xs p-1.5 truncate">
                                                {square.bear.metadata.name}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Game Stats or Info (Optional) */}
                <div className="mt-6 flex justify-between items-center text-gray-400 text-sm">
                    <div>Active Players: {gameState?.activePlayers || 0}</div>
                    <div>Total Battles: {gameState?.totalBattles || 0}</div>
                </div>
            </div>

            {/* Bear Selector Modal */}
            {showBearSelector && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                        <BearSelector
                            nfts={nfts}
                            onSelect={() => setShowBearSelector(false)}
                            onClose={() => {
                                setShowBearSelector(false);
                                setSelectedSquareId(null);
                            }}
                            gameState={gameState}
                            isBattle={!!gameState?.squares[selectedSquareId!]?.faction}
                        />
                    </div>
                </div>
            )}
        </div>
    );
});

export default GameBoard; 