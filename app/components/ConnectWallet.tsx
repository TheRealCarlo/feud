'use client';

import { useWallet } from '../hooks/useWallet';
import { BrowserProvider } from 'ethers';

interface ConnectWalletProps {
    onConnect: (provider: BrowserProvider) => void;
}

export default function ConnectWallet({ onConnect }: ConnectWalletProps) {
    const { 
        isConnecting, 
        error, 
        isMetaMaskInstalled,
        connect 
    } = useWallet();

    const handleConnect = async () => {
        const provider = await connect();
        if (provider) {
            onConnect(provider);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={handleConnect}
                disabled={isConnecting || !isMetaMaskInstalled}
                className={`
                    px-6 py-3 rounded-lg font-semibold text-white
                    ${(isConnecting || !isMetaMaskInstalled)
                        ? 'bg-gray-500 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'}
                    transition-colors duration-200
                `}
            >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            
            {error && (
                <div className="text-red-500 text-sm mt-2 text-center max-w-md">
                    {error}
                </div>
            )}
            
            {!isMetaMaskInstalled && (
                <div className="text-yellow-500 text-sm text-center max-w-md mt-2">
                    MetaMask is not installed. Please{' '}
                    <a 
                        href="https://metamask.io/download/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-yellow-600"
                    >
                        install MetaMask
                    </a>
                    {' '}to connect your wallet.
                </div>
            )}
        </div>
    );
} 