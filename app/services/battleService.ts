import { BrowserProvider } from 'ethers';
import { BATTLE_CONTRACT_ADDRESS } from '../config/contracts';
import { GameState } from '../types/game';

export const battleService = {
    async initiateBattle(provider: BrowserProvider, attackerId: string, defenderId: string): Promise<boolean> {
        try {
            // Verify network and log details
            const network = await provider.getNetwork();
            console.log('Connected to network:', network);

            // Convert chainId to number for comparison
            const chainId = Number(network.chainId);
            if (chainId !== 137) { // 137 is the chainId for Polygon Mainnet
                console.log('Wrong network, switching to Polygon...');
                throw new Error('Please connect to Polygon network');
            }

            // Placeholder battle algorithm
            const randomNumber = Math.random(); // Generate number between 0 and 1
            
            // 60% chance for attacker to win
            const attackerWins = randomNumber < 0.6;
            
            console.log('🎲 Battle Result:', {
                attackerId,
                defenderId,
                randomNumber,
                winner: attackerWins ? 'Attacker' : 'Defender'
            });

            return attackerWins;

        } catch (error) {
            console.error('Battle service error:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                name: error instanceof Error ? error.name : 'UnknownError',
                stack: error instanceof Error ? error.stack : undefined,
                attackerId,
                defenderId,
                contractAddress: BATTLE_CONTRACT_ADDRESS,
                timestamp: new Date().toISOString()
            });
            
            // Even if there's an error, return a random result
            return Math.random() < 0.6;
        }
    },

    handleBattleLoss(gameState: GameState, bearId: string): GameState {
        // Create a deep copy of the game state
        const newGameState = JSON.parse(JSON.stringify(gameState));

        // Add the bear to cooldowns
        const cooldownDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const cooldownEndTime = Date.now() + cooldownDuration;

        // Initialize cooldowns array if it doesn't exist
        if (!newGameState.cooldowns) {
            newGameState.cooldowns = [];
        }

        // Add new cooldown
        newGameState.cooldowns.push({
            tokenId: bearId,
            timestamp: cooldownEndTime
        });

        // Remove the bear from used_bears if it exists there
        if (newGameState.used_bears) {
            newGameState.used_bears = newGameState.used_bears.filter((id: string) => id !== bearId);
        }

        console.log('Updated game state after battle loss:', newGameState);
        return newGameState;
    }
}; 