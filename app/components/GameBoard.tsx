import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { BearSelector } from './BearSelector';
import { Faction, GameState } from '../types/game';
import { gameService } from '../services/gameService';
import { battleService } from '../services/battleService';
import { supabase } from '../lib/supabase'

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

export default function GameBoard({ userFaction, nfts, onGameStart }: GameBoardProps) {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [selectedSquareId, setSelectedSquareId] = useState<number | null>(null);
    const [showBearSelector, setShowBearSelector] = useState(false);
    const [isBattling, setIsBattling] = useState(false);

    useEffect(() => {
        const fetchGameState = async () => {
            console.log('Fetching game state...');
            try {
                const { data: currentGame, error: fetchError } = await supabase
                    .from('games')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (fetchError) {
                    console.error('Error fetching game:', {
                        message: fetchError.message,
                        details: fetchError.details,
                        hint: fetchError.hint,
                        code: fetchError.code
                    });
                    return;
                }

                console.log('Current game:', currentGame);

                if (!currentGame) {
                    console.log('Creating new game...');
                    const initialSquares = Array(64).fill(null).map((_, index) => ({
                        id: index,
                        bear: null,
                        faction: null
                    }));

                    const { data: newGame, error: createError } = await supabase
                        .from('games')
                        .insert([{
                            squares: initialSquares,
                            end_time: Date.now() + (24 * 60 * 60 * 1000),
                            used_bears: [],
                            is_active: true
                        }])
                        .select()
                        .single();

                    if (createError) {
                        console.error('Error creating game:', createError);
                        return;
                    }

                    console.log('New game created:', newGame);
                    setGameState(newGame);
                    onGameStart();
                } else {
                    console.log('Using existing game:', currentGame);
                    setGameState(currentGame);
                }
            } catch (error) {
                console.error('Unexpected error:', error);
            }
        };

        fetchGameState();

        // Timer update
        const timerInterval = setInterval(() => {
            setGameState(prevState => {
                if (!prevState) return null;
                const timeLeft = prevState.end_time - Date.now();
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
                return prevState;
            });
        }, 1000);

        // Subscription for real-time updates
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

        return () => {
            clearInterval(timerInterval);
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (gameState) {
            console.log('Game State:', {
                squareCount: gameState.squares.length,
                firstSquare: gameState.squares[0],
                lastSquare: gameState.squares[63],
                allSquares: gameState.squares
            });
        }
    }, [gameState]);

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

    const handleBearSelect = async (bear: any) => {
        if (!gameState || selectedSquareId === null) return;

        console.log('Placing bear:', {
            bear,
            squareId: selectedSquareId,
            currentState: gameState
        });

        // Create updated squares array
        const updatedSquares = [...gameState.squares];
        updatedSquares[selectedSquareId] = {
            ...updatedSquares[selectedSquareId],
            bear: bear,
            faction: userFaction
        };

        console.log('Updated squares:', updatedSquares);

        try {
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
                alert('Failed to place bear. Please try again.');
                return;
            }

            // Refresh the game state after update
            await refreshGameState();
            
            setShowBearSelector(false);
            setSelectedSquareId(null);
        } catch (err) {
            console.error('Error updating game:', err);
            alert('Failed to place bear. Please try again.');
        }
    };

    const handleSquareClick = (squareId: number) => {
        setSelectedSquareId(squareId);
        setShowBearSelector(true);
    };

    if (!gameState) {
        return <div className="text-center text-white">Loading game state...</div>;
    }

    return (
        <div className="flex flex-col items-center gap-6">
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