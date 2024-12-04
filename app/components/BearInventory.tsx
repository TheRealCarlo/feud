import { useEffect, useState } from 'react';
import { OptimizedImage } from './OptimizedImage';
import { supabase } from '../lib/supabase';
import { Faction } from '../types/game';

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

interface BearInventoryProps {
    nfts: any[];
    userFaction: Faction;
}

export default function BearInventory({ nfts, userFaction }: BearInventoryProps) {
    const [cooldowns, setCooldowns] = useState<Cooldown[]>([]);
    const [gameState, setGameState] = useState<any>(null);
    const [bearRecords, setBearRecords] = useState<BearRecord[]>([]);
    const [loading, setLoading] = useState(true);

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

    const isOnGameBoard = (tokenId: string) => {
        if (!gameState?.squares) return false;
        
        // Check if the bear is actively placed on any square
        return gameState.squares.some(square => 
            square?.bear?.tokenId === String(tokenId)
        );
    };

    const isInBattle = (tokenId: string) => {
        const inUsedBears = gameState?.used_bears?.includes(String(tokenId));
        const bearInCooldown = isInCooldown(tokenId);
        const activeOnBoard = isOnGameBoard(tokenId);
        
        console.log('Battle state check:', {
            tokenId,
            inUsedBears,
            bearInCooldown,
            activeOnBoard,
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
                    .filter(square => square?.bear)
                    .map(square => String(square.bear.tokenId))
            );
            
            // Filter out bears that are neither in cooldown nor on the board
            const updatedUsedBears = gameState.used_bears.filter(tokenId => 
                cooldownTokenIds.has(String(tokenId)) || activeTokenIds.has(String(tokenId))
            );

            console.log('Cleaning used bears:', {
                before: gameState.used_bears.length,
                after: updatedUsedBears.length,
                removed: gameState.used_bears.filter(id => !updatedUsedBears.includes(id)),
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
        const fetchData = async () => {
            try {
                // Clean expired cooldowns first
                await cleanExpiredCooldowns();
                
                // Then fetch current cooldowns
                const { data: cooldownData, error: cooldownError } = await supabase
                    .from('cooldowns')
                    .select('*')
                    .gt('end_time', Math.floor(Date.now() / 1000));

                if (cooldownError) {
                    console.error('Error fetching cooldowns:', cooldownError);
                } else {
                    console.log('Fetched cooldowns:', cooldownData);
                    setCooldowns(cooldownData || []);
                }

                // Clean used bears list
                await cleanUsedBears();

                // Fetch current game state
                const { data: gameData, error: gameError } = await supabase
                    .from('games')
                    .select('*')
                    .eq('is_active', true)
                    .single();

                if (gameError) {
                    console.error('Error fetching game state:', gameError);
                } else {
                    console.log('Fetched game state:', gameData);
                    setGameState(gameData);
                }

                // Fetch bear records
                const { data: recordData, error: recordError } = await supabase
                    .from('bear_records')
                    .select('*');

                if (recordError) {
                    console.error('Error fetching bear records:', recordError);
                } else {
                    console.log('Fetched bear records:', recordData);
                    setBearRecords(recordData || []);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const intervalId = setInterval(fetchData, 10000);
        return () => clearInterval(intervalId);
    }, []);

    const getCooldownTimeRemaining = (tokenId: string) => {
        const cooldown = cooldowns.find(c => c.token_id === String(tokenId));
        if (!cooldown) return null;
        
        const remainingTime = (cooldown.end_time * 1000) - Date.now();
        if (remainingTime <= 0) return null;

        const hours = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const getBearState = (tokenId: string) => {
        const cooldownActive = isInCooldown(tokenId);
        const battleActive = isInBattle(tokenId);
        const onBoard = isOnGameBoard(tokenId);
        
        console.log('Bear state check:', {
            tokenId,
            cooldownActive,
            battleActive,
            onBoard
        });

        if (cooldownActive) {
            const cooldownTime = getCooldownTimeRemaining(tokenId);
            return {
                status: 'cooldown',
                text: `Cooldown: ${cooldownTime}`,
                color: 'text-yellow-400'
            };
        }
        if (battleActive) {
            return {
                status: 'battle',
                text: 'In Battle',
                color: 'text-red-400'
            };
        }
        return {
            status: 'ready',
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

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold text-white mb-6">Your Bears</h2>
            
            {loading ? (
                <div className="flex justify-center items-center min-h-[200px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nfts.map((nft) => {
                        const bearState = getBearState(nft.tokenId);
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