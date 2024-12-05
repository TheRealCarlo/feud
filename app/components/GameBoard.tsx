import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';
import { BearSelector } from './BearSelector';
import { Faction, GameState, Battle, Square } from '../types/game';
import { gameService } from '../services/gameService';
import { battleService } from '../services/battleService';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { cleanExpiredCooldowns, getCooldownDetails } from '../utils/cooldownUtils';
import { BearState, BearStatus, Bear } from '../types/bear';

interface GameBoardProps {
    userFaction: Faction;
    nfts: any[];
    onGameStart: () => void;
    walletAddress: string;
    provider: BrowserProvider | null;
    onWalletDisconnect?: () => void;
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

const GameBoard: React.FC<GameBoardProps> = React.memo(({ 
    userFaction, 
    nfts, 
    onGameStart, 
    walletAddress, 
    provider,
    onWalletDisconnect
}) => {
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
    const [timeRemaining, setTimeRemaining] = useState<number>(24 * 60 * 60);

    // Add wallet address listener
    useEffect(() => {
        if (typeof window !== 'undefined' && window.ethereum) {
            // Handle account changes
            window.ethereum.on('accountsChanged', (accounts: string[]) => {
                if (accounts.length === 0) {
                    onWalletDisconnect?.();
                }
            });

            // Handle chain changes
            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', () => {});
                window.ethereum.removeListener('chainChanged', () => {});
            }
        };
    }, [onWalletDisconnect]);

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
                    const endTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
                    currentGame = await gameService.createNewGame(endTime.toString());
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
                setGameState(currentGame);
                const now = Math.floor(Date.now() / 1000);
                const remainingTime = (currentGame.end_time || 0) - now;
                setTimeRemaining(Math.max(0, remainingTime));
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
        console.log('handleBearSelection called with:', { 
            hasProvider: !!provider,
            providerNetwork: provider ? await provider.getNetwork().catch(() => null) : null,
            walletAddress,
            selectedBear 
        });

        if (!provider || !walletAddress) {
            toast.error('Please connect your wallet to initiate battles');
            return;
        }

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
            
            if (!targetSquare) {
                throw new Error('Invalid square selection');
            }

            if (!targetSquare.faction) {
                // Deploying to an empty square
                console.log('Deploying bear to empty square');
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
                    .eq('id', gameState.id)
                    .select();

                if (updateError) {
                    console.error('Error updating game state:', updateError);
                    throw updateError;
                }

                // Update local game state
                setGameState(prevState => {
                    if (!prevState) return null;
                    return {
                        ...prevState,
                        squares: updatedSquares,
                        used_bears: [...(prevState.used_bears || []), selectedBear.tokenId]
                    } as GameState;
                });

                toast.success('Bear deployed successfully!');
                
                // Close the selector and reset state
                setShowBearSelector(false);
                setSelectedSquareId(null);
                
                // Force refresh the game state
                await refreshGameState();
            } else if (targetSquare.faction !== userFaction) {
                // Battle logic
                console.log('Initiating battle');
                
                if (!targetSquare.bear) {
                    throw new Error('No bear found in target square');
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

                try {
                    const attackerWins = await battleService.initiateBattle(
                        provider,
                        attacker.tokenId,
                        defender.tokenId
                    );

                    toast.dismiss(battleToast);
                    
                    // Record battle outcome with "attacker" or "defender"
                    await handleBattleOutcome(
                        attacker,
                        defender,
                        attackerWins ? "attacker" : "defender",
                        selectedSquareId
                    );
                    
                    if (attackerWins) {
                        // Handle victory logic
                        toast.success('Victory! Square captured!');
                        
                        // Update square if attacker wins
                        const updatedSquares = gameState.squares.map((square, index) => 
                            index === selectedSquareId ? {
                                ...square,
                                bear: attacker,
                                faction: userFaction
                            } : square
                        );

                        // Update game state in database
                        const { error: updateError } = await supabase
                            .from('games')
                            .update({ 
                                squares: updatedSquares,
                                used_bears: [...(gameState.used_bears || []), attacker.tokenId]
                            })
                            .eq('id', gameState.id);

                        if (updateError) throw updateError;

                        // Update local state
                        setGameState(prevState => ({
                            ...prevState!,
                            squares: updatedSquares,
                            used_bears: [...(prevState?.used_bears || []), attacker.tokenId]
                        }));

                    } else {
                        // Handle defeat logic
                        toast.error('Defeat! Better luck next time!');
                        await handleCooldown(attacker);
                    }
                } catch (battleError) {
                    console.error('Battle error:', battleError);
                    toast.dismiss(battleToast);
                    toast.error('Battle failed! Please try again.');
                }
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

    // Timer logic using server time
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining(prevTime => {
                if (prevTime <= 0) {
                    clearInterval(timer);
                    handleGameEnd();
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleGameEnd = async () => {
        try {
            const winningFaction = determineWinningFaction();

            // Record the winner in battle history
            await supabase.from('battlehistory').insert({
                game_id: gameState?.id,
                winning_faction: winningFaction,
                completed_at: new Date().toISOString()
            });

            // Create new game with new end time
            const endTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
            const newGame = await gameService.createNewGame(endTime.toString());
            
            if (newGame) {
                setGameState(newGame);
                setTimeRemaining(24 * 60 * 60);
            } else {
                toast.error('Failed to start a new game');
            }
        } catch (error) {
            console.error('Error handling game end:', error);
            toast.error('Failed to end game properly');
        }
    };

    const determineWinningFaction = (): Faction | null => {
        if (!gameState) return null;

        const factionCounts: Record<Faction, number> = {
            IRON: 0,
            GEO: 0,
            PAW: 0,
            TECH: 0
        };

        gameState.squares.forEach(square => {
            if (square.faction) {
                factionCounts[square.faction]++;
            }
        });

        return Object.entries(factionCounts).reduce((maxFaction, [faction, count]) => {
            return count > factionCounts[maxFaction] ? faction as Faction : maxFaction;
        }, 'IRON' as Faction);
    };

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Define the updateBearRecord function
    const updateBearRecord = async (tokenId: string, isWinner: boolean) => {
        try {
            // First try to get the existing record
            const { data: records, error: fetchError } = await supabase
                .from('bear_records')
                .select('*')
                .eq('token_id', tokenId);

            if (fetchError) {
                console.error('Error fetching bear record:', fetchError);
                throw fetchError;
            }

            const existingRecord = records?.[0];

            if (existingRecord) {
                // Update existing record
                const { error: updateError } = await supabase
                    .from('bear_records')
                    .update({
                        wins: isWinner ? existingRecord.wins + 1 : existingRecord.wins,
                        losses: isWinner ? existingRecord.losses : existingRecord.losses + 1,
                        updated_at: new Date().toISOString()
                    })
                    .eq('token_id', tokenId);

                if (updateError) {
                    console.error('Error updating bear record:', updateError);
                    throw updateError;
                }
            } else {
                // Insert new record
                const { error: insertError } = await supabase
                    .from('bear_records')
                    .insert([{
                        token_id: tokenId,
                        wins: isWinner ? 1 : 0,
                        losses: isWinner ? 0 : 1,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }]);

                if (insertError) {
                    console.error('Error inserting bear record:', insertError);
                    throw insertError;
                }
            }
        } catch (error) {
            console.error('Error in updateBearRecord:', error);
            // Don't throw the error, just log it
        }
    };

    // Use the updateBearRecord function in handleBattleOutcome
    const handleBattleOutcome = async (
        attacker: any,
        defender: any,
        winner: string,
        targetSquareId: number
    ) => {
        try {
            // Update bear records
            await Promise.all([
                updateBearRecord(attacker.tokenId, winner === "attacker"),
                updateBearRecord(defender.tokenId, winner === "defender")
            ]);

            if (gameState) {
                let updatedUsedBears = [...gameState.used_bears];
                const twoHourCooldown = Math.floor(Date.now() / 1000) + (2 * 60 * 60); // 2 hours

                if (winner === "defender") {
                    // Attacker loses: remove from used_bears and add cooldown
                    updatedUsedBears = updatedUsedBears.filter(
                        bearId => bearId !== attacker.tokenId.toString()
                    );
                    await handleCooldown(attacker, twoHourCooldown);
                } else {
                    // Defender loses: remove from used_bears and add cooldown
                    updatedUsedBears = updatedUsedBears.filter(
                        bearId => bearId !== defender.tokenId.toString()
                    );
                    await handleCooldown(defender, twoHourCooldown);
                }

                // Update game state
                await supabase
                    .from('games')
                    .update({ used_bears: updatedUsedBears })
                    .eq('id', gameState.id);

                setGameState(prevState => ({
                    ...prevState!,
                    used_bears: updatedUsedBears
                }));
            }

            // Record battle
            const battleRecord = {
                attacker_id: walletAddress,
                attacker_name: attacker.metadata.name,
                attacker_faction: attacker.metadata.faction,
                attacker_token_id: attacker.tokenId.toString(),
                defender_id: defender.metadata.owner || walletAddress,
                defender_name: defender.metadata.name,
                defender_faction: defender.metadata.faction,
                defender_token_id: defender.tokenId.toString(),
                winner: winner,
                created_at: new Date().toISOString(),
                timestamp: new Date().toISOString()
            };

            await supabase.from('battles').insert([battleRecord]);

        } catch (error) {
            console.error('Error in battle outcome:', error);
            toast.error('Failed to record battle results');
        }
    };

    const handleCooldown = async (bear: any, endTime: number) => {
        try {
            const { error } = await supabase
                .from('cooldowns')
                .upsert({
                    token_id: bear.tokenId,
                    wallet_address: walletAddress,
                    end_time: endTime
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error handling cooldown:', error);
        }
    };

    const fetchBattleHistory = async () => {
        try {
            const { data: battles, error } = await supabase
                .from('battles')
                .select('*')
                .or(`attacker_id.eq.${walletAddress},defender_id.eq.${walletAddress}`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching battle history:', error);
                return [];
            }

            return battles || [];
        } catch (error) {
            console.error('Error in fetchBattleHistory:', error);
            return [];
        }
    };

    // Update the startNewGame function to also clear battle history
    const startNewGame = async () => {
        try {
            console.log('Starting new game for wallet:', walletAddress);
            
            if (!walletAddress) {
                throw new Error('No wallet address available');
            }

            // First, check if there's an existing game and its status
            const { data: existingGame, error: fetchError } = await supabase
                .from('games')
                .select('*')
                .eq('wallet_address', walletAddress)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('Error fetching existing game:', fetchError);
                throw fetchError;
            }

            // Log existing game state
            console.log('Existing game:', existingGame);

            // Check if we can start a new game
            if (existingGame) {
                const gameEndTime = existingGame.end_time;
                const currentTime = Math.floor(Date.now() / 1000);
                
                console.log('Game timing:', {
                    gameEndTime,
                    currentTime,
                    hasExpired: currentTime > gameEndTime,
                    timeDiff: (gameEndTime - currentTime) / (60 * 60) // hours remaining
                });

                if (currentTime <= gameEndTime) {
                    throw new Error('Current game has not expired yet');
                }
            }

            // Create new game with explicit fields
            const newGameData = {
                wallet_address: walletAddress,
                used_bears: [],
                created_at: new Date().toISOString(),
                squares: {}, // Assuming squares is a JSON object
                end_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
                is_active: true
            };

            console.log('Attempting to create new game with data:', newGameData);

            const { data: newGame, error: createError } = await supabase
                .from('games')
                .insert([newGameData])
                .select()
                .single();

            if (createError) {
                console.error('Error creating new game:', createError);
                throw createError;
            }

            console.log('New game created successfully:', newGame);

            // Clear any existing cooldowns for this wallet
            const { error: cooldownError } = await supabase
                .from('cooldowns')
                .delete()
                .eq('wallet_address', walletAddress);

            if (cooldownError) {
                console.error('Error clearing cooldowns:', cooldownError);
                // Don't throw error here, continue with game creation
            }

            // Update game state
            setGameState(newGame);
            toast.success('New game started!');

        } catch (error) {
            console.error('Failed to start new game:', error);
            if (error instanceof Error) {
                toast.error(`Failed to start new game: ${error.message}`);
            } else {
                toast.error('Failed to start new game');
            }
        }
    };

    return (
        <div className="game-board max-w-4xl mx-auto relative">
            <div className="bg-gray-800/90 rounded-2xl shadow-2xl p-6 backdrop-blur-sm">
                {/* Timer Display */}
                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Time Remaining</h2>
                    <p className="text-xl font-bold text-yellow-400">{formatTime(timeRemaining)}</p>
                </div>

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
                                              faction === 'PAW' ? 'bg-purple-500' :
                                              'bg-gray-700'}
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
                            walletAddress={walletAddress}
                        />
                    </div>
                )}
            </div>
        </div>
    );
});

export default GameBoard; 