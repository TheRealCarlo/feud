import { BrowserProvider } from 'ethers';
import { BATTLE_CONTRACT_ADDRESS } from '../config/contracts';
import { GameState } from '../types/game';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { cleanExpiredCooldowns, isOnCooldown, getCooldownDetails } from '../utils/cooldownUtils';

interface BearStats {
    atk: number;
    def: number;
    lck: number;
}

// Default stats for bears when API fails
const DEFAULT_BEAR_STATS: BearStats = {
    atk: 50,  // Base attack
    def: 40,  // Base defense
    lck: 10   // Base luck
};

interface BattleRecord {
    id?: string;
    attacker_id: string;
    attacker_token_id: string;
    attacker_name: string;
    attacker_image: string;
    attacker_faction: string;
    defender_id: string;
    defender_token_id: string;
    defender_name: string;
    defender_image: string;
    defender_faction: string;
    winner: 'attacker' | 'defender';
    timestamp: string;
}

export class BattleService {
    // Add static instance
    private static instance: BattleService;

    // Private constructor to prevent direct instantiation
    private constructor() {}

    // Static method to get instance
    public static getInstance(): BattleService {
        if (!BattleService.instance) {
            BattleService.instance = new BattleService();
        }
        return BattleService.instance;
    }

    async fetchBearStats(tokenIds: string[]): Promise<Record<string, BearStats>> {
        console.log('Fetching stats for bears:', tokenIds);
        try {
            const normalizedIds = tokenIds.map(id => String(parseInt(id))).join(',');
            const url = `https://www.brawlerbearz.club/api/battle/statsBatch?tokenIds=${normalizedIds}`;
            console.log('Fetching from URL:', url);

            try {
                const response = await fetch(url);
                const data = await response.json();
                console.log('API Response:', data);

                const stats: Record<string, BearStats> = {};
                
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        if (item.tokenId && item.stats) {
                            stats[String(parseInt(item.tokenId))] = {
                                atk: item.stats.atk || DEFAULT_BEAR_STATS.atk,
                                def: item.stats.def || DEFAULT_BEAR_STATS.def,
                                lck: item.stats.lck || DEFAULT_BEAR_STATS.lck
                            };
                        }
                    });
                }

                // For any bears without stats, use default stats
                tokenIds.forEach(id => {
                    const normalizedId = String(parseInt(id));
                    if (!stats[normalizedId]) {
                        console.log(`Using default stats for bear ${normalizedId}`);
                        stats[normalizedId] = {
                            ...DEFAULT_BEAR_STATS,
                            // Add some randomization to make battles interesting
                            atk: DEFAULT_BEAR_STATS.atk + Math.floor(Math.random() * 20),
                            def: DEFAULT_BEAR_STATS.def + Math.floor(Math.random() * 20),
                            lck: DEFAULT_BEAR_STATS.lck + Math.floor(Math.random() * 10)
                        };
                    }
                });

                console.log('Final bear stats:', stats);
                return stats;
            } catch (error) {
                console.warn('API call failed, using default stats for all bears');
                // If API fails, use default stats for all bears
                return tokenIds.reduce((acc, id) => {
                    acc[String(parseInt(id))] = {
                        ...DEFAULT_BEAR_STATS,
                        // Add some randomization
                        atk: DEFAULT_BEAR_STATS.atk + Math.floor(Math.random() * 20),
                        def: DEFAULT_BEAR_STATS.def + Math.floor(Math.random() * 20),
                        lck: DEFAULT_BEAR_STATS.lck + Math.floor(Math.random() * 10)
                    };
                    return acc;
                }, {} as Record<string, BearStats>);
            }
        } catch (error) {
            console.error('Error in fetchBearStats:', error);
            throw error;
        }
    }

    async initiateBattle(
        provider: BrowserProvider, 
        attackerId: string, 
        defenderId: string
    ): Promise<boolean> {
        console.log('Initiating battle:', { attackerId, defenderId });
        try {
            const stats = await this.fetchBearStats([attackerId, defenderId]);
            
            const attacker = stats[attackerId];
            const defender = stats[defenderId];
            
            console.log('Battle stats:', {
                attacker: { id: attackerId, ...attacker },
                defender: { id: defenderId, ...defender }
            });

            // Add luck bonus to defender
            const defenderTotalPower = defender.def + defender.lck;
            const attackerPower = attacker.atk;
            
            console.log('Power calculations:', {
                attackerPower,
                defenderPower: defenderTotalPower,
                defenderBreakdown: `DEF(${defender.def}) + LCK(${defender.lck})`
            });

            // Calculate win probability
            const totalPower = attackerPower + defenderTotalPower;
            const attackerWinProbability = attackerPower / totalPower;
            
            // Determine outcome
            const randomRoll = Math.random();
            const attackerWins = randomRoll < attackerWinProbability;

            console.log('Battle outcome:', {
                randomRoll,
                attackerWinProbability,
                attackerWins
            });

            // Show battle outcome toast with detailed stats
            toast(
                attackerWins 
                    ? `⚔️ Attacker Wins!\nATK(${attackerPower}) vs DEF(${defender.def}) + LCK(${defender.lck})`
                    : `🛡️ Defender Holds!\nDEF(${defender.def}) + LCK(${defender.lck}) vs ATK(${attackerPower})`,
                { duration: 4000 }
            );

            return attackerWins;
        } catch (error) {
            console.error('Battle service error:', error);
            toast.error('Battle failed! Using default stats.');
            return Math.random() < 0.5; // 50/50 chance if everything fails
        }
    }

    async recordBattle(
        attacker: any,
        defender: any,
        winnerTokenId: string
    ): Promise<void> {
        try {
            // Validate input data
            if (!attacker?.tokenId || !defender?.tokenId) {
                throw new Error('Invalid battle participants');
            }

            // Create the battle record
            const battleRecord: BattleRecord = {
                attacker_id: String(attacker.tokenId),
                attacker_token_id: String(attacker.tokenId),
                attacker_name: attacker.metadata?.name || `Bear #${attacker.tokenId}`,
                attacker_image: attacker.metadata?.image || '',
                attacker_faction: attacker.metadata?.faction || '',
                defender_id: String(defender.tokenId),
                defender_token_id: String(defender.tokenId),
                defender_name: defender.metadata?.name || `Bear #${defender.tokenId}`,
                defender_image: defender.metadata?.image || '',
                defender_faction: defender.metadata?.faction || '',
                winner: winnerTokenId === String(attacker.tokenId) ? 'attacker' : 'defender',
                timestamp: new Date().toISOString()
            };

            // Insert the battle record
            const { data, error: insertError } = await supabase
                .from('battles')
                .insert(battleRecord)
                .select('id')
                .single();

            if (insertError) {
                console.error('Battle insert error:', insertError);
                throw new Error(`Failed to record battle: ${insertError.message}`);
            }

            if (!data?.id) {
                throw new Error('Battle record not created');
            }

            console.log('Battle recorded successfully:', data.id);

            // Update bear records
            const loserId = winnerTokenId === attacker.tokenId ? defender.tokenId : attacker.tokenId;
            
            try {
                await supabase.rpc('update_bear_records', {
                    winner_id: String(winnerTokenId),
                    loser_id: String(loserId)
                });
            } catch (error) {
                console.error('Failed to update bear records:', error);
            }

            // Update leaderboard
            try {
                await supabase.rpc('update_leaderboard');
            } catch (error) {
                console.error('Failed to update leaderboard:', error);
            }

            // Update cooldowns for both bears
            await Promise.all([
                this.#updateCooldown(attacker.tokenId),
                this.#updateCooldown(defender.tokenId)
            ]);

        } catch (error) {
            console.error('Error recording battle:', error);
            throw error;
        }
    }

    #updateCooldown = async (tokenId: string): Promise<void> => {
        try {
            const currentTime = Math.floor(Date.now() / 1000);
            const cooldownPeriod = 3600; // 1 hour cooldown

            const { error } = await supabase
                .from('cooldowns')
                .upsert({
                    token_id: String(tokenId),
                    end_time: currentTime + cooldownPeriod
                }, {
                    onConflict: 'token_id'
                });

            if (error) {
                console.error('Failed to update cooldown:', error);
            }
        } catch (error) {
            console.error('Error updating cooldown:', error);
        }
    };
}

// Export a default instance
export const battleService = BattleService.getInstance(); 