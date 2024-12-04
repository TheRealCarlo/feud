export type Faction = 'IRON' | 'GEO' | 'TECH' | 'PAW';

export const FACTION_COLORS = {
    IRON: {
        primary: 'bg-blue-500',
        text: 'text-white',
        border: 'border-blue-500'
    },
    GEO: {
        primary: 'bg-orange-500',
        text: 'text-white',
        border: 'border-orange-500'
    },
    TECH: {
        primary: 'bg-gray-500',
        text: 'text-white',
        border: 'border-gray-500'
    },
    PAW: {
        primary: 'bg-purple-500',
        text: 'text-white',
        border: 'border-purple-500'
    }
} as const;

export interface PlacedBear {
    tokenId: string;
    metadata: {
        name: string;
        image: string;
    };
}

export interface Square {
    id: number;
    bear: PlacedBear | null;
    faction: Faction | null;
}

export interface GameState {
    id: string;
    squares: Square[];
    is_active: boolean;
    created_at: string;
    activePlayers?: number;
    totalBattles?: number;
    used_bears?: string[];
    end_time: number;
    cooldowns: Array<{
        tokenId: string;
        timestamp: number;
    }>;
}

export interface BearState {
    tokenId: string;
    cooldownUntil: number | null;
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

export interface GameBattle {
    id: number;
    game_id: string;
    winning_faction: Faction;
    iron_squares: number;
    geo_squares: number;
    tech_squares: number;
    paw_squares: number;
    completed_at: string;
}

export interface GameHistory {
    id: number;
    game_id: string;
    winning_faction: Faction;
    iron_squares: number;
    geo_squares: number;
    tech_squares: number;
    paw_squares: number;
    completed_at: string;
}

export type Battle = {
    timestamp: number;
    attacker: {
        tokenId: string;
        name: string;
        faction: Faction;
    };
    defender: {
        tokenId: string;
        name: string;
        faction: Faction;
    };
    winner: 'attacker' | 'defender';
    iron_squares: number;
    geo_squares: number;
    tech_squares: number;
    paw_squares: number;
}; 