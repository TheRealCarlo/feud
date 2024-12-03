import { BrowserProvider, Contract } from 'ethers';
import { Faction, GameState } from '../types/game';

// Test contract address for development
const BATTLE_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Local hardhat default first address

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
            // Verify network and log details
            const network = await provider.getNetwork();
            console.log('Network details:', {
                chainId: network.chainId,
                name: network.name,
                provider: provider.constructor.name
            });

            // Get signer and address
            const signer = await provider.getSigner();
            const signerAddress = await signer.getAddress();
            console.log('Signer details:', { address: signerAddress });

            // Check contract code
            const code = await provider.getCode(BATTLE_CONTRACT_ADDRESS);
            console.log('Contract code length:', code.length);
            
            if (code === '0x' || code === '0x0') {
                console.error('No contract found at address:', BATTLE_CONTRACT_ADDRESS);
                throw new Error('Contract not deployed at specified address');
            }

            // Create contract instance
            const contract = new Contract(
                BATTLE_CONTRACT_ADDRESS,
                BATTLE_ABI,
                signer
            );

            // Log battle parameters
            console.log('Battle parameters:', {
                attacker: attackerId,
                defender: defenderId,
                contract: BATTLE_CONTRACT_ADDRESS
            });

            // Call contract with proper error handling
            try {
                const result = await contract.calculateBattleOutcome(
                    BigInt(attackerId),
                    BigInt(defenderId)
                );
                console.log('Battle result:', result);
                return result;
            } catch (contractError) {
                console.error('Contract call failed:', {
                    error: contractError,
                    method: 'calculateBattleOutcome',
                    params: [attackerId, defenderId]
                });
                throw contractError;
            }
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

            // Fallback to random outcome for development
            const fallbackResult = Math.random() > 0.5;
            console.log('Using fallback battle resolution:', fallbackResult);
            return fallbackResult;
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
        if (!gameState.cooldowns) return null;
        
        const bearCooldown = gameState.cooldowns.find(bear => bear.tokenId === bearTokenId);
        if (!bearCooldown) return null;

        const now = Date.now();
        const timeLeft = bearCooldown.timestamp - now;
        return timeLeft > 0 ? timeLeft : null;
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