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

    async createNewGame(walletAddress: string) {
        try {
            console.log('Creating a new game for wallet:', walletAddress);

            const newGameData = {
                wallet_address: walletAddress,
                used_bears: [],
                squares: Array(64).fill(null).map((_, index) => ({
                    id: index,
                    bear: null,
                    faction: null
                })),
                end_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
                is_active: true
            };

            const { data: newGame, error: createError } = await supabase
                .from('games')
                .insert([newGameData])
                .select()
                .single();

            if (createError) {
                console.error('Error creating new game:', createError);
                throw new Error('Failed to create new game');
            }

            console.log('New game created successfully:', newGame);
            return newGame;
        } catch (error) {
            console.error('Error in createNewGame:', error);
            throw error;
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

    async checkAndRecordExpiredGames() {
        try {
            const currentTime = Math.floor(Date.now() / 1000);

            // Fetch active games that have expired
            const { data: expiredGames, error: fetchError } = await supabase
                .from('games')
                .select('*')
                .eq('is_active', true)
                .lt('end_time', currentTime);

            if (fetchError) {
                console.error('Error fetching expired games:', fetchError);
                return;
            }

            for (const game of expiredGames) {
                // Calculate results and store in game_history
                const factionCounts = this.calculateFactionCounts(game.squares);
                const winningFaction = this.determineWinningFaction(factionCounts);

                const { error: historyError } = await supabase
                    .from('game_history')
                    .insert({
                        game_id: game.id,
                        winning_faction: winningFaction,
                        iron_squares: factionCounts.IRON,
                        geo_squares: factionCounts.GEO,
                        tech_squares: factionCounts.TECH,
                        paw_squares: factionCounts.PAW,
                        completed_at: new Date().toISOString()
                    });

                if (historyError) {
                    console.error('Error storing game history:', historyError);
                    continue;
                }

                // Deactivate the game
                const { error: deactivateError } = await supabase
                    .from('games')
                    .update({ is_active: false })
                    .eq('id', game.id);

                if (deactivateError) {
                    console.error('Error deactivating game:', deactivateError);
                }
            }
        } catch (error) {
            console.error('Error in checkAndRecordExpiredGames:', error);
        }
    }

    calculateFactionCounts(squares: Square[]) {
        const factionCounts = { IRON: 0, GEO: 0, TECH: 0, PAW: 0 };
        squares.forEach(square => {
            if (square.faction) {
                factionCounts[square.faction]++;
            }
        });
        return factionCounts;
    }

    determineWinningFaction(factionCounts: Record<Faction, number>) {
        let winningFaction: Faction | null = null;
        let maxCount = 0;
        for (const [faction, count] of Object.entries(factionCounts)) {
            if (count > maxCount) {
                maxCount = count;
                winningFaction = faction as Faction;
            }
        }
        return winningFaction;
    }
}

export const gameService = GameService.getInstance(); 