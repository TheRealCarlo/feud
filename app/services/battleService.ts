import { ethers } from 'ethers';
import { Faction, GameState, BearState } from '../types/game';

const BATTLE_CONTRACT_ADDRESS = '0x20aCfa11998c23896A61E467cB0F605C2d46C7B7';

const BATTLE_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "attackerId", "type": "uint256"},
            {"internalType": "uint256", "name": "defenderId", "type": "uint256"}
        ],
        "name": "calculateBattleOutcome",
        "outputs": [{"internalType": "bool", "name": "attackerWins", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
];

const COOLDOWN_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export const battleService = {
    async initiateBattle(
        provider: ethers.providers.Web3Provider,
        attackerId: string,
        defenderId: string
    ): Promise<boolean> {
        try {
            // Log initial parameters
            console.log('Battle initialization parameters:', {
                attackerId,
                defenderId,
                contractAddress: BATTLE_CONTRACT_ADDRESS,
                providerNetwork: await provider.getNetwork()
            });

            // Verify provider and network
            const network = await provider.getNetwork();
            console.log('Current network:', network);

            // Create contract instance
            const contract = new ethers.Contract(
                BATTLE_CONTRACT_ADDRESS,
                BATTLE_ABI,
                provider
            );
            console.log('Contract instance created');

            // Format token IDs
            const attacker = ethers.BigNumber.from(attackerId);
            const defender = ethers.BigNumber.from(defenderId);
            console.log('Formatted IDs:', {
                attacker: attacker.toString(),
                defender: defender.toString()
            });

            // Attempt contract call
            console.log('Attempting contract call...');
            const result = await contract.calculateBattleOutcome(attacker, defender, {
                gasLimit: 500000 // Add explicit gas limit
            });
            console.log('Battle result received:', result);
            
            return result;
        } catch (error: any) {
            // Detailed error logging
            console.error('Battle service detailed error:', {
                errorMessage: error.message,
                errorCode: error.code,
                errorName: error.name,
                errorStack: error.stack,
                attackerId,
                defenderId,
                contractAddress: BATTLE_CONTRACT_ADDRESS
            });

            // Check for specific error types
            if (error.code === 'CALL_EXCEPTION') {
                console.log('Contract call failed - using fallback');
            } else if (error.code === 'NETWORK_ERROR') {
                console.log('Network error - using fallback');
            } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
                console.log('Gas estimation failed - using fallback');
            }
            
            // Fallback battle resolution
            const fallbackResult = Math.random() > 0.5;
            console.log('Using fallback battle resolution:', fallbackResult);
            return fallbackResult;
        }
    },

    handleBattleLoss(gameState: GameState, bearTokenId: string): GameState {
        const now = Date.now();
        const updatedCooldowns = gameState.cooldowns.filter(bear => 
            // Remove expired cooldowns
            bear.cooldownUntil === null || bear.cooldownUntil > now
        );

        // Add new cooldown for the losing bear
        updatedCooldowns.push({
            tokenId: bearTokenId,
            cooldownUntil: now + COOLDOWN_DURATION
        });

        return {
            ...gameState,
            cooldowns: updatedCooldowns
        };
    },

    getBearCooldown(gameState: GameState, bearTokenId: string): number | null {
        const bearCooldown = gameState.cooldowns.find(bear => bear.tokenId === bearTokenId);
        if (!bearCooldown) return null;

        const now = Date.now();
        if (bearCooldown.cooldownUntil && bearCooldown.cooldownUntil > now) {
            return bearCooldown.cooldownUntil;
        }

        return null;
    },

    formatCooldownTime(cooldownUntil: number): string {
        const now = Date.now();
        const remaining = cooldownUntil - now;
        
        if (remaining <= 0) return '';
        
        const minutes = Math.floor(remaining / (1000 * 60));
        if (minutes < 60) {
            return `${minutes}m`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
}; 