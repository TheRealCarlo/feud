import { useEffect, useState } from 'react';
import { gameService } from '../services/gameService';
import { OptimizedImage } from './OptimizedImage';
import { Faction } from '../types/game';

interface BearStats {
    tokenId: string;
    name: string;
    image: string | null;
    faction: Faction;
    wins: number;
    losses: number;
    winRate: number;
}

interface BearMetadata {
    name: string;
    image: string;
}

interface BattleParticipant {
    tokenId: string;
    name: string;
    metadata: BearMetadata;
    faction: Faction;
}

interface Battle {
    attacker: BattleParticipant;
    defender: BattleParticipant;
    winner: 'attacker' | 'defender';
    timestamp: number;
}

export default function Leaderboard() {
    const [topBears, setTopBears] = useState<BearStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const calculateLeaderboard = () => {
            const battles = gameService.getBattleHistory() as Battle[];
            const bearStats = new Map<string, BearStats>();

            // Process all battles
            battles.forEach(battle => {
                // Process attacker
                if (!bearStats.has(battle.attacker.tokenId)) {
                    bearStats.set(battle.attacker.tokenId, {
                        tokenId: battle.attacker.tokenId,
                        name: battle.attacker.name,
                        image: battle.attacker.metadata?.image || null,
                        faction: battle.attacker.faction,
                        wins: 0,
                        losses: 0,
                        winRate: 0
                    });
                }

                // Process defender
                if (!bearStats.has(battle.defender.tokenId)) {
                    bearStats.set(battle.defender.tokenId, {
                        tokenId: battle.defender.tokenId,
                        name: battle.defender.name,
                        image: battle.defender.metadata?.image || null,
                        faction: battle.defender.faction,
                        wins: 0,
                        losses: 0,
                        winRate: 0
                    });
                }

                // Update win/loss records
                const attackerStats = bearStats.get(battle.attacker.tokenId)!;
                const defenderStats = bearStats.get(battle.defender.tokenId)!;

                if (battle.winner === 'attacker') {
                    attackerStats.wins++;
                    defenderStats.losses++;
                } else {
                    attackerStats.losses++;
                    defenderStats.wins++;
                }

                // Calculate win rates
                attackerStats.winRate = (attackerStats.wins / (attackerStats.wins + attackerStats.losses)) * 100;
                defenderStats.winRate = (defenderStats.wins / (defenderStats.wins + defenderStats.losses)) * 100;
            });

            // Convert to array and sort by win rate
            const sortedBears = Array.from(bearStats.values())
                .sort((a, b) => {
                    if (b.winRate !== a.winRate) {
                        return b.winRate - a.winRate;
                    }
                    if (b.wins !== a.wins) {
                        return b.wins - a.wins;
                    }
                    return (b.wins + b.losses) - (a.wins + a.losses);
                })
                .slice(0, 10); // Get top 10

            setTopBears(sortedBears);
            setIsLoading(false);
        };

        calculateLeaderboard();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold text-white mb-6">Top 10 Brawlers</h2>
            
            <div className="space-y-4">
                {topBears.map((bear, index) => (
                    <div 
                        key={bear.tokenId}
                        className="bg-gray-800 rounded-lg p-4 flex items-center gap-4"
                    >
                        {/* Rank */}
                        <div className="text-2xl font-bold text-gray-400 w-8">
                            #{index + 1}
                        </div>

                        {/* Bear Image */}
                        {bear.image && (
                            <div className="w-16 h-16 relative rounded-lg overflow-hidden">
                                <OptimizedImage
                                    src={bear.image}
                                    alt={bear.name}
                                    height="64px"
                                    className="rounded-lg"
                                />
                            </div>
                        )}

                        {/* Bear Info */}
                        <div className="flex-grow">
                            <h3 className="text-lg font-semibold text-white">
                                {bear.name}
                            </h3>
                            <p className="text-sm text-gray-400">
                                #{bear.tokenId}
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="text-right">
                            <div className="flex items-center gap-2 justify-end mb-1">
                                <span className="text-green-500 font-medium">{bear.wins}W</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-red-500 font-medium">{bear.losses}L</span>
                            </div>
                            <div className="text-sm text-gray-400">
                                {bear.winRate.toFixed(1)}% Win Rate
                            </div>
                        </div>

                        {/* Faction Badge */}
                        <div className={`px-3 py-1 rounded-full text-sm ${
                            bear.faction === 'IRON' ? 'bg-blue-500 text-white' :
                            bear.faction === 'GEO' ? 'bg-orange-500 text-white' :
                            bear.faction === 'TECH' ? 'bg-gray-500 text-white' :
                            'bg-purple-500 text-white'
                        }`}>
                            {bear.faction}
                        </div>
                    </div>
                ))}
            </div>

            {topBears.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    No battles recorded yet.
                </div>
            )}
        </div>
    );
} 