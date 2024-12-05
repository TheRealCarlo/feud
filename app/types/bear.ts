export enum BearStatus {
    READY = 'ready',
    COOLDOWN = 'cooldown',
    IN_BATTLE = 'battle'
}

export interface Bear {
    tokenId: string;
    metadata: {
        name: string;
        image: string;
        faction: Faction;
    };
}

export interface BearState {
    status: BearStatus;
    text: string;
    color: string;
} 