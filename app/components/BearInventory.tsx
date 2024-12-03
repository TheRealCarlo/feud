import { Faction } from '../types/game';
import { gameService } from '../services/gameService';

export interface BearInventoryProps {
    nfts: any[];
    userFaction: Faction;
}

interface BearRecord {
    wins: number;
    losses: number;
}

export default function BearInventory({ nfts, userFaction }: BearInventoryProps) {
    // Get battle records for each bear
    const getBearRecord = (tokenId: string): BearRecord => {
        const battles = gameService.getBattleHistory();
        let wins = 0;
        let losses = 0;

        battles.forEach(battle => {
            // Check if bear was attacker
            if (String(battle.attacker.tokenId) === String(tokenId)) {
                if (battle.winner === 'attacker') {
                    wins++;
                } else {
                    losses++;
                }
            }
            // Check if bear was defender
            else if (String(battle.defender.tokenId) === String(tokenId)) {
                if (battle.winner === 'defender') {
                    wins++;
                } else {
                    losses++;
                }
            }
        });

        return { wins, losses };
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold text-white mb-6">Your Bear Collection</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {nfts.map((bear) => {
                    const record = getBearRecord(bear.tokenId);
                    return (
                        <div 
                            key={bear.tokenId}
                            className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-all duration-200"
                        >
                            <div className="aspect-square">
                                <img 
                                    src={bear.metadata.image} 
                                    alt={bear.metadata.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="p-4">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    {bear.metadata.name}
                                </h3>
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm text-gray-400">
                                        #{bear.tokenId}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-green-500 text-sm font-medium">
                                            {record.wins}W
                                        </span>
                                        <span className="text-gray-400">/</span>
                                        <span className="text-red-500 text-sm font-medium">
                                            {record.losses}L
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <span className={`inline-block px-2 py-1 rounded-full text-sm ${
                                        userFaction === 'IRON' ? 'bg-blue-500 text-white' :
                                        userFaction === 'GEO' ? 'bg-orange-500 text-white' :
                                        userFaction === 'TECH' ? 'bg-gray-500 text-white' :
                                        'bg-purple-500 text-white'
                                    }`}>
                                        {userFaction}
                                    </span>
                                </div>
                                {/* Win Rate */}
                                {(record.wins > 0 || record.losses > 0) && (
                                    <div className="mt-2 text-xs text-gray-400">
                                        Win Rate: {Math.round((record.wins / (record.wins + record.losses)) * 100)}%
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {nfts.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-400">
                        No Brawler Bearz found in your collection.
                    </p>
                </div>
            )}
        </div>
    );
} 