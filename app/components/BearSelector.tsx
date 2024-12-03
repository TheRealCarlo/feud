import { useState, useEffect } from 'react';
import { GameState } from '../types/game';
import { battleService } from '../services/battleService';

interface BearSelectorProps {
    nfts: any[];
    onSelect: (bear: any) => void;
    onClose: () => void;
    gameState: GameState;
    isBattle?: boolean;
}

export function BearSelector({ nfts, onSelect, onClose, gameState, isBattle = false }: BearSelectorProps) {
    const [availableBears, setAvailableBears] = useState(nfts);

    // Update available bears when cooldowns change
    useEffect(() => {
        const now = Date.now();
        const filteredBears = nfts.filter(bear => {
            const cooldown = battleService.getBearCooldown(gameState, bear.tokenId);
            return !cooldown || cooldown <= now;
        });
        setAvailableBears(filteredBears);

        // Set up interval to check cooldowns
        const interval = setInterval(() => {
            const updatedBears = nfts.filter(bear => {
                const cooldown = battleService.getBearCooldown(gameState, bear.tokenId);
                return !cooldown || cooldown <= now;
            });
            setAvailableBears(updatedBears);
        }, 1000); // Check every second

        return () => clearInterval(interval);
    }, [nfts, gameState.cooldowns]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isBattle ? 'Select Bear for Battle' : 'Select Bear for Placement'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {nfts.map((bear) => {
                            const cooldownUntil = battleService.getBearCooldown(gameState, bear.tokenId);
                            const isOnCooldown = cooldownUntil !== null && cooldownUntil > Date.now();
                            const cooldownTime = isOnCooldown ? battleService.formatCooldownTime(cooldownUntil) : '';

                            return (
                                <div
                                    key={bear.tokenId}
                                    onClick={() => !isOnCooldown && onSelect(bear)}
                                    className={`
                                        relative bg-white dark:bg-gray-700 rounded-lg p-3
                                        border border-gray-200 dark:border-gray-600
                                        ${!isOnCooldown && 'hover:shadow-lg transition-all duration-200 cursor-pointer'}
                                    `}
                                >
                                    <div className="aspect-square overflow-hidden rounded-md mb-2 relative">
                                        <img 
                                            src={bear.metadata.image} 
                                            alt={bear.metadata.name}
                                            className="w-full h-full object-cover"
                                        />
                                        {isOnCooldown && (
                                            <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center">
                                                <span className="text-white font-bold text-lg mb-1">COOLDOWN</span>
                                                <span className="text-white text-sm bg-red-500 px-2 py-1 rounded">
                                                    {cooldownTime}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                                {bear.metadata.name}
                                            </h4>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                #{bear.tokenId}
                                            </span>
                                        </div>
                                        {isOnCooldown && (
                                            <div className="flex items-center gap-1 text-red-500">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                                                    />
                                                </svg>
                                                <span className="text-sm font-medium">Resting</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer with info */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        {isBattle 
                            ? "Bears need 2 hours to rest after losing a battle"
                            : "Select a bear to place on the board"
                        }
                    </p>
                </div>
            </div>
        </div>
    );
} 