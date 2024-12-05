import { useEffect, useState } from 'react';
import { OptimizedImage } from './OptimizedImage';
import { supabase } from '../lib/supabase';
import { Faction, Square } from '../types/game';
import { getCooldownDetails } from '../utils/cooldown';
import { BearState, BearStatus, Bear } from '../types/bear';

interface Cooldown {
    token_id: string;
    end_time: number;
    wallet_address: string;
    created_at?: string;
}

interface BearRecord {
    token_id: string;
    wins: number;
    losses: number;
}

interface ProcessedBear extends Bear {
    status: BearStatus;
    cooldownEnd?: number;
    cooldownRemaining: string | null;
}

interface BearInventoryProps {
    nfts: any[];
    userFaction: Faction;
    walletAddress: string;
}

export default function BearInventory({ nfts, userFaction, walletAddress }: BearInventoryProps) {
    const [cooldowns, setCooldowns] = useState<Cooldown[]>([]);
    const [gameState, setGameState] = useState<any>(null);
    const [bearRecords, setBearRecords] = useState<BearRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [processedBears, setProcessedBears] = useState<ProcessedBear[]>([]);

    useEffect(() => {
        console.log('BearInventory mounted with:', {
            nftsCount: nfts?.length,
            nftsData: nfts,
            userFaction
        });
    }, [nfts, userFaction]);

    const isInCooldown = (tokenId: string) => {
        const cooldown = cooldowns.find(c => c.token_id === String(tokenId));
        if (!cooldown) return false;

        const currentTime = Math.floor(Date.now() / 1000);
        const isStillInCooldown = cooldown.end_time > currentTime;
        
        console.log('Cooldown check:', {
            tokenId,
            currentTime,
            endTime: cooldown.end_time,
            isStillInCooldown
        });
        
        return isStillInCooldown;
    };

    const cleanExpiredCooldowns = async () => {
        try {
            // First get expired cooldowns
            const currentTime = Math.floor(Date.now() / 1000);
            const { data: expiredCooldowns, error: fetchError } = await supabase
                .from('cooldowns')
                .select('*')
                .lt('end_time', currentTime);

            if (fetchError) {
                console.error('Error fetching expired cooldowns:', fetchError);
                return;
            }

            if (!expiredCooldowns?.length) {
                console.log('No expired cooldowns to clean');
                return;
            }

            // Then delete them using their IDs
            const expiredIds = expiredCooldowns.map(c => c.id);
            const { error: deleteError } = await supabase
                .from('cooldowns')
                .delete()
                .in('id', expiredIds);

            if (deleteError) {
                console.error('Error deleting expired cooldowns:', deleteError);
            } else {
                console.log(`Cleaned ${expiredIds.length} expired cooldowns`);
            }
        } catch (err) {
            console.error('Error in cleanExpiredCooldowns:', err);
        }
    };

    const isBearDeployed = (tokenId: string) => {
        if (!gameState?.squares) {
            console.log('No squares available in game state:', {
                gameStateExists: !!gameState,
                squaresExist: !!gameState?.squares
            });
            return false;
        }
        
        const isDeployed = gameState.squares.some((square: Square) => {
            const bearMatch = square?.bear?.tokenId === String(tokenId);
            if (bearMatch) {
                console.log('Found deployed bear:', {
                    tokenId,
                    square,
                    bearTokenId: square?.bear?.tokenId
                });
            }
            return bearMatch;
        });

        console.log('Bear deployment check:', {
            tokenId,
            isDeployed,
            squaresCount: gameState.squares.length,
            gameStateId: gameState.id
        });
        
        return isDeployed;
    };

    const isInBattle = (tokenId: string) => {
        const inUsedBears = gameState?.used_bears?.includes(String(tokenId));
        const bearInCooldown = isInCooldown(tokenId);
        const activeOnBoard = isBearDeployed(tokenId);
        
        console.log('Battle state check:', {
            tokenId,
            inUsedBears,
            bearInCooldown,
            activeOnBoard,
            gameStateId: gameState?.id,
            used_bears: gameState?.used_bears,
            shouldBeInBattle: activeOnBoard && !bearInCooldown
        });
        
        // Consider a bear in battle if it's on the board and not in cooldown
        return activeOnBoard && !bearInCooldown;
    };

    const cleanUsedBears = async () => {
        try {
            if (!gameState?.id) return;
            
            // Get current cooldowns and active board positions
            const currentTime = Math.floor(Date.now() / 1000);
            const { data: activeCooldowns } = await supabase
                .from('cooldowns')
                .select('token_id')
                .gt('end_time', currentTime);

            const cooldownTokenIds = new Set(activeCooldowns?.map(c => c.token_id) || []);
            const activeTokenIds = new Set(
                gameState.squares
                    .filter((square: Square) => square?.bear !== null)
                    .map((square: Square) => String(square.bear!.tokenId))
            );
            
            // Filter out bears that are neither in cooldown nor on the board
            const updatedUsedBears = gameState.used_bears.filter((tokenId: string) => 
                cooldownTokenIds.has(String(tokenId)) || activeTokenIds.has(String(tokenId))
            );

            console.log('Cleaning used bears:', {
                before: gameState.used_bears.length,
                after: updatedUsedBears.length,
                removed: gameState.used_bears.filter((id: string) => !updatedUsedBears.includes(id)),
                activeBears: Array.from(activeTokenIds),
                cooldownBears: Array.from(cooldownTokenIds)
            });

            // Update game state
            const { error } = await supabase
                .from('games')
                .update({ used_bears: updatedUsedBears })
                .eq('id', gameState.id);

            if (error) {
                console.error('Error updating used bears:', error);
            }
        } catch (err) {
            console.error('Error in cleanUsedBears:', err);
        }
    };

    useEffect(() => {
        const fetchGameState = async () => {
            try {
                setLoading(true);
                if (!walletAddress) {
                    console.log('No wallet address available');
                    return;
                }

                // First, get all active games to check the situation
                const { data: activeGames, error: activeGamesError } = await supabase
                    .from('games')
                    .select('*')
                    .eq('wallet_address', walletAddress)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                console.log('Active games found:', {
                    count: activeGames?.length,
                    games: activeGames
                });

                if (activeGamesError) {
                    console.error('Error fetching active games:', activeGamesError);
                    return;
                }

                // If we have multiple active games, deactivate all but the most recent
                if (activeGames && activeGames.length > 1) {
                    console.log('Multiple active games found. Cleaning up...');
                    
                    // Keep the most recent game
                    const mostRecentGame = activeGames[0];
                    const gamesToDeactivate = activeGames.slice(1);
                    
                    // Deactivate older games
                    const { error: deactivateError } = await supabase
                        .from('games')
                        .update({ is_active: false })
                        .in('id', gamesToDeactivate.map(g => g.id));

                    if (deactivateError) {
                        console.error('Error deactivating old games:', deactivateError);
                    } else {
                        console.log('Successfully deactivated old games');
                    }

                    setGameState(mostRecentGame);
                } 
                // If we have exactly one active game, use it
                else if (activeGames && activeGames.length === 1) {
                    console.log('Found single active game:', {
                        id: activeGames[0].id,
                        squaresCount: activeGames[0].squares?.length,
                        usedBears: activeGames[0].used_bears
                    });
                    setGameState(activeGames[0]);
                }
                // If we have no active games, create a new one
                else {
                    console.log('No active games found. Creating new game...');
                    
                    const newGameData = {
                        wallet_address: walletAddress,
                        squares: Array(64).fill(null).map((_, index) => ({
                            id: index,
                            bear: null,
                            faction: null
                        })),
                        used_bears: [],
                        is_active: true,
                        end_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
                    };

                    const { data: newGame, error: createError } = await supabase
                        .from('games')
                        .insert([newGameData])
                        .select()
                        .single();

                    if (createError) {
                        console.error('Error creating new game:', createError);
                    } else {
                        console.log('Created new game:', {
                            id: newGame.id,
                            squaresCount: newGame.squares?.length
                        });
                        setGameState(newGame);
                    }
                }
            } catch (error) {
                console.error('Unexpected error in fetchGameState:', error);
            } finally {
                setLoading(false);
            }
        };

        if (walletAddress) {
            fetchGameState();
        }

        // Set up polling for game state updates
        const intervalId = setInterval(() => {
            if (walletAddress) {
                fetchGameState();
            }
        }, 10000);

        return () => clearInterval(intervalId);
    }, [walletAddress]);

    const getCooldownTimeRemaining = (tokenId: string) => {
        const cooldown = cooldowns.find(c => c.token_id === String(tokenId));
        if (!cooldown) return null;
        
        const remainingTime = (cooldown.end_time * 1000) - Date.now();
        if (remainingTime <= 0) return null;

        const hours = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const getBearState = (bear: Bear): BearState => {
        const cooldownActive = isInCooldown(bear.tokenId);
        const battleActive = isInBattle(bear.tokenId);
        const onBoard = isBearDeployed(bear.tokenId);
        
        console.log('Bear state check:', {
            tokenId: bear.tokenId,
            cooldownActive,
            battleActive,
            onBoard
        });

        if (cooldownActive) {
            const cooldownTime = getCooldownTimeRemaining(bear.tokenId);
            return {
                status: BearStatus.COOLDOWN,
                text: `Cooldown: ${cooldownTime}`,
                color: 'text-yellow-400'
            };
        }
        if (battleActive) {
            return {
                status: BearStatus.IN_BATTLE,
                text: 'In Battle',
                color: 'text-red-400'
            };
        }
        return {
            status: BearStatus.READY,
            text: 'Ready',
            color: 'text-green-400'
        };
    };

    const getBearRecord = (tokenId: string) => {
        const record = bearRecords.find(r => r.token_id === String(tokenId));
        return {
            wins: record?.wins || 0,
            losses: record?.losses || 0
        };
    };

    // Add cooldown refresh interval
    useEffect(() => {
        if (!walletAddress) return;

        const fetchCooldowns = async () => {
            try {
                const { data: cooldownData } = await supabase
                    .from('cooldowns')
                    .select('*')
                    .eq('wallet_address', walletAddress);
                
                // Filter out expired cooldowns
                const currentTime = Math.floor(Date.now() / 1000);
                const activeCooldowns = cooldownData?.filter(cd => cd.end_time > currentTime) || [];
                
                setCooldowns(activeCooldowns);
            } catch (error) {
                console.error('Error fetching cooldowns:', error);
            }
        };

        // Set up interval to check cooldowns
        const intervalId = setInterval(async () => {
            await fetchCooldowns();
        }, 5000); // Check every 5 seconds

        // Initial fetch
        fetchCooldowns();

        // Cleanup
        return () => clearInterval(intervalId);
    }, [walletAddress]);

    // Process bears with cooldown status
    useEffect(() => {
        if (loading || !gameState) {
            console.log('Waiting for game state to load...');
            return;
        }

        const processBears = () => {
            console.log('Processing bears with game state:', {
                gameId: gameState.id,
                squaresCount: gameState.squares?.length,
                usedBears: gameState.used_bears
            });

            const processedBearsArray: ProcessedBear[] = nfts.map(bear => {
                const cooldown = cooldowns.find(c => 
                    c.token_id === String(bear.tokenId)
                );
                const currentTime = Math.floor(Date.now() / 1000);
                const isInCooldownState = cooldown && cooldown.end_time > currentTime;

                const bearState = getBearState(bear);
                console.log('Processing bear:', {
                    tokenId: bear.tokenId,
                    state: bearState,
                    cooldownEnd: cooldown?.end_time,
                    isDeployed: isBearDeployed(bear.tokenId)
                });

                return {
                    ...bear,
                    status: isInCooldownState ? BearStatus.COOLDOWN : 
                            isBearDeployed(bear.tokenId) ? BearStatus.IN_BATTLE : 
                            BearStatus.READY,
                    cooldownEnd: cooldown?.end_time,
                    cooldownRemaining: cooldown && isInCooldownState
                        ? getCooldownTimeRemaining(String(cooldown.end_time))
                        : null
                };
            });

            setProcessedBears(processedBearsArray);
        };

        processBears();
    }, [nfts, cooldowns, gameState, loading]);

    useEffect(() => {
        const fetchBearRecords = async () => {
            try {
                const { data: records } = await supabase
                    .from('bear_records')
                    .select('*')
                    .in('token_id', nfts.map(bear => bear.tokenId));

                setBearRecords(records || []);
            } catch (error) {
                console.error('Error fetching bear records:', error);
            }
        };

        if (nfts.length > 0) {
            fetchBearRecords();
        }
    }, [nfts]);

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold text-white mb-6">Your Bears</h2>
            
            {loading ? (
                <div className="flex justify-center items-center min-h-[200px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {processedBears.map((nft) => {
                        const bearState = getBearState(nft);
                        const record = getBearRecord(nft.tokenId);
                        
                        return (
                            <div
                                key={nft.tokenId}
                                className={`
                                    bg-gray-800/50 rounded-xl overflow-hidden
                                    backdrop-blur-sm shadow-lg
                                    ${bearState.status !== 'ready' ? 'opacity-75' : ''}
                                    transition-all duration-200
                                `}
                            >
                                <div className="relative aspect-square">
                                    <OptimizedImage
                                        src={nft.metadata.image}
                                        alt={nft.metadata.name}
                                        className="w-full h-full object-cover"
                                    />
                                    {bearState.status !== 'ready' && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="bg-black/80 px-4 py-2 rounded-lg backdrop-blur-sm">
                                                <p className={`font-medium ${bearState.color}`}>
                                                    {bearState.text}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold text-white mb-1">
                                        {nft.metadata.name}
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        #{nft.tokenId}
                                    </p>
                                    
                                    {/* Record Badge */}
                                    <div className="mt-2 inline-block px-3 py-1 rounded-full text-sm bg-gray-700 text-white">
                                        {record.wins}W - {record.losses}L
                                    </div>
                                    
                                    {/* Status Badge */}
                                    <div className={`
                                        ml-2 mt-2 inline-block px-3 py-1 rounded-full text-sm
                                        ${bearState.color} bg-black/30
                                    `}>
                                        {bearState.text}
                                    </div>
                                    
                                    {/* Faction Badge */}
                                    <div className={`
                                        ml-2 mt-2 inline-block px-3 py-1 rounded-full text-sm
                                        ${nft.metadata.faction === 'IRON' ? 'bg-blue-500 text-white' :
                                          nft.metadata.faction === 'GEO' ? 'bg-orange-500 text-white' :
                                          nft.metadata.faction === 'TECH' ? 'bg-gray-500 text-white' :
                                          'bg-purple-500 text-white'}
                                    `}>
                                        {nft.metadata.faction}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
} 