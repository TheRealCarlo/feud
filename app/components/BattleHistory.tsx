import { useEffect, useState } from 'react';
import { gameService } from '../services/gameService';
import { Battle } from '../types/game';

export default function BattleHistory() {
    const [battles, setBattles] = useState<Battle[]>([]);

    useEffect(() => {
        const history = gameService.getBattleHistory();
        setBattles(history);
    }, []);

    if (battles.length === 0) {
        return (
            <div className="p-4 text-gray-400 text-center">
                No battles yet
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {battles.map((battle, index) => (
                <div 
                    key={battle.timestamp} 
                    className="bg-gray-800 p-4 rounded-lg shadow"
                >
                    <div className="flex justify-between text-sm text-gray-400">
                        <span>
                            {new Date(battle.timestamp).toLocaleTimeString()}
                        </span>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                        <div className="flex-1">
                            <div className="text-white">{battle.attacker.name}</div>
                            <div className="text-sm text-gray-400">
                                {battle.attacker.faction}
                            </div>
                        </div>
                        <div className="mx-4 text-gray-400">vs</div>
                        <div className="flex-1 text-right">
                            <div className="text-white">{battle.defender.name}</div>
                            <div className="text-sm text-gray-400">
                                {battle.defender.faction}
                            </div>
                        </div>
                    </div>
                    <div className="mt-2 text-center text-sm">
                        <span className={`font-bold ${
                            battle.winner === 'attacker' ? 'text-green-500' : 'text-red-500'
                        }`}>
                            {battle.winner === 'attacker' ? 'Victory' : 'Defeat'}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
} 