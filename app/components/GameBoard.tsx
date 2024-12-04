import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';
import { BearSelector } from './BearSelector';
import { Faction, GameState, Battle, Square } from '../types/game';
import { gameService } from '../services/gameService';
import { battleService } from '../services/battleService';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { cleanExpiredCooldowns, getCooldownDetails } from '../utils/cooldownUtils';

interface GameBoardProps {
    userFaction: Faction;
    nfts: any[];
    onGameStart: () => void;
    walletAddress: string;
}

interface Cooldown {
    tokenId: string;
    end_time: number;
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

const GameBoard: React.FC<GameBoardProps> = React.memo(({ userFaction, nfts, onGameStart, walletAddress: initialWalletAddress }) => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedSquareId, setSelectedSquareId] = useState<number | null>(null);
    const [showBearSelector, setShowBearSelector] = useState(false);
    const [isBattling, setIsBattling] = useState(false);
    const [provider, setProvider] = useState<BrowserProvider | null>(null);
    const [walletAddress, setWalletAddress] = useState<string>(initialWalletAddress || '');
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

    // Initialize provider and get wallet address
    useEffect(() => {
        const initProvider = async () => {
            if (typeof window !== 'undefined' && window.ethereum) {
                try {
                    const ethersProvider = new BrowserProvider(window.ethereum);
                    const accounts = await window.ethereum.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    
                    console.log('Wallet initialized:', {
                        provider: !!ethersProvider,
                        account: accounts[0]
                    });

                    setProvider(ethersProvider);
                    setWalletAddress(accounts[0]);
                } catch (error) {
                    console.error('Error initializing provider:', error);
                    toast.error('Failed to connect to wallet');
                }
            } else {
                console.error('No ethereum provider found');
                toast.error('Please install MetaMask');
            }
        };

        if (!walletAddress) {
            initProvider();
        }
    }, [walletAddress]);

    const refreshGameState = useCallback(async () => {
        try {
            const { data: activeGames, error: activeGamesError } = await supabase
                .from('games')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1);

            if (activeGamesError) {
                console.error('Error fetching active games:', activeGamesError);
                toast.error('Failed to refresh game state');
                return;
            }

            let currentGame: GameState | null = activeGames?.[0] || null;

            if (!currentGame) {
                try {
                    currentGame = await gameService.createNewGame();
                    if (!currentGame) {
                        toast.error('Failed to create new game');
                        return;
                    }
                } catch (error) {
                    console.error('Error creating new game:', error);
                    toast.error('Failed to create new game');
                    return;
                }
            }

            if (currentGame) {
                await gameService.checkGameCompletion(currentGame);
                setGameState(currentGame);
            }

        } catch (err) {
            console.error('Error during game refresh:', err);
            toast.error('Failed to refresh game state');
        }
    }, []);

    // Initial game state fetch
    useEffect(() => {
        let mounted = true;

        const fetchInitialState = async () => {
            if (mounted) {
                await refreshGameState();
            }
        };

        fetchInitialState();

        return () => {
            mounted = false;
        };
    }, [refreshGameState]);

    // Periodic refresh (every 30 seconds)
    useEffect(() => {
        const interval = setInterval(refreshGameState, 30000);
        return () => clearInterval(interval);
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
            calculateTerritoryStats(gameState.squares);
        }
    }, [gameState?.squares, calculateTerritoryStats]);

    const handleSquareClick = (index: number) => {
        console.log('Square clicked:', {
            index,
            squareData: gameState?.squares[index],
            userFaction
        });
        
        const targetSquare = gameState?.squares[index];
        
        // Check if it's a valid attack
        if (targetSquare?.faction && targetSquare.faction !== userFaction) {
            // Attacking an enemy square
            setSelectedSquareId(index);
            setShowBearSelector(true);
        } else if (!targetSquare?.faction) {
            // Deploying to empty square
            setSelectedSquareId(index);
            setShowBearSelector(true);
        } else {
            toast.error("You can't attack your own faction!");
        }
    };

    const handleBearSelection = async (selectedBear: any) => {
        if (!gameState) {
            console.error('Game state is null');
            toast.error('Game state not available');
            return;
        }

        if (selectedSquareId === null) {
            console.error('No square selected');
            toast.error('Please select a square first');
            return;
        }

        try {
            setIsBattling(true);
            const targetSquare = gameState.squares[selectedSquareId];

            if (!targetSquare.faction) {
                // Deploying to an empty square
                const updatedSquares = gameState.squares.map((square, index) => 
                    index === selectedSquareId ? {
                        ...square,
                        bear: selectedBear,
                        faction: userFaction
                    } : square
                );

                // Update used bears in the database
                const { error: updateError } = await supabase
                    .from('games')
                    .update({ 
                        squares: updatedSquares,
                        used_bears: [...(gameState.used_bears || []), selectedBear.tokenId]
                    })
                    .eq('id', gameState.id);

                if (updateError) {
                    throw updateError;
                }

                // Update local game state with proper typing
                setGameState(prevState => {
                    if (!prevState) return null;
                    return {
                        ...prevState,
                        squares: updatedSquares,
                        used_bears: [...(prevState.used_bears || []), selectedBear.tokenId]
                    } as GameState;  // Ensure the return type matches GameState
                });
            } else if (targetSquare.faction !== userFaction) {
                // Attacking an enemy square
                if (!targetSquare.bear) {
                    console.error('Target square has no bear');
                    toast.error('Invalid target square');
                    return;
                }

                const attacker = {
                    ...selectedBear,
                    metadata: {
                        ...selectedBear.metadata,
                        faction: userFaction
                    }
                };

                const defender = {
                    ...targetSquare.bear,
                    metadata: {
                        ...targetSquare.bear.metadata,
                        faction: targetSquare.faction
                    }
                };

                const battleToast = toast.loading(
                    <div className="flex flex-col space-y-2">
                        <div className="font-bold text-yellow-400">Battle Initiated!</div>
                        <div className="text-sm">
                            {attacker.metadata.name} vs {defender.metadata.name}
                        </div>
                    </div>
                );

                const attackerWins = await battleService.initiateBattle(
                    provider,
                    attacker.tokenId,
                    defender.tokenId
                );

                await battleService.recordBattle(
                    attacker,
                    defender,
                    attackerWins ? attacker.tokenId : defender.tokenId
                );

                toast.dismiss(battleToast);

                const updatedSquares = gameState.squares.map((square, index) => 
                    index === selectedSquareId ? {
                        ...square,
                        bear: attackerWins ? attacker : defender,
                        faction: attackerWins ? userFaction : targetSquare.faction
                    } : square
                );

                setGameState(prev => ({
                    ...prev!,
                    squares: updatedSquares
                }));

                const { error: battleUpdateError } = await supabase
                    .from('games')
                    .update({ squares: updatedSquares })
                    .eq('id', gameState.id);

                if (battleUpdateError) {
                    throw new Error(`Failed to update game after battle: ${battleUpdateError.message}`);
                }

                if (attackerWins) {
                    await gameService.updateCooldowns(defender.tokenId, walletAddress);
                    toast.success(
                        <div className="flex flex-col space-y-2">
                            <div className="font-bold text-green-400">Victory!</div>
                            <div className="text-sm">
                                {attacker.metadata.name} has defeated {defender.metadata.name}!
                            </div>
                        </div>,
                        { duration: 5000 }
                    );
                } else {
                    await gameService.updateCooldowns(attacker.tokenId, walletAddress);
                    toast.error(
                        <div className="flex flex-col space-y-2">
                            <div className="font-bold text-red-400">Defeat!</div>
                            <div className="text-sm">
                                {attacker.metadata.name} was beaten by {defender.metadata.name}!
                            </div>
                        </div>,
                        { duration: 5000 }
                    );
                }
            } else {
                toast.error("You can't attack your own faction!");
            }
        } catch (error) {
            console.error('Error during bear selection:', error);
            toast.error('Failed to deploy bear! Please try again.');
        } finally {
            setIsBattling(false);
            setShowBearSelector(false);
            setSelectedSquareId(null);
        }
    };

    return (
        <div className="game-board max-w-4xl mx-auto relative">
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

                {/* Game Stats */}
                <div className="mt-6 flex justify-between items-center text-gray-400 text-sm">
                    <div>Players Online: {gameState?.activePlayers ?? 0}</div>
                    <div>Total Moves: {gameState?.totalBattles ?? 0}</div>
                </div>

                {/* Render BearSelector as a modal when selectedSquareId exists */}
                {selectedSquareId !== null && gameState && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
                        <BearSelector
                            nfts={nfts}
                            onSelect={handleBearSelection}
                            onClose={() => {
                                setSelectedSquareId(null);
                                setShowBearSelector(false);
                            }}
                            gameState={gameState}
                            isBattle={!!gameState.squares[selectedSquareId]?.faction}
                        />
                    </div>
                )}
            </div>
        </div>
    );
});

export default GameBoard; 