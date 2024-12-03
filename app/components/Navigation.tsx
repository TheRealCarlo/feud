import { useState } from 'react';
import { Faction } from '../types/game';

interface NavigationProps {
    userFaction: Faction;
    activeView: 'game' | 'inventory' | 'history' | 'leaderboard';
    onViewChange: (view: 'game' | 'inventory' | 'history' | 'leaderboard') => void;
}

export function Navigation({ userFaction, activeView, onViewChange }: NavigationProps) {
    const getFactionColor = (faction: Faction): string => {
        switch (faction) {
            case 'IRON': return 'bg-blue-500';
            case 'GEO': return 'bg-orange-500';
            case 'TECH': return 'bg-gray-500';
            case 'PAW': return 'bg-purple-500';
            default: return 'bg-gray-300';
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto mb-8">
            {/* Faction Banner */}
            <div className={`${getFactionColor(userFaction)} text-white p-4 rounded-t-lg shadow-lg`}>
                <h2 className="text-xl font-bold text-center">
                    {userFaction} Faction
                </h2>
            </div>

            {/* Navigation Tabs - Grid on mobile, Flex on desktop */}
            <div className="grid grid-cols-2 md:flex border-b border-gray-200 bg-white dark:bg-gray-800 rounded-b-lg shadow-lg">
                <button
                    onClick={() => onViewChange('game')}
                    className={`
                        py-4 px-6 text-center font-medium text-sm
                        transition-all duration-200 relative
                        border-b md:border-b-0 border-gray-700
                        ${activeView === 'game'
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                    `}
                >
                    <span className="flex items-center justify-center gap-2">
                        🎮 Game
                    </span>
                    {activeView === 'game' && (
                        <div className={`absolute bottom-0 left-0 w-full h-0.5 ${getFactionColor(userFaction)}`} />
                    )}
                </button>

                <button
                    onClick={() => onViewChange('inventory')}
                    className={`
                        py-4 px-6 text-center font-medium text-sm
                        transition-all duration-200 relative
                        border-b md:border-b-0 border-gray-700
                        ${activeView === 'inventory'
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                    `}
                >
                    <span className="flex items-center justify-center gap-2">
                        🐻 Bears
                    </span>
                    {activeView === 'inventory' && (
                        <div className={`absolute bottom-0 left-0 w-full h-0.5 ${getFactionColor(userFaction)}`} />
                    )}
                </button>

                <button
                    onClick={() => onViewChange('leaderboard')}
                    className={`
                        py-4 px-6 text-center font-medium text-sm
                        transition-all duration-200 relative
                        border-b md:border-b-0 border-gray-700
                        ${activeView === 'leaderboard'
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                    `}
                >
                    <span className="flex items-center justify-center gap-2">
                        🏆 Top
                    </span>
                    {activeView === 'leaderboard' && (
                        <div className={`absolute bottom-0 left-0 w-full h-0.5 ${getFactionColor(userFaction)}`} />
                    )}
                </button>

                <button
                    onClick={() => onViewChange('history')}
                    className={`
                        py-4 px-6 text-center font-medium text-sm
                        transition-all duration-200 relative
                        ${activeView === 'history'
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                    `}
                >
                    <span className="flex items-center justify-center gap-2">
                        📜 History
                    </span>
                    {activeView === 'history' && (
                        <div className={`absolute bottom-0 left-0 w-full h-0.5 ${getFactionColor(userFaction)}`} />
                    )}
                </button>
            </div>
        </div>
    );
} 