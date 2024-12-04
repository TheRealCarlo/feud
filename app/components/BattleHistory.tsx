import React from 'react';
import { useEffect, useState } from 'react';
import { gameService } from '../services/gameService';
import { Battle, Faction } from '../types/game';

interface BattleHistoryProps {
    userFaction: Faction;
    // Add other props if needed
}

const BattleHistory: React.FC<BattleHistoryProps> = ({ userFaction }) => {
    const [battles, setBattles] = useState<Battle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBattles = async () => {
            try {
                setLoading(true);
                const history = await gameService.getGameHistory();
                setBattles(history);
            } catch (error) {
                console.error('Error fetching battle history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBattles();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (battles.length === 0) {
        return (
            <div className="text-center p-4 text-gray-500">
                No battles recorded yet
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {battles.map((battle) => (
                <div 
                    key={battle.id}
                    className="bg-gray-800 rounded-lg p-4 shadow-md"
                >
                    <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-gray-400">
                            {new Date(battle.completed_at).toLocaleDateString()}
                        </div>
                        <div className={`px-2 py-1 rounded text-sm font-medium
                            ${battle.winning_faction === 'IRON' ? 'bg-blue-500/20 text-blue-400' :
                              battle.winning_faction === 'GEO' ? 'bg-orange-500/20 text-orange-400' :
                              battle.winning_faction === 'TECH' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-green-500/20 text-green-400'}`}
                        >
                            {battle.winning_faction} Victory
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        <div className="text-center">
                            <div className="text-sm text-blue-400">IRON</div>
                            <div className="font-medium">{battle.iron_squares}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-orange-400">GEO</div>
                            <div className="font-medium">{battle.geo_squares}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-purple-400">TECH</div>
                            <div className="font-medium">{battle.tech_squares}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-green-400">PAW</div>
                            <div className="font-medium">{battle.paw_squares}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Make sure to use a default export
export default BattleHistory; 