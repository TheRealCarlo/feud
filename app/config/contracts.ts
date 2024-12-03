import { Contract } from 'ethers';

// Network configurations
export const NETWORKS = {
    ethereum: {
        chainId: '0x1', // Ethereum Mainnet
        chainName: 'Ethereum Mainnet',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
        },
        rpcUrls: ['https://eth-mainnet.g.alchemy.com/v2/your-api-key'],
        blockExplorerUrls: ['https://etherscan.io']
    },
    polygon: {
        chainId: '0x89', // Polygon Mainnet
        chainName: 'Polygon Mainnet',
        nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18
        },
        rpcUrls: ['https://polygon-rpc.com'],
        blockExplorerUrls: ['https://polygonscan.com']
    }
} as const;

// Contract Addresses
export const CONTRACTS = {
    BEARS: {
        address: '0x556697Ca91476B811f37A851dD2e53ae4c6024dB',
        network: NETWORKS.ethereum
    },
    BATTLE: {
        address: '0x20aCfa11998c23896A61E467cB0F605C2d46C7B7',
        network: NETWORKS.polygon
    }
} as const;

// For now, we'll just export the addresses since we're using the placeholder battle algorithm
export const { address: BATTLE_CONTRACT_ADDRESS } = CONTRACTS.BATTLE;
export const { address: BEARS_CONTRACT_ADDRESS } = CONTRACTS.BEARS; 