export type Faction = 'IRON' | 'GEO' | 'TECH' | 'PAW';

export interface BearState {
    tokenId: string;
    cooldownUntil: number | null;  // Timestamp when cooldown ends
}

export interface GameState {
    isActive: boolean;
    startTime: number;
    endTime: number;
    squares: Square[];
    usedBears: string[];
    cooldowns: BearState[];  // Track bear cooldowns
}

export interface Square {
    id: number;
    bear: {
        tokenId: string;
        metadata: {
            name: string;
            image: string;
        };
    } | null;
    faction: Faction | null;
}

export interface BattleResult {
    id: string;
    startTime: number;
    endTime: number;
    winningFaction: Faction;
    scores: {
        [key in Faction]: number;
    };
} 