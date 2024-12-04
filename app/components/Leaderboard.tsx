import { useEffect, useState } from 'react';
import { OptimizedImage } from './OptimizedImage';
import { supabase } from '../lib/supabase';
import { Faction } from '../types/game';

interface BearStats {
    tokenId: string;
    name: string;
    image: string | null;
    faction: Faction;
    wins: number;
    losses: number;
    win_rate: number;
}

export default function Leaderboard() {
    const [topBears, setTopBears] = useState<BearStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // First get the top bears by wins
                const { data: bearRecords, error: bearError } = await supabase
                    .from('bear_records')
                    .select('*')
                    .order('wins', { ascending: false })
                    .limit(10);

                if (bearError) throw bearError;

                // Then get the latest battle for each bear to get their metadata
                const bearPromises = bearRecords.map(async (record) => {
                    const { data: battles, error: battleError } = await supabase
                        .from('battles')
                        .select('*')
                        .or(`attacker_token_id.eq.${record.token_id},defender_token_id.eq.${record.token_id}`)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (battleError) {
                        console.warn(`Could not fetch battle data for bear ${record.token_id}:`, battleError);
                        return null;
                    }

                    const isAttacker = battles?.attacker_token_id === record.token_id;
                    
                    return {
                        tokenId: record.token_id,
                        name: isAttacker ? battles?.attacker_name : battles?.defender_name,
                        image: isAttacker ? battles?.attacker_image : battles?.defender_image,
                        faction: isAttacker ? battles?.attacker_faction : battles?.defender_faction,
                        wins: record.wins,
                        losses: record.losses,
                        win_rate: record.wins + record.losses > 0 
                            ? (record.wins / (record.wins + record.losses)) * 100 
                            : 0
                    };
                });

                const processedBears = (await Promise.all(bearPromises)).filter(Boolean) as BearStats[];
                setTopBears(processedBears);
                setIsLoading(false);

            } catch (error) {
                console.error('Error fetching leaderboard:', error);
                setIsLoading(false);
            }
        };

        fetchLeaderboard();
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
            
            {topBears.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    No battles recorded yet.
                </div>
            ) : (
                <div className="space-y-4">
                    {topBears.map((bear, index) => (
                        <div 
                            key={`${bear.tokenId}-${index}`}
                            className="bg-gray-800 rounded-lg p-4 flex items-center gap-4"
                        >
                            <div className="text-2xl font-bold text-gray-400 w-8">
                                #{index + 1}
                            </div>

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

                            <div className="flex-grow">
                                <h3 className="text-lg font-semibold text-white">
                                    {bear.name}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    #{bear.tokenId}
                                </p>
                            </div>

                            <div className="text-right">
                                <div className="flex items-center gap-2 justify-end mb-1">
                                    <span className="text-green-500 font-medium">{bear.wins}W</span>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-red-500 font-medium">{bear.losses}L</span>
                                </div>
                                <div className="text-sm text-gray-400">
                                    {bear.win_rate.toFixed(1)}% Win Rate
                                </div>
                            </div>

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
            )}
        </div>
    );
} 