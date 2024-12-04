import { useState } from 'react';
import { BrowserProvider } from 'ethers';
import { WalletConnect } from '../components/WalletConnect';
import { GameBoard } from '../components/GameBoard';
import { BearInventory } from '../components/BearInventory';
import { Faction } from '../types/game';

export default function Home() {
    const [provider, setProvider] = useState<BrowserProvider | null>(null);
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [userFaction, setUserFaction] = useState<Faction | null>(null);
    const [nfts, setNfts] = useState<any[]>([]);

    const handleNftsLoaded = (loadedNfts: any[]) => {
        console.log('NFTs loaded in Home:', loadedNfts);
        setNfts(loadedNfts);
    };

    return (
        <div>
            <WalletConnect
                onFactionDetermined={setUserFaction}
                onNftsLoaded={handleNftsLoaded}
                onWalletConnected={setWalletAddress}
                onProviderSet={setProvider}
            />
            
            {userFaction && walletAddress && (
                <>
                    <GameBoard
                        userFaction={userFaction}
                        nfts={nfts}
                        onGameStart={() => {}}
                        walletAddress={walletAddress}
                        provider={provider}
                    />
                    <BearInventory
                        nfts={nfts}
                        userFaction={userFaction}
                    />
                </>
            )}
        </div>
    );
} 