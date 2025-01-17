import { useEffect, useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { Faction, FACTION_COLORS } from '../types/game';

const BRAWLER_BEARZ_ADDRESS = "0x556697Ca91476B811f37A851dD2e53ae4c6024dB";
const FACTION_CONTRACT_ADDRESS = "0x5e2454f33c3da3aa30eabc502255f66a6d72adc8";
const OPENSEA_API_KEY = ''; // We can work without an API key for now
const OPENSEA_API_URL = 'https://api.opensea.io/api/v1';

// Updated ABI to include getFaction function
const FACTION_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "_address", "type": "address"}],
        "name": "getFaction",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

const getFactionName = (factionId: number): Faction => {
    switch (factionId) {
        case 1: return 'IRON';  // IronBearz
        case 2: return 'GEO';   // Geoscapez
        case 3: return 'PAW';   // Pawpunkz
        case 4: return 'TECH';  // Techheadz
        default: throw new Error('Invalid faction ID');
    }
};

// Cache helper functions
const CACHE_KEY = 'brawler_bearz_cache';
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

interface CacheData {
    nfts: any[];
    timestamp: number;
}

const getFromCache = (): CacheData | null => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CacheData = JSON.parse(cached);
    const now = Date.now();
    
    if (now - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
    
    return data;
};

const setToCache = (nfts: any[]) => {
    const cacheData: CacheData = {
        nfts,
        timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
};

const getFactionColor = (faction: Faction): string => {
    return `${FACTION_COLORS[faction].primary} ${FACTION_COLORS[faction].text}`;
};

export function WalletConnect({ 
    onFactionDetermined, 
    onNftsLoaded,
    onWalletConnected,
    onProviderSet 
}: { 
    onFactionDetermined: (faction: Faction) => void;
    onNftsLoaded: (nfts: any[]) => void;
    onWalletConnected: (address: string) => void;
    onProviderSet?: (provider: BrowserProvider) => void;
}) {
    const [account, setAccount] = useState<string>('');
    const [nfts, setNfts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [connectingWallet, setConnectingWallet] = useState(false);
    const [userFaction, setUserFaction] = useState<Faction | null>(null);

    const checkFaction = async (provider: BrowserProvider, address: string) => {
        try {
            console.log('Checking faction for address:', address);

            const factionContract = new Contract(
                FACTION_CONTRACT_ADDRESS,
                FACTION_ABI,
                provider
            );

            const factionId = await factionContract.getFaction(address);
            console.log('Faction ID:', factionId.toString());

            const faction = getFactionName(Number(factionId));
            console.log('Determined faction:', faction);

            setUserFaction(faction);
            onFactionDetermined(faction);
            return faction;

        } catch (error) {
            console.error('Error checking faction:', error);
            alert('Error checking faction. Please try again.');
            return null;
        }
    };

    const fetchNFTs = async (provider: BrowserProvider, address: string) => {
        try {
            setLoading(true);
            console.log('Starting NFT fetch process for address:', address);

            // Create contract instance
            const brawlerBearzContract = new Contract(
                BRAWLER_BEARZ_ADDRESS,
                [
                    "function balanceOf(address owner) view returns (uint256)",
                    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
                    "function tokenURI(uint256 tokenId) view returns (string)"
                ],
                provider
            );

            // Get NFT balance
            const balance = await brawlerBearzContract.balanceOf(address);
            const balanceNumber = Number(balance);
            console.log('NFT balance:', balanceNumber);

            if (balanceNumber === 0) {
                console.log('No NFTs found');
                onNftsLoaded([]);
                return;
            }

            // Fetch each NFT
            const nftPromises = [];
            for (let i = 0; i < balanceNumber; i++) {
                const tokenId = await brawlerBearzContract.tokenOfOwnerByIndex(address, i);
                console.log(`Found token ID: ${tokenId}`);
                
                const tokenUri = await brawlerBearzContract.tokenURI(tokenId);
                const uri = tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                console.log(`Fetching metadata from: ${uri}`);

                nftPromises.push(
                    fetch(uri)
                        .then(res => res.json())
                        .then(metadata => {
                            // Process IPFS image URL if needed
                            const imageUrl = metadata.image?.startsWith('ipfs://')
                                ? metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                                : metadata.image;

                            // Get faction from metadata
                            const faction = metadata.attributes?.find((attr: any) => 
                                attr.trait_type.toLowerCase() === 'faction'
                            )?.value || 'UNKNOWN';

                            return {
                                tokenId: tokenId.toString(),
                                metadata: {
                                    name: metadata.name || `Brawler Bear #${tokenId}`,
                                    image: imageUrl,
                                    faction: faction.toUpperCase()
                                }
                            };
                        })
                        .catch(error => {
                            console.error(`Error processing NFT ${tokenId}:`, error);
                            return null;
                        })
                );
            }

            // Wait for all NFTs to be processed
            const nftData = (await Promise.all(nftPromises)).filter(nft => nft !== null);
            console.log('Successfully fetched NFTs:', nftData);

            // Update state with fetched NFTs
            onNftsLoaded(nftData);
            setToCache(nftData);

        } catch (error) {
            console.error('Error fetching NFTs:', error);
            alert('Error fetching your Brawler Bearz. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const connectWallet = async () => {
        setConnectingWallet(true);
        try {
            if (typeof window.ethereum !== 'undefined') {
                const provider = new BrowserProvider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                const signer = await provider.getSigner();
                const address = await signer.getAddress();
                
                console.log('Connected wallet address:', address);
                
                // Check network before proceeding
                const networkOk = await checkNetwork(provider);
                if (!networkOk) return;
                
                // Only call if provided
                onProviderSet?.(provider);
                
                // Check faction using getFaction function
                const faction = await checkFaction(provider, address);
                
                if (faction) {
                    setAccount(address);
                    onWalletConnected(address);
                    // Fetch NFTs after successful connection
                    await fetchNFTs(provider, address);
                }
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Error connecting wallet. Please try again.');
        } finally {
            setConnectingWallet(false);
        }
    };

    const disconnectWallet = async () => {
        try {
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem('brawler_bearz_cache');
            setAccount('');
            setNfts([]);
            setUserFaction(null);
            onFactionDetermined(null as any);
            console.log('Wallet disconnected');
        } catch (error) {
            console.error('Error disconnecting wallet:', error);
        }
    };

    // Update network check for ethers v6
    const checkNetwork = async (provider: BrowserProvider) => {
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        
        if (chainId !== 1) { // Ethereum Mainnet
            try {
                const ethereum = window.ethereum;
                if (!ethereum) {
                    throw new Error('MetaMask not installed');
                }
                
                await ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x1' }],
                });
                return true;
            } catch (error) {
                console.error('Failed to switch network:', error);
                alert('Please switch to Ethereum Mainnet network in your wallet');
                return false;
            }
        }
        return true;
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {!account ? (
                <button
                    onClick={connectWallet}
                    disabled={connectingWallet}
                    className={`
                        rounded-lg bg-green-600 text-white px-8 py-3
                        hover:bg-green-700 transition-all duration-300
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center gap-2 font-semibold text-lg
                        shadow-lg hover:shadow-green-500/20
                    `}
                >
                    {connectingWallet ? (
                        <>
                            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"/>
                            Connecting...
                        </>
                    ) : (
                        <>
                            <svg 
                                className="w-5 h-5" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" 
                                />
                            </svg>
                            Connect Wallet
                        </>
                    )}
                </button>
            ) : (
                <div className="flex flex-col items-center gap-4 w-full">
                    <div className="flex items-center justify-between w-full max-w-md px-6 py-3 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
                            <p className="font-mono text-gray-200">{account.slice(0, 6)}...{account.slice(-4)}</p>
                            {userFaction && (
                                <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${getFactionColor(userFaction)}`}>
                                    {userFaction}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={disconnectWallet}
                            className="text-sm text-red-400 hover:text-red-300 transition-colors duration-200 flex items-center gap-1"
                        >
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-4 w-4" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                                />
                            </svg>
                            Disconnect
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
} 