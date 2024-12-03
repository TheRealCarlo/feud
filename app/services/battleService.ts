import { BrowserProvider, Contract } from 'ethers';
import { Faction, GameState } from '../types/game';

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
        provider: BrowserProvider,
        attackerId: string,
        defenderId: string
    ): Promise<boolean> {
        try {
            // Verify network first
            const network = await provider.getNetwork();
            console.log('Current network:', {
                chainId: network.chainId,
                name: network.name
            });

            // Get signer
            const signer = await provider.getSigner();
            console.log('Signer address:', await signer.getAddress());

            // Create contract instance with signer
            const contract = new Contract(
                BATTLE_CONTRACT_ADDRESS,
                BATTLE_ABI,
                signer
            );

            // Verify contract exists
            const code = await provider.getCode(BATTLE_CONTRACT_ADDRESS);
            if (code === '0x') {
                throw new Error(`No contract found at ${BATTLE_CONTRACT_ADDRESS}`);
            }

            console.log('Contract instance created and verified');

            // Format token IDs
            const attacker = BigInt(attackerId);
            const defender = BigInt(defenderId);
            console.log('Battle parameters:', {
                attacker: attacker.toString(),
                defender: defender.toString(),
                contractAddress: BATTLE_CONTRACT_ADDRESS
            });

            // Attempt contract call
            console.log('Calling contract...');
            const result = await contract.calculateBattleOutcome(attacker, defender);
            console.log('Battle result:', result);
            
            return result;
        } catch (error) {
            // Enhanced error logging
            const errorDetails = {
                message: error instanceof Error ? error.message : 'Unknown error',
                name: error instanceof Error ? error.name : 'UnknownError',
                stack: error instanceof Error ? error.stack : undefined,
                attackerId,
                defenderId,
                contractAddress: BATTLE_CONTRACT_ADDRESS,
                errorObject: error,
                timestamp: new Date().toISOString()
            };
            
            console.error('Battle service error:', errorDetails);
            
            // For development/debugging
            console.error('Full error:', error);
            
            // Use fallback for now
            console.log('Using fallback battle resolution');
            return Math.random() > 0.5;
        }
    },

    handleBattleLoss(gameState: GameState, bearTokenId: string): GameState {
        const now = Date.now();
        const updatedCooldowns = gameState.cooldowns.filter(bear => 
            bear.cooldownUntil === null || bear.cooldownUntil > now
        );

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