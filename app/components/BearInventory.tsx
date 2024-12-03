import { Faction } from '../types/game';

export interface BearInventoryProps {
    nfts: any[];
    userFaction: Faction;
}

export default function BearInventory({ nfts, userFaction }: BearInventoryProps) {
    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold text-white mb-6">Your Bear Collection</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {nfts.map((bear) => (
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
                            <p className="text-sm text-gray-400">
                                #{bear.tokenId}
                            </p>
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
                        </div>
                    </div>
                ))}
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