'use client'

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { WalletConnect } from './components/WalletConnect'
import { Navigation } from './components/Navigation'
import { Faction } from './types/game'
import { ErrorBoundary } from './components/ErrorBoundary';
import BattleHistory from './components/BattleHistory';

// Dynamically import heavy components
const GameBoard = dynamic(() => import('./components/GameBoard'), {
    loading: () => <div className="text-white text-center p-4">Loading game board...</div>
});

const BearInventory = dynamic(() => import('./components/BearInventory'), {
    loading: () => <div className="text-white text-center p-4">Loading inventory...</div>
});

const Leaderboard = dynamic(() => import('./components/Leaderboard'), {
    loading: () => <div className="text-white text-center p-4">Loading leaderboard...</div>
});

type View = 'game' | 'inventory' | 'history' | 'leaderboard';

export default function Home() {
  const [userFaction, setUserFaction] = useState<Faction | null>(null)
  const [nfts, setNfts] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<View>('game');
  const [walletAddress, setWalletAddress] = useState<string>('');

  const handleFactionDetermined = (faction: Faction) => {
    setUserFaction(faction);
  };

  const handleGameStart = () => {
    console.log('Game started!');
    // Add any game start logic here
  };

  const renderActiveView = () => {
    if (!userFaction) return null;

    switch (activeView) {
      case 'game':
        return (
          <GameBoard
            userFaction={userFaction}
            nfts={nfts}
            onGameStart={handleGameStart}
            walletAddress={walletAddress}
          />
        );
      case 'inventory':
        return (
          <BearInventory
            nfts={nfts}
            userFaction={userFaction}
          />
        );
      case 'history':
        return (
          <BattleHistory userFaction={userFaction} />
        );
      case 'leaderboard':
        return (
          <Leaderboard />
        );
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div 
          className="min-h-screen relative"
          style={{
            backgroundImage: "url('/background.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50" />
          
          <div className="relative z-10">
            <div className="container mx-auto px-4 py-8">
              <h1 className="text-5xl font-bold text-center mb-8 text-white tracking-tight drop-shadow-lg">
                Battle for NeoCity
              </h1>

              <WalletConnect 
                onFactionDetermined={handleFactionDetermined}
                onNftsLoaded={setNfts}
                onWalletConnected={setWalletAddress}
              />

              {userFaction && (
                <div className="mt-8">
                  <Navigation
                    userFaction={userFaction}
                    activeView={activeView}
                    onViewChange={setActiveView}
                  />
                  <div className="mt-8">
                    {renderActiveView()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </ErrorBoundary>
  )
}

