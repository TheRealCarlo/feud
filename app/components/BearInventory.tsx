import { useState, useEffect } from 'react';
import { Faction } from '../types/game';

interface BearInventoryProps {
    selectedBear: string | null;
    onBearSelect: (bearId: string) => void;
    userFaction: Faction;
}

export function BearInventory({ selectedBear, onBearSelect, userFaction }: BearInventoryProps) {
    const [bears, setBears] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load bears from cache or fetch them
        const cachedBears = localStorage.getItem('brawler_bearz_cache');
        if (cachedBears) {
            setBears(JSON.parse(cachedBears).nfts);
            setLoading(false);
        }
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {bears.map((bear) => (
                <div
                    key={bear.tokenId}
                    onClick={() => onBearSelect(bear.tokenId)}
                    className={`
                        relative border-2 rounded-lg p-4 cursor-pointer
                        transition-all duration-200 hover:shadow-lg
                        ${selectedBear === bear.tokenId ? 'border-yellow-400 shadow-lg' : 'border-gray-200'}
                    `}
                >
                    <img
                        src={bear.metadata.image}
                        alt={bear.metadata.name}
                        className="w-full h-48 object-cover rounded-md"
                    />
                    <div className="mt-2">
                        <h3 className="font-bold">{bear.metadata.name}</h3>
                        <p className="text-sm text-gray-600">#{bear.tokenId}</p>
                    </div>
                    {selectedBear === bear.tokenId && (
                        <div className="absolute top-2 right-2 bg-yellow-400 rounded-full p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
} 