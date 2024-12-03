import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { BearSelector } from './BearSelector';
import { Faction, GameState, Battle } from '../types/game';
import { gameService } from '../services/gameService';
import { battleService } from '../services/battleService';
import { supabase } from '../lib/supabase'

declare global {
    interface Window {
        ethereum?: any;
    }
}

interface GameBoardProps {
    userFaction: Faction;
    nfts: any[];
    onGameStart: () => void;
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

const getProvider = async (): Promise<BrowserProvider> => {
    // Wait for window.ethereum to be injected
    const waitForEthereum = async (retries = 5): Promise<any> => {
        if (typeof window === 'undefined') return null;
        
        if (window.ethereum) {
            return window.ethereum;
        }

        if (retries === 0) {
            throw new Error('MetaMask not detected. Please install MetaMask.');
        }

        // Wait for 1 second before trying again
        await new Promise(resolve => setTimeout(resolve, 1000));
        return waitForEthereum(retries - 1);
    };

    try {
        const ethereum = await waitForEthereum();
        if (!ethereum) {
            throw new Error('No ethereum provider found');
        }
        
        // Create provider with safety checks
        const provider = new BrowserProvider(ethereum);
        
        // Test the connection
        await provider.getNetwork();
        
        return provider;
    } catch (error) {
        console.error('Error getting provider:', error);
        throw new Error('Failed to connect to Ethereum provider. Please check your MetaMask connection.');
    }
};

export default function GameBoard({ userFaction, nfts, onGameStart }: GameBoardProps) {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [selectedSquareId, setSelectedSquareId] = useState<number | null>(null);
    const [showBearSelector, setShowBearSelector] = useState(false);
    const [isBattling, setIsBattling] = useState(false);
    const [battleResult, setBattleResult] = useState<string | null>(null);

    // Add loading state
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchGameState = async () => {
            setIsLoading(true);
            try {
                const { data: currentGame, error: fetchError } = await supabase
                    .from('games')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (fetchError) {
                    console.error('Error fetching game:', fetchError);
                    return;
                }

                if (!currentGame) {
                    const initialState = gameService.createInitialGameState();
                    const { data: newGame, error: createError } = await supabase
                        .from('games')
                        .insert([initialState])
                        .select()
                        .single();

                    if (createError) {
                        console.error('Error creating game:', createError);
                        return;
                    }

                    setGameState(newGame);
                    onGameStart();
                } else {
                    setGameState(currentGame);
                }
            } catch (error) {
                console.error('Unexpected error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGameState();

        // Set up timer
        const timerInterval = setInterval(() => {
            if (gameState) {
                const timeRemaining = gameService.getTimeRemaining(gameState);
                setTimeLeft(timeRemaining);

                // Check if game has ended
                if (!gameService.isGameActive(gameState)) {
                    clearInterval(timerInterval);
                }
            }
        }, 1000);

        // Set up real-time subscription
        const subscription = supabase
            .channel('game_updates')
            .on('postgres_changes', 
                {
                    event: '*',
                    schema: 'public',
                    table: 'games'
                },
                (payload: any) => {
                    console.log('Received game update:', payload);
                    if (payload.new && 'squares' in payload.new) {
                        setGameState(payload.new as GameState);
                    }
                }
            )
            .subscribe();

        // Cleanup
        return () => {
            clearInterval(timerInterval);
            subscription.unsubscribe();
        };
    }, [gameState?.id, onGameStart]);

    // Add loading state check
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    // Add null check for gameState
    if (!gameState) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-red-500">Error loading game state</div>
            </div>
        );
    }

    const handleSquareClick = (index: number) => {
        if (!gameState) return;
        
        // Check if the game is still active
        if (!gameService.isGameActive(gameState)) {
            alert('Game has ended!');
            return;
        }

        // Check if the square is already selected
        if (selectedSquareId === index) {
            setSelectedSquareId(null);
            setShowBearSelector(false);
            return;
        }

        // Check if the square belongs to the user's faction
        const square = gameState.squares[index];
        if (square.faction === userFaction) {
            alert('You already own this square!');
            return;
        }

        // Check if the square is occupied by another faction
        const isOccupied = square.bear !== null;
        if (isOccupied && square.faction !== userFaction) {
            // Allow battle
            setSelectedSquareId(index);
            setShowBearSelector(true);
            return;
        }

        // For empty squares
        setSelectedSquareId(index);
        setShowBearSelector(true);
    };

    const handleBearSelect = async (bear: any) => {
        if (!gameState || selectedSquareId === null) return;

        const targetSquare = gameState.squares[selectedSquareId];
        const isOccupied = targetSquare.bear !== null;

        // If square is occupied by another faction, initiate battle
        if (isOccupied && targetSquare.faction !== userFaction && targetSquare.bear) {
            setBattleResult('Battle in progress...');
            
            try {
                // Get the defending bear's token ID
                const defenderId = targetSquare.bear.tokenId;
                const attackerId = bear.tokenId;

                // Get provider and initiate battle
                const provider = await getProvider();
                const attackerWins = await battleService.initiateBattle(
                    provider,
                    attackerId,
                    defenderId
                );

                // Create battle record with correct types
                const battleRecord: Battle = {
                    timestamp: Date.now(),
                    attacker: {
                        tokenId: attackerId,
                        name: bear.metadata.name,
                        faction: userFaction
                    },
                    defender: {
                        tokenId: defenderId,
                        name: targetSquare.bear.metadata.name,
                        faction: targetSquare.faction!
                    },
                    winner: attackerWins ? 'attacker' : 'defender' as const // Type assertion for winner
                };

                // Add to battle history
                gameService.addBattleToHistory(battleRecord);

                if (attackerWins) {
                    // Update the square with the attacking bear
                    const updatedSquares = [...gameState.squares];
                    updatedSquares[selectedSquareId] = {
                        ...updatedSquares[selectedSquareId],
                        bear: bear,
                        faction: userFaction
                    };

                    const { error } = await supabase
                        .from('games')
                        .update({
                            squares: updatedSquares,
                            used_bears: Array.isArray(gameState.used_bears) 
                                ? [...gameState.used_bears, bear.tokenId]
                                : [bear.tokenId]
                        })
                        .eq('id', gameState.id);

                    if (error) {
                        console.error('Failed to update game state:', error);
                        setBattleResult('Error updating game state');
                        return;
                    }

                    setBattleResult(`${bear.metadata.name} won the battle!`);
                } else {
                    // Handle defender victory
                    const updatedGameState = battleService.handleBattleLoss(gameState, bear.tokenId);
                    
                    const { error } = await supabase
                        .from('games')
                        .update({
                            cooldowns: updatedGameState.cooldowns
                        })
                        .eq('id', gameState.id);

                    if (error) {
                        console.error('Failed to update cooldowns:', error);
                    }

                    setBattleResult(`${targetSquare.bear.metadata.name} defended successfully!`);
                }

                // Refresh the game state
                await refreshGameState();
            } catch (err) {
                console.error('Battle error:', err);
                setBattleResult(err instanceof Error ? err.message : 'Battle failed to complete');
            }
        } else {
            // Normal bear placement for unoccupied squares
            try {
                const { error } = await supabase
                    .from('games')
                    .update({
                        squares: gameState.squares.map((square, index) => 
                            index === selectedSquareId
                                ? { ...square, bear, faction: userFaction }
                                : square
                        ),
                        used_bears: Array.isArray(gameState.used_bears) 
                            ? [...gameState.used_bears, bear.tokenId]
                            : [bear.tokenId]
                    })
                    .eq('id', gameState.id);

                if (error) {
                    console.error('Failed to update game state:', error);
                    return;
                }

                await refreshGameState();
            } catch (err) {
                console.error('Error updating game:', err);
            }
        }

        setShowBearSelector(false);
        setSelectedSquareId(null);

        // Clear battle result after 3 seconds
        if (battleResult) {
            setTimeout(() => {
                setBattleResult(null);
            }, 3000);
        }
    };

    const refreshGameState = async () => {
        console.log('Refreshing game state...');
        try {
            const { data: currentGame, error } = await supabase
                .from('games')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                console.error('Error refreshing game state:', error);
                return;
            }

            if (currentGame && 'squares' in currentGame) {
                console.log('Refreshed game state:', currentGame);
                setGameState(currentGame as GameState);
            }
        } catch (err) {
            console.error('Error during refresh:', err);
        }
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Battle Result Message */}
            {battleResult && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-gray-800 text-white rounded-lg shadow-lg z-50 animate-fade-in">
                    {battleResult}
                </div>
            )}

            {/* Timer Display */}
            <div className="px-4 py-2 bg-gray-800 rounded-lg text-white font-mono">
                Time Remaining: {timeLeft}
            </div>

            {/* Battle Status */}
            {isBattling && (
                <div className="px-4 py-2 bg-yellow-600 text-white rounded-lg animate-pulse">
                    Battle in progress...
                </div>
            )}

            {/* Game Board */}
            <div className="grid grid-cols-8 gap-1 p-4 bg-gray-800 rounded-lg shadow-lg">
                {Array.from({ length: 64 }).map((_, index) => {
                    const square = gameState.squares[index] || { id: index, bear: null, faction: null };
                    return (
                        <div
                            key={index}
                            onClick={() => handleSquareClick(index)}
                            className={`
                                w-16 h-16 bg-gray-700 rounded-sm cursor-pointer
                                hover:bg-gray-600 transition-all duration-200
                                border-2 ${square.faction ? getFactionColor(square.faction) : 'border-transparent'}
                                ${selectedSquareId === index ? 'ring-2 ring-yellow-400' : ''}
                                ${isBattling && selectedSquareId === index ? 'animate-pulse' : ''}
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
                    );
                })}
            </div>

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

            {showBearSelector && (
                <BearSelector
                    nfts={nfts.filter(bear => 
                        !gameState?.used_bears?.includes(bear.tokenId)
                    )}
                    onSelect={handleBearSelect}
                    onClose={() => {
                        setShowBearSelector(false);
                        setSelectedSquareId(null);
                    }}
                    gameState={gameState}
                    isBattle={!!gameState.squares[selectedSquareId!]?.faction}
                />
            )}
        </div>
    );
} 