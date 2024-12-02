'use client'

import { useState } from 'react';
import { WalletConnect } from './components/WalletConnect'
import { GameBoard } from './components/GameBoard'
import { Navigation } from './components/Navigation'
import { BearInventory } from './components/BearInventory'
import { BattleHistory } from './components/BattleHistory'
import { Faction } from './types/game'

type View = 'game' | 'inventory' | 'history'

export default function Home() {
  const [userFaction, setUserFaction] = useState<Faction | null>(null)
  const [nfts, setNfts] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<View>('game');

  const handleFactionDetermined = (faction: Faction) => {
    setUserFaction(faction);
  };

  const handleGameStart = () => {
    console.log('Game started!');
    // Add any game start logic here
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'game':
        return (
          <GameBoard
            userFaction={userFaction!}
            nfts={nfts}
            onGameStart={handleGameStart}
          />
        );
      case 'inventory':
        return (
          <BearInventory
            nfts={nfts}
            userFaction={userFaction!}
          />
        );
      case 'history':
        return (
          <BattleHistory
            userFaction={userFaction!}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: "url('/background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-5xl font-bold text-center mb-8 text-white tracking-tight drop-shadow-lg">
            Brawler Bearz Battle
          </h1>

          <WalletConnect 
            onFactionDetermined={handleFactionDetermined}
            onNftsLoaded={setNfts}
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
  )
}

