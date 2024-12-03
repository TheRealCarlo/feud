import { useState, useEffect } from 'react';
import { GameState } from '../types/game';
import { OptimizedImage } from './OptimizedImage';
import { supabase } from '../lib/supabase';

interface BearSelectorProps {
    nfts: any[];
    onSelect: (bear: any) => void;
    onClose: () => void;
    gameState: GameState;
    isBattle: boolean;
}

interface Cooldown {
    token_id: string;
    end_time: number;
    wallet_address: string;
    created_at?: string;
}

export function BearSelector({ nfts, onSelect, onClose, gameState, isBattle }: BearSelectorProps) {
    const [cooldowns, setCooldowns] = useState<Cooldown[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('BearSelector Data:', {
            nfts,
            gameState,
            cooldowns: gameState?.cooldowns,
            used_bears: gameState?.used_bears
        });

        // Check if NFTs are loaded
        if (!nfts || nfts.length === 0) {
            setLoading(true);
            return;
        }

        const allBearsMap = new Map();

        // Process NFTs and statuses
        nfts.forEach(bear => {
            const tokenId = String(bear.tokenId);
            allBearsMap.set(tokenId, {
                ...bear,
                tokenId,
                status: 'ready'
            });
        });

        // Process battle status
        if (gameState?.used_bears) {
            gameState.used_bears.forEach(tokenId => {
                const normalizedTokenId = String(tokenId);
                const bear = allBearsMap.get(normalizedTokenId);
                if (bear) {
                    allBearsMap.set(normalizedTokenId, {
                        ...bear,
                        status: 'in_battle'
                    });
                }
            });
        }

        // Process cooldowns
        if (gameState?.cooldowns && Array.isArray(gameState.cooldowns)) {
            gameState.cooldowns.forEach(cooldown => {
                const normalizedTokenId = String(cooldown.tokenId);
                const bear = allBearsMap.get(normalizedTokenId);
                if (bear) {
                    allBearsMap.set(normalizedTokenId, {
                        ...bear,
                        status: 'cooldown',
                        cooldownEnd: cooldown.timestamp
                    });
                }
            });
        }

        setCooldowns(Array.from(allBearsMap.values()));
        setLoading(false);
    }, [nfts, gameState?.cooldowns, gameState?.used_bears]);

    useEffect(() => {
        const fetchCooldowns = async () => {
            try {
                console.log('Fetching cooldowns...');
                const { data, error } = await supabase
                    .from('cooldowns')
                    .select('*')
                    .gt('end_time', Math.floor(Date.now() / 1000));

                if (error) {
                    console.error('Error fetching cooldowns:', error);
                    return;
                }

                console.log('Fetched cooldowns:', data);
                setCooldowns(data || []);
            } catch (err) {
                console.error('Error in fetchCooldowns:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCooldowns();
        const intervalId = setInterval(fetchCooldowns, 30000); // Refresh every 30 seconds
        return () => clearInterval(intervalId);
    }, []);

    const isInCooldown = (tokenId: string) => {
        const cooldown = cooldowns.find(c => c.token_id === String(tokenId));
        if (!cooldown) return false;

        const isStillInCooldown = cooldown.end_time > Math.floor(Date.now() / 1000);
        console.log(`Cooldown check for ${tokenId}:`, {
            endTime: new Date(cooldown.end_time * 1000).toISOString(),
            now: new Date().toISOString(),
            isInCooldown: isStillInCooldown
        });
        return isStillInCooldown;
    };

    const getCooldownTimeRemaining = (tokenId: string) => {
        const cooldown = cooldowns.find(c => c.token_id === String(tokenId));
        if (!cooldown) return null;
        
        const remainingTime = (cooldown.end_time * 1000) - Date.now();
        if (remainingTime <= 0) return null;

        const hours = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    // Add a refresh interval to update cooldown timers
    useEffect(() => {
        const interval = setInterval(() => {
            // Force a re-render to update cooldown times
            setCooldowns(prevCooldowns => [...prevCooldowns]);
        }, 1000); // Update every second

        return () => clearInterval(interval);
    }, []);

    const filteredBears = nfts.filter((nft) => {
        const inCooldown = isInCooldown(nft.tokenId);
        const inBattle = gameState?.used_bears?.includes(nft.tokenId);
        return !inBattle || inCooldown; // Show only bears not in battle or in cooldown
    });

    return (
        <div className="bg-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden border border-gray-700">
            {/* Header */}
            <div className="p-6 border-b border-gray-700/50">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {isBattle ? 'Choose Your Fighter' : 'Deploy Your Bear'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <svg 
                            className="w-6 h-6 text-gray-400 hover:text-white" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <p className="text-gray-400 mt-2">
                    {isBattle 
                        ? 'Select a bear to engage in battle' 
                        : 'Choose a bear to place on this territory'}
                </p>
            </div>

            {/* Bears Grid */}
            <div className="p-6">
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {filteredBears.map((nft) => {
                            const cooldownTime = getCooldownTimeRemaining(nft.tokenId);
                            const inCooldown = isInCooldown(nft.tokenId);
                            
                            return (
                                <div
                                    key={nft.tokenId}
                                    className={`
                                        group relative bg-gray-800 rounded-xl overflow-hidden
                                        ${inCooldown 
                                            ? 'opacity-60 cursor-not-allowed' 
                                            : 'cursor-pointer hover:transform hover:scale-[1.02] hover:shadow-xl'}
                                        transition-all duration-300 ease-out
                                    `}
                                    onClick={() => !inCooldown && onSelect(nft)}
                                >
                                    {/* Bear Image */}
                                    <div className="aspect-square relative">
                                        <img 
                                            src={nft.metadata.image} 
                                            alt={nft.metadata.name}
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Hover Overlay */}
                                        {!inCooldown && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="absolute bottom-4 left-4 text-white font-semibold">
                                                    Click to {isBattle ? 'Battle' : 'Deploy'}
                                                </div>
                                            </div>
                                        )}
                                        {/* Cooldown Overlay */}
                                        {inCooldown && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                                <div className="bg-black/80 px-4 py-2 rounded-lg text-center">
                                                    <p className="text-yellow-400 font-medium">On Cooldown</p>
                                                    <p className="text-white text-sm mt-1">{cooldownTime}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bear Info */}
                                    <div className="p-4">
                                        <h3 className="text-white font-semibold truncate">
                                            {nft.metadata.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-gray-400 text-sm">#{nft.tokenId}</span>
                                            <div className={`
                                                px-2 py-1 rounded-full text-xs font-medium
                                                ${nft.metadata.faction === 'IRON' ? 'bg-blue-500/20 text-blue-400' :
                                                  nft.metadata.faction === 'GEO' ? 'bg-orange-500/20 text-orange-400' :
                                                  nft.metadata.faction === 'TECH' ? 'bg-gray-500/20 text-gray-400' :
                                                  'bg-purple-500/20 text-purple-400'}
                                            `}>
                                                {nft.metadata.faction}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-700/50">
                <button
                    onClick={onClose}
                    className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors duration-200 font-medium"
                >
                    Cancel Selection
                </button>
            </div>
        </div>
    );
}