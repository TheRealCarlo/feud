import { useState, useEffect } from 'react';
import { Faction, BattleResult } from '../types/game';
import { gameService } from '../services/gameService';

export interface BattleHistoryProps {
    userFaction: Faction;
}

export default function BattleHistory({ userFaction }: BattleHistoryProps) {
    const [battles, setBattles] = useState<BattleResult[]>([]);

    useEffect(() => {
        const history = gameService.getBattleHistory();
        setBattles(history);
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold text-white mb-6">Battle History</h2>
            
            <div className="space-y-4">
                {battles.map((battle) => (
                    <div 
                        key={battle.id}
                        className={`
                            bg-gray-800 rounded-lg p-4 border border-gray-700
                            ${battle.winningFaction === userFaction ? 'border-green-500' : 'border-red-500'}
                        `}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400">
                                {new Date(battle.startTime).toLocaleDateString()}
                            </span>
                            <span className={`
                                px-3 py-1 rounded-full text-sm font-medium
                                ${battle.winningFaction === userFaction ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
                            `}>
                                {battle.winningFaction === userFaction ? 'Victory' : 'Defeat'}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {Object.entries(battle.scores).map(([faction, score]) => (
                                <div 
                                    key={faction}
                                    className={`
                                        p-2 rounded-lg
                                        ${faction === userFaction ? 'bg-gray-700' : 'bg-gray-900'}
                                    `}
                                >
                                    <span className="text-sm text-gray-400">{faction}</span>
                                    <span className="block text-lg font-bold text-white">{score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {battles.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-400">
                            No battles recorded yet.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
} 