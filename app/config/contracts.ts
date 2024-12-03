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

// Update your battleService to use these configurations
export const getBattleContract = async (provider: any) => {
    // Check if we're on the correct network
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    if (chainId.toString() !== NETWORKS.polygon.chainId) {
        throw new Error('Please switch to Polygon network to interact with the Battle contract');
    }

    return new Contract(
        CONTRACTS.BATTLE.address,
        BATTLE_CONTRACT_ABI,
        provider
    );
};

// Similarly for the Bears contract
export const getBearsContract = async (provider: any) => {
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    if (chainId.toString() !== NETWORKS.ethereum.chainId) {
        throw new Error('Please switch to Ethereum Mainnet to interact with the Bears contract');
    }

    return new Contract(
        CONTRACTS.BEARS.address,
        BEARS_CONTRACT_ABI,
        provider
    );
}; 