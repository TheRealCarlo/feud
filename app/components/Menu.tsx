import { useState } from 'react';
import { GameGrid } from './GameGrid';
import { BearInventory } from './BearInventory';
import { BattleHistory } from './BattleHistory';
import { Faction } from '../types/game';

interface MenuProps {
    userFaction: Faction;
    gameState: any; // Replace with proper GameState type
    selectedBear: string | null;
    onBearSelect: (bearId: string) => void;
    onPlaceBear: (position: { x: number; y: number }) => void;
    userAddress: string;
}

export function Menu({ 
    userFaction, 
    gameState, 
    selectedBear, 
    onBearSelect,
    onPlaceBear,
    userAddress 
}: MenuProps) {
    const [activeTab, setActiveTab] = useState<'game' | 'inventory' | 'history'>('game');

    const tabs = [
        { id: 'game', label: 'Game Board' },
        { id: 'inventory', label: 'My Bearz' },
        { id: 'history', label: 'Battle History' }
    ];

    return (
        <div className="w-full max-w-6xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex space-x-1 border-b border-gray-200 mb-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`
                            px-6 py-3 text-sm font-medium rounded-t-lg
                            transition-colors duration-200
                            ${activeTab === tab.id 
                                ? 'bg-white text-gray-900 border-t border-x border-gray-200' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-4">
                {activeTab === 'game' && (
                    <GameGrid
                        gameState={gameState}
                        selectedBear={selectedBear}
                        userFaction={userFaction}
                        onPlaceBear={onPlaceBear}
                        userAddress={userAddress}
                    />
                )}
                
                {activeTab === 'inventory' && (
                    <BearInventory
                        selectedBear={selectedBear}
                        onBearSelect={onBearSelect}
                        userFaction={userFaction}
                    />
                )}
                
                {activeTab === 'history' && (
                    <BattleHistory
                        userAddress={userAddress}
                        userFaction={userFaction}
                    />
                )}
            </div>
        </div>
    );
} 