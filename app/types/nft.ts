interface BrawlerStats {
    strength: number;
    defense: number;
    speed: number;
    health: number;
    // Add more stats as needed
}

export interface BrawlerBearz {
    tokenId: string;
    metadata: {
        name: string;
        description: string;
        image: string;
        attributes: {
            trait_type: string;
            value: string | number;
        }[];
        stats?: BrawlerStats; // You might need to derive these from attributes
    };
} 