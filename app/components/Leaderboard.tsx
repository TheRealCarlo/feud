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
                // Fetch the leaderboard data from the leaderboard view/table
                const { data, error } = await supabase
                    .from('leaderboard')
                    .select('*')
                    .order('win_rate', { ascending: false })
                    .order('wins', { ascending: false })
                    .limit(10);

                if (error) {
                    throw error;
                }

                if (data) {
                    setTopBears(data);
                }
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
            } finally {
                setIsLoading(false);
            }
        };

        // Initial fetch
        fetchLeaderboard();

        // Set up real-time subscription for leaderboard updates
        const leaderboardSubscription = supabase
            .channel('leaderboard_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'leaderboard'
                },
                () => {
                    // Refresh the leaderboard when changes occur
                    fetchLeaderboard();
                }
            )
            .subscribe();

        // Cleanup subscription
        return () => {
            leaderboardSubscription.unsubscribe();
        };
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
                                {bear.win_rate.toFixed(1)}% Win Rate
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