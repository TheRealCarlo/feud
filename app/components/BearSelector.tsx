import { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState } from '../types/game';
import { supabase } from '../lib/supabase';
import { cleanExpiredCooldowns, getCooldownDetails } from '../utils/cooldownUtils';
import { OptimizedImage } from './OptimizedImage';
import { Faction } from '../types/game';

interface Cooldown {
    token_id: string;
    end_time: number;
    wallet_address: string;
    created_at?: string;
}

interface ProcessedBear {
    tokenId: string;
    metadata: {
        name: string;
        image: string;
        faction: Faction;
    };
    status: 'ready' | 'cooldown';
    cooldownEnd?: number;
    cooldownRemaining: string | null;
    isUsed: boolean;
}

interface BearSelectorProps {
    nfts: any[];
    onSelect: (bear: any) => void;
    onClose: () => void;
    gameState: GameState;
    isBattle: boolean;
    walletAddress: string;
}

export function BearSelector({ nfts, onSelect, onClose, gameState: initialGameState, isBattle, walletAddress }: BearSelectorProps) {
    const [cooldowns, setCooldowns] = useState<Cooldown[]>([]);
    const [loading, setLoading] = useState(true);
    const [processedBears, setProcessedBears] = useState<ProcessedBear[]>([]);

    // Add this debug logging effect
    useEffect(() => {
        console.log('BearSelector mounted with:', {
            nftsCount: nfts?.length,
            nftsData: nfts,
            walletAddress,
            gameStateId: initialGameState?.id,
            isBattle
        });
    }, [nfts, walletAddress, initialGameState, isBattle]);

    // Fetch cooldowns when component mounts
    useEffect(() => {
        const fetchCooldowns = async () => {
            if (!walletAddress) return;
            
            try {
                const { data: cooldownData, error: cooldownError } = await supabase
                    .from('cooldowns')
                    .select('*')
                    .eq('wallet_address', walletAddress)
                    .gt('end_time', Math.floor(Date.now() / 1000));

                if (cooldownError) {
                    console.error('Error fetching cooldowns:', cooldownError);
                } else {
                    setCooldowns(cooldownData || []);
                }
            } catch (err) {
                console.error('Error fetching cooldowns:', err);
            }
        };

        fetchCooldowns();
    }, [walletAddress]);

    // Process bears when nfts or cooldowns change
    useEffect(() => {
        if (!nfts || !walletAddress) {
            console.log('Missing nfts or wallet address:', { nfts: !!nfts, walletAddress });
            return;
        }

        const processBears = () => {
            console.log('Processing mode:', { isBattle, tokenId: '850' });

            // Only filter out used bears if not in battle mode
            const availableNfts = nfts.filter(bear => {
                const isUsed = initialGameState?.used_bears?.includes(String(bear.tokenId));
                const inCooldown = cooldowns.find(c => c.token_id === String(bear.tokenId));
                
                console.log('Bear filtering:', {
                    tokenId: bear.tokenId,
                    isUsed,
                    isBattle,
                    inCooldown: !!inCooldown
                });

                // In battle mode, show all bears that aren't in cooldown
                // In deploy mode, only show unused bears
                return isBattle ? !inCooldown : !isUsed;
            });

            // Process each bear with its cooldown status
            const processedBearsArray = availableNfts.map(bear => {
                const cooldown = cooldowns.find(c => c.token_id === String(bear.tokenId));
                const isUsed = initialGameState?.used_bears?.includes(String(bear.tokenId));
                
                return {
                    ...bear,
                    tokenId: String(bear.tokenId),
                    status: cooldown ? 'cooldown' : 'ready',
                    cooldownEnd: cooldown?.end_time,
                    cooldownRemaining: cooldown
                        ? getCooldownDetails(String(cooldown.end_time))
                        : null,
                    isUsed // Add isUsed property for reference
                };
            });

            // Sort bears: ready first, then cooldown
            const sortedBears = processedBearsArray.sort((a, b) => {
                if (a.status === 'ready' && b.status === 'cooldown') return -1;
                if (a.status === 'cooldown' && b.status === 'ready') return 1;
                return 0;
            });

            console.log('Processed bears:', sortedBears.length);
            setProcessedBears(sortedBears);
            setLoading(false);
        };

        processBears();
    }, [nfts, cooldowns, walletAddress, initialGameState?.used_bears, isBattle]);

    const isInCooldown = useCallback((tokenId: string) => {
        const cooldown = cooldowns.find(c => c.token_id === String(tokenId));
        if (!cooldown) return false;

        const currentTime = Math.floor(Date.now() / 1000);
        return cooldown.end_time > currentTime;
    }, [cooldowns]);

    const getCooldownTimeRemaining = useCallback((tokenId: string) => {
        const cooldown = cooldowns.find(c => c.token_id === String(tokenId));
        if (!cooldown) return null;
        
        const remainingTime = (cooldown.end_time * 1000) - Date.now();
        if (remainingTime <= 0) return null;

        const hours = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }, [cooldowns]);

    // Add cooldown refresh interval
    useEffect(() => {
        // Initial fetch of cooldowns
        const fetchCooldowns = async () => {
            try {
                const { data: cooldownData } = await supabase
                    .from('cooldowns')
                    .select('*')
                    .eq('wallet_address', walletAddress);
                
                // Filter out expired cooldowns
                const currentTime = Math.floor(Date.now() / 1000);
                const activeCooldowns = cooldownData?.filter(cd => cd.end_time > currentTime) || [];
                
                console.log('Fetched cooldowns:', activeCooldowns);
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

    // Process bears with updated cooldown status
    useEffect(() => {
        if (!nfts || !walletAddress) {
            console.log('Missing nfts or wallet address:', { nfts: !!nfts, walletAddress });
            return;
        }

        const processBears = () => {
            const currentTime = Math.floor(Date.now() / 1000);
            
            // Filter out used bears and process cooldowns
            const availableNfts = nfts.filter(bear => {
                const isUsed = initialGameState?.used_bears?.includes(String(bear.tokenId));
                return !isUsed;
            });

            const processedBearsArray = availableNfts.map(bear => {
                const cooldown = cooldowns.find(c => 
                    c.token_id === String(bear.tokenId) && 
                    c.end_time > currentTime
                );

                return {
                    ...bear,
                    tokenId: String(bear.tokenId),
                    status: cooldown ? 'cooldown' : 'ready',
                    cooldownEnd: cooldown?.end_time,
                    cooldownRemaining: cooldown
                        ? getCooldownDetails(String(cooldown.end_time))
                        : null
                };
            });

            // Sort bears: ready first, then cooldown
            const sortedBears = processedBearsArray.sort((a, b) => {
                if (a.status === 'ready' && b.status === 'cooldown') return -1;
                if (a.status === 'cooldown' && b.status === 'ready') return 1;
                return 0;
            });

            setProcessedBears(sortedBears);
            setLoading(false);
        };

        processBears();
    }, [nfts, cooldowns, walletAddress, initialGameState?.used_bears]);

    return (
        <div className="bg-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden border border-gray-700">
            {/* Header */}
            <div className="p-6 border-b border-gray-700/50">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {isBattle ? 'Choose Your Brawler' : 'Deploy Your Bear'}
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
                        {processedBears.map((nft) => {
                            const cooldownTime = getCooldownTimeRemaining(nft.tokenId);
                            const inCooldown = isInCooldown(nft.tokenId);
                            const isUsed = nft.isUsed;
                            
                            return (
                                <div
                                    key={nft.tokenId}
                                    className={`
                                        group relative bg-gray-800 rounded-xl overflow-hidden
                                        ${inCooldown 
                                            ? 'opacity-60 cursor-not-allowed' 
                                            : 'cursor-pointer hover:transform hover:scale-[1.02] hover:shadow-xl'}
                                        transition-all duration-300 ease-out
                                        ${isUsed && !isBattle ? 'opacity-40' : ''}
                                    `}
                                    onClick={() => !inCooldown && (isBattle || !isUsed) && onSelect(nft)}
                                >
                                    {/* Bear Image */}
                                    <div className="aspect-square relative">
                                        <img 
                                            src={nft.metadata.image} 
                                            alt={nft.metadata.name}
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Status Overlays */}
                                        {!inCooldown && !isUsed && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="absolute bottom-4 left-4 text-white font-semibold">
                                                    Click to {isBattle ? 'Battle' : 'Deploy'}
                                                </div>
                                            </div>
                                        )}
                                        {inCooldown && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                                <div className="bg-black/80 px-4 py-2 rounded-lg text-center">
                                                    <p className="text-yellow-400 font-medium">On Cooldown</p>
                                                    <p className="text-white text-sm mt-1">{cooldownTime}</p>
                                                </div>
                                            </div>
                                        )}
                                        {isUsed && !isBattle && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                                <div className="bg-black/80 px-4 py-2 rounded-lg text-center">
                                                    <p className="text-blue-400 font-medium">Deployed</p>
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
                                            <div className={`px-3 py-1 rounded-full text-sm ${
                                                nft.metadata.faction === 'IRON' ? 'bg-blue-500 text-white' :
                                                nft.metadata.faction === 'GEO' ? 'bg-orange-500 text-white' :
                                                nft.metadata.faction === 'TECH' ? 'bg-gray-500 text-white' :
                                                nft.metadata.faction === 'PAW' ? 'bg-purple-500 text-white' :
                                                'bg-gray-700 text-white' // fallback for unknown factions
                                            }`}>
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