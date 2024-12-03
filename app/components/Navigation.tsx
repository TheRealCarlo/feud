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

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 bg-white dark:bg-gray-800 rounded-b-lg shadow-lg">
                <button
                    onClick={() => onViewChange('game')}
                    className={`
                        flex-1 py-4 px-6 text-center font-medium text-sm
                        transition-all duration-200 relative
                        ${activeView === 'game'
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                    `}
                >
                    <span className="flex items-center justify-center gap-2">
                        🎮 Game Board
                    </span>
                    {activeView === 'game' && (
                        <div className={`absolute bottom-0 left-0 w-full h-0.5 ${getFactionColor(userFaction)}`} />
                    )}
                </button>

                <button
                    onClick={() => onViewChange('inventory')}
                    className={`
                        flex-1 py-4 px-6 text-center font-medium text-sm
                        transition-all duration-200 relative
                        ${activeView === 'inventory'
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                    `}
                >
                    <span className="flex items-center justify-center gap-2">
                        🐻 My Bearz
                    </span>
                    {activeView === 'inventory' && (
                        <div className={`absolute bottom-0 left-0 w-full h-0.5 ${getFactionColor(userFaction)}`} />
                    )}
                </button>

                <button
                    onClick={() => onViewChange('leaderboard')}
                    className={`
                        flex-1 py-4 px-6 text-center font-medium text-sm
                        transition-all duration-200 relative
                        ${activeView === 'leaderboard'
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                    `}
                >
                    <span className="flex items-center justify-center gap-2">
                        🏆 Leaderboard
                    </span>
                    {activeView === 'leaderboard' && (
                        <div className={`absolute bottom-0 left-0 w-full h-0.5 ${getFactionColor(userFaction)}`} />
                    )}
                </button>

                <button
                    onClick={() => onViewChange('history')}
                    className={`
                        flex-1 py-4 px-6 text-center font-medium text-sm
                        transition-all duration-200 relative
                        ${activeView === 'history'
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                    `}
                >
                    <span className="flex items-center justify-center gap-2">
                        📜 Battle History
                    </span>
                    {activeView === 'history' && (
                        <div className={`absolute bottom-0 left-0 w-full h-0.5 ${getFactionColor(userFaction)}`} />
                    )}
                </button>
            </div>
        </div>
    );
} 