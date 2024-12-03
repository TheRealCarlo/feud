import { BrowserProvider, Contract } from 'ethers';
import { Faction, GameState } from '../types/game';
import { ethers } from 'ethers';

// Test contract address for development
const BATTLE_CONTRACT_ADDRESS = '0x20aCfa11998c23896A61E467cB0F605C2d46C7B7'; // Polygon Mainnet

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

const POLYGON_NETWORK = {
    chainId: '0x89', // 137 in hex
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com']
};

export const battleService = {
    async switchToPolygon() {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        try {
            // Try to switch to Polygon network
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: POLYGON_NETWORK.chainId }],
            });
        } catch (switchError: any) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [POLYGON_NETWORK],
                    });
                } catch (addError) {
                    console.error('Failed to add Polygon network:', addError);
                    throw new Error('Failed to add Polygon network to MetaMask');
                }
            } else {
                console.error('Failed to switch to Polygon network:', switchError);
                throw new Error('Failed to switch to Polygon network');
            }
        }
    },

    async initiateBattle(
        provider: BrowserProvider,
        attackerId: string,
        defenderId: string
    ): Promise<boolean> {
        try {
            // Verify network and log details
            const network = await provider.getNetwork();
            console.log('Connected to network:', network);

            if (network.chainId !== 137n) { // 137 is the chainId for Polygon Mainnet
                console.log('Wrong network, switching to Polygon...');
                await this.switchToPolygon();
                throw new Error('Please refresh the page after switching networks');
            }

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
                provider
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
            bear.timestamp > now
        );

        updatedCooldowns.push({
            tokenId: bearTokenId,
            timestamp: now + COOLDOWN_DURATION
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