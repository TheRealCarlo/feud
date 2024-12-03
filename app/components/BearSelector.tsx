import { useState, useEffect } from 'react';
import { GameState } from '../types/game';
import { OptimizedImage } from './OptimizedImage';

interface BearSelectorProps {
    nfts: any[];
    onSelect: (bear: any) => void;
    onClose: () => void;
    gameState: GameState;
    isBattle: boolean;
}

export function BearSelector({ nfts, onSelect, onClose, gameState, isBattle }: BearSelectorProps) {
    const [allBears, setAllBears] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        console.log('BearSelector Data:', {
            nfts,
            gameState,
            cooldowns: gameState?.cooldowns,
            used_bears: gameState?.used_bears
        });

        // Check if NFTs are loaded
        if (!nfts || nfts.length === 0) {
            setIsLoading(true);
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

        setAllBears(Array.from(allBearsMap.values()));
        setIsLoading(false);
    }, [nfts, gameState?.cooldowns, gameState?.used_bears]);

    // Add a refresh interval to update cooldown timers
    useEffect(() => {
        const interval = setInterval(() => {
            // Force a re-render to update cooldown times
            setAllBears(prevBears => [...prevBears]);
        }, 1000); // Update every second

        return () => clearInterval(interval);
    }, []);

    if (isLoading && (!nfts || nfts.length === 0)) {
        return (
            <div className="flex flex-col items-center gap-4">
                <h2 className="text-lg font-bold text-white">Loading Bears...</h2>
                <div className="animate-pulse flex space-x-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div 
                                key={n} 
                                className="w-32 h-40 bg-gray-700 rounded-lg"
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const renderBearCard = (bear: any) => {
        // Check if bear is in cooldown from the gameState
        const cooldown = gameState?.cooldowns?.find(
            cd => String(cd.tokenId) === String(bear.tokenId)
        );
        
        // Check if bear is in battle
        const isInBattle = gameState?.used_bears?.includes(String(bear.tokenId));
        
        // Calculate cooldown status
        const now = Date.now();
        const TWO_HOURS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        
        // A bear is in cooldown if:
        // 1. It has an explicit cooldown in gameState, OR
        // 2. It was in battle and lost (handled by gameState.cooldowns)
        const isInCooldown = cooldown && cooldown.timestamp > now;
        const cooldownEndTime = cooldown ? cooldown.timestamp : 0;
        
        const isDisabled = isInCooldown || isInBattle;

        // Format cooldown time remaining
        const formatTimeRemaining = (timestamp: number) => {
            const timeLeft = timestamp - now;
            if (timeLeft <= 0) return 'Ready';
            
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}h ${minutes}m`;
        };

        return (
            <div
                key={bear.tokenId}
                className={`
                    relative bg-gray-700 rounded-lg p-2 
                    ${isDisabled 
                        ? 'opacity-75 cursor-not-allowed' 
                        : 'cursor-pointer hover:bg-gray-600 hover:transform hover:scale-105'}
                    transition-all duration-200
                `}
                onClick={() => !isDisabled && onSelect(bear)}
            >
                <div className="relative w-full h-24">
                    <OptimizedImage 
                        src={bear.metadata.image} 
                        alt={bear.metadata.name}
                        height="100%"
                        className="rounded-md"
                    />
                    {isDisabled && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-md">
                            {isInCooldown ? (
                                <div className="text-center">
                                    <div className="text-yellow-400 text-sm font-medium mb-1">
                                        Cooldown
                                    </div>
                                    <div className="text-white text-xs">
                                        {formatTimeRemaining(cooldownEndTime)}
                                    </div>
                                </div>
                            ) : isInBattle && (
                                <div className="text-red-400 text-sm font-medium">
                                    In Battle
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="mt-2 text-center text-white text-sm truncate">
                    {bear.metadata.name}
                </div>
                
                <div className={`
                    mt-1 text-center text-xs font-medium
                    ${isInCooldown 
                        ? 'text-yellow-400' 
                        : isInBattle 
                            ? 'text-red-400'
                            : 'text-green-400'}
                `}>
                    {isInCooldown 
                        ? `Cooldown: ${formatTimeRemaining(cooldownEndTime)}` 
                        : isInBattle 
                            ? 'In Battle'
                            : 'Ready'}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <h2 className="text-lg font-bold text-white">
                {isBattle ? 'Select Bear for Battle' : 'Select Bear for Placement'}
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto p-2">
                {allBears.map(renderBearCard)}
            </div>

            <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
                Close
            </button>
        </div>
    );
}