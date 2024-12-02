import { useState, useEffect } from 'react';
import { Faction } from '../types/game';

interface Battle {
    id: string;
    timestamp: number;
    attacker: {
        bearId: string;
        faction: Faction;
        owner: string;
    };
    defender: {
        bearId: string;
        faction: Faction;
        owner: string;
    };
    winner: string;
    position: { x: number; y: number };
}

interface BattleHistoryProps {
    userAddress: string;
    userFaction: Faction;
}

export function BattleHistory({ userAddress, userFaction }: BattleHistoryProps) {
    const [battles, setBattles] = useState<Battle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: Fetch battle history from blockchain/backend
        // Mock data for now
        const mockBattles: Battle[] = [];
        setLoading(false);
        setBattles(mockBattles);
    }, [userAddress]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-6">Recent Battles</h2>
            {battles.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                    No battles found
                </div>
            ) : (
                battles.map((battle) => (
                    <div
                        key={battle.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="text-sm">
                                    {new Date(battle.timestamp).toLocaleDateString()}
                                </div>
                                <div className="font-medium">
                                    {battle.attacker.faction} vs {battle.defender.faction}
                                </div>
                            </div>
                            <div className={`
                                px-3 py-1 rounded-full text-sm
                                ${battle.winner === userAddress ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                            `}>
                                {battle.winner === userAddress ? 'Victory' : 'Defeat'}
                            </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                            Position: ({battle.position.x}, {battle.position.y})
                        </div>
                    </div>
                ))
            )}
        </div>
    );
} 