import { supabase } from '../lib/supabase';
import { Faction, GameState } from '../types/game';

interface GameData {
    id?: string;
    is_active: boolean;
    squares: Array<{
        id: number;
        bear: null;
        faction: null;
    }>;
    created_at: string;
    end_time: number;
    used_bears: string[];
}

interface GameHistory {
    id: number;
    game_id: string;
    winning_faction: Faction;
    iron_squares: number;
    geo_squares: number;
    tech_squares: number;
    paw_squares: number;
    completed_at: string;
}

export class GameService {
    private static instance: GameService;
    private isCreatingGame: boolean = false;

    private constructor() {}

    public static getInstance(): GameService {
        if (!GameService.instance) {
            GameService.instance = new GameService();
        }
        return GameService.instance;
    }

    private calculateEndTime(startDate: Date): number {
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 24);
        return Math.floor(endDate.getTime() / 1000);
    }

    async createNewGame(endTime?: number): Promise<GameState | null> {
        if (this.isCreatingGame) {
            console.log('Game creation already in progress');
            return null;
        }

        this.isCreatingGame = true;

        try {
            const { data: existingGames, error: checkError } = await supabase
                .from('games')
                .select('*')
                .eq('is_active', true)
                .limit(1);

            if (checkError) {
                console.error('Error checking existing games:', checkError);
                return null;
            }

            if (existingGames && existingGames.length > 0) {
                console.log('Active game already exists');
                return existingGames[0] as GameState;
            }

            const creationDate = new Date();
            const gameData: GameData = {
                is_active: true,
                squares: Array(64).fill(null).map((_, index) => ({
                    id: index,
                    bear: null,
                    faction: null
                })),
                created_at: creationDate.toISOString(),
                end_time: endTime || this.calculateEndTime(creationDate),
                used_bears: []
            };

            console.log('Attempting to create new game with data:', gameData);

            const { data, error: insertError } = await supabase
                .from('games')
                .insert(gameData)
                .select()
                .single();

            if (insertError) {
                console.error('Detailed Supabase error:', {
                    message: insertError.message,
                    details: insertError.details,
                    hint: insertError.hint,
                    code: insertError.code
                });
                throw new Error(`Failed to create game: ${insertError.message}`);
            }

            if (!data) {
                throw new Error('No data returned from game creation');
            }

            console.log('New game created successfully:', data.id);
            return data as GameState;

        } catch (error) {
            if (error instanceof Error) {
                console.error('Error creating new game:', {
                    message: error.message,
                    stack: error.stack
                });
            } else {
                console.error('Unknown error creating new game:', error);
            }
            throw error;
        } finally {
            this.isCreatingGame = false;
        }
    }

    async checkGameCompletion(gameState: GameState): Promise<void> {
        try {
            const gameEndTime = gameState.end_time * 1000; // Convert to milliseconds
            const currentTime = new Date().getTime();

            if (currentTime >= gameEndTime) {
                const factionCounts: Record<Faction, number> = {
                    IRON: 0,
                    GEO: 0,
                    TECH: 0,
                    PAW: 0
                };

                gameState.squares.forEach(square => {
                    if (square.faction) {
                        factionCounts[square.faction]++;
                    }
                });

                let winningFaction: Faction | null = null;
                let maxCount = 0;

                Object.entries(factionCounts).forEach(([faction, count]) => {
                    if (count > maxCount) {
                        maxCount = count;
                        winningFaction = faction as Faction;
                    }
                });

                if (winningFaction && gameState.id) {
                    await this.recordGameResult(gameState.id, winningFaction, factionCounts);

                    await supabase
                        .from('games')
                        .update({ is_active: false })
                        .eq('id', gameState.id);

                    await this.createNewGame();

                    console.log('Game completed:', {
                        winner: winningFaction,
                        counts: factionCounts
                    });
                }
            }
        } catch (error) {
            console.error('Error checking game completion:', error);
        }
    }

    private async recordGameResult(
        gameId: string,
        winningFaction: Faction,
        factionCounts: Record<Faction, number>
    ): Promise<void> {
        try {
            await supabase
                .from('game_history')
                .insert({
                    game_id: gameId,
                    winning_faction: winningFaction,
                    iron_squares: factionCounts.IRON,
                    geo_squares: factionCounts.GEO,
                    tech_squares: factionCounts.TECH,
                    paw_squares: factionCounts.PAW,
                    completed_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Error recording game result:', error);
        }
    }

    async getGameHistory(): Promise<GameHistory[]> {
        try {
            const { data, error } = await supabase
                .from('game_history')
                .select('*')
                .order('completed_at', { ascending: false });

            if (error) {
                console.error('Error fetching game history:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error fetching game history:', error);
            return [];
        }
    }

    async updateCooldowns(tokenId: string, walletAddress: string) {
        try {
            const { error } = await supabase
                .from('cooldowns')
                .update({ end_time: Date.now() + 3600000 }) // 1 hour cooldown
                .eq('token_id', tokenId)
                .eq('wallet_address', walletAddress);

            if (error) {
                throw new Error(`Failed to update cooldowns: ${error.message}`);
            }
        } catch (error) {
            console.error('Error updating cooldowns:', error);
            throw error;
        }
    }
}

export const gameService = GameService.getInstance(); 