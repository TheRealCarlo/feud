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

export type GameState = {
    id: string;
    squares: Square[];
    end_time: number;
    used_bears: string[];
    is_active: boolean;
    cooldowns: Array<{
        tokenId: string;
        timestamp: number;
    }>;
    created_at?: string;
};

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