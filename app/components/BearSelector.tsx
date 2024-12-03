import { useState, useEffect } from 'react';
import { GameState } from '../types/game';

interface BearSelectorProps {
    nfts: any[];
    onSelect: (bear: any) => void;
    onClose: () => void;
    gameState: GameState;
    isBattle: boolean;
}

export function BearSelector({ nfts, onSelect, onClose, gameState, isBattle }: BearSelectorProps) {
    const [cooldowns, setCooldowns] = useState<{ [key: string]: number }>({});
    const [allBears, setAllBears] = useState<any[]>([]);

    useEffect(() => {
        const allBearsMap = new Map();

        // Add all NFTs
        nfts.forEach(bear => allBearsMap.set(bear.tokenId, bear));

        // Add bears from cooldowns
        if (gameState?.cooldowns && Array.isArray(gameState.cooldowns)) {
            gameState.cooldowns.forEach(cooldown => {
                // Find the bear in nfts array using the cooldown's tokenId
                const cooldownBear = nfts.find(bear => bear.tokenId === cooldown.tokenId);
                if (cooldownBear) {
                    allBearsMap.set(cooldown.tokenId, cooldownBear);
                }
            });
        }

        setAllBears(Array.from(allBearsMap.values()));
    }, [nfts, gameState?.cooldowns]);

    useEffect(() => {
        const updateCooldowns = () => {
            const newCooldowns: { [key: string]: number } = {};
            const now = Date.now();

            if (gameState?.cooldowns && Array.isArray(gameState.cooldowns)) {
                gameState.cooldowns.forEach(cooldown => {
                    if (cooldown && typeof cooldown.timestamp === 'number' && cooldown.tokenId) {
                        const timeLeft = cooldown.timestamp - now;
                        if (timeLeft > 0) {
                            newCooldowns[cooldown.tokenId] = timeLeft;
                        }
                    }
                });
            }

            setCooldowns(newCooldowns);
        };

        updateCooldowns();
        const interval = setInterval(updateCooldowns, 1000);
        return () => clearInterval(interval);
    }, [gameState?.cooldowns]);

    const formatTime = (milliseconds: number) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <h2 className="text-lg font-bold text-white">
                {isBattle ? 'Select Bear for Battle' : 'Select Bear for Placement'}
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto p-2">
                {allBears.map(bear => {
                    const hasCooldown = cooldowns[bear.tokenId] > 0;
                    const isUsed = gameState?.used_bears?.includes(bear.tokenId);
                    const isDisabled = hasCooldown || isUsed;

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
                            <div className="relative">
                                <img 
                                    src={bear.metadata.image} 
                                    alt={bear.metadata.name} 
                                    className="w-full h-24 object-cover rounded-md"
                                />
                                {isDisabled && (
                                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-md">
                                        {hasCooldown ? (
                                            <div className="text-center">
                                                <div className="text-yellow-400 text-sm font-medium mb-1">
                                                    Cooldown
                                                </div>
                                                <div className="text-white text-xs">
                                                    {formatTime(cooldowns[bear.tokenId])}
                                                </div>
                                            </div>
                                        ) : (
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
                                ${hasCooldown 
                                    ? 'text-yellow-400' 
                                    : isUsed 
                                        ? 'text-red-400'
                                        : 'text-green-400'}
                            `}>
                                {hasCooldown 
                                    ? 'On Cooldown' 
                                    : isUsed 
                                        ? 'In Battle'
                                        : 'Ready'}
                            </div>
                        </div>
                    );
                })}
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