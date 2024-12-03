import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { BearSelector } from './BearSelector';
import { Faction, GameState } from '../types/game';
import { gameService } from '../services/gameService';
import { battleService } from '../services/battleService';

interface GameBoardProps {
    userFaction: Faction;
    nfts: any[];
    onGameStart: () => void;
}

const getFactionColor = (faction: Faction): string => {
    switch (faction) {
        case 'IRON':
            return 'border-blue-500';
        case 'GEO':
            return 'border-orange-500';
        case 'TECH':
            return 'border-gray-500';
        case 'PAW':
            return 'border-purple-500';
        default:
            return 'border-gray-300';
    }
};

export function GameBoard({ userFaction, nfts, onGameStart }: GameBoardProps) {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [selectedSquareId, setSelectedSquareId] = useState<number | null>(null);
    const [showBearSelector, setShowBearSelector] = useState(false);
    const [isBattling, setIsBattling] = useState(false);

    useEffect(() => {
        // Load or start game
        let currentGame = gameService.getGameState();
        if (!currentGame) {
            currentGame = gameService.startNewGame();
            onGameStart();
        }
        setGameState(currentGame);

        // Set up timer
        const interval = setInterval(() => {
            if (currentGame) {
                const now = Date.now();
                const remaining = currentGame.endTime - now;
                
                if (remaining <= 0) {
                    const battleResult = gameService.endGame(currentGame);
                    gameService.saveBattleResult(battleResult);
                    setGameState(null);
                    clearInterval(interval);
                } else {
                    const hours = Math.floor(remaining / (1000 * 60 * 60));
                    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                    setTimeLeft(`${hours}h ${minutes}m`);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleBattle = async (squareId: number) => {
        const ethereum = window.ethereum;
        if (!gameState || !ethereum) {
            alert('Please install MetaMask to participate in battles!');
            return;
        }

        const square = gameState.squares[squareId];
        if (!square.bear) return;

        setIsBattling(true);
        try {
            const provider = new BrowserProvider(ethereum);
            
            // Find the selected bear for the attack
            setSelectedSquareId(squareId);
            setShowBearSelector(true);

        } catch (error) {
            console.error('Battle error:', error);
            alert('Failed to initiate battle. Please try again.');
        } finally {
            setIsBattling(false);
        }
    };

    const handleSquareClick = (id: number) => {
        if (!gameState) return;
        
        const square = gameState.squares[id];
        
        // If square belongs to user's faction, do nothing
        if (square.faction === userFaction) return;
        
        // If square is occupied by another faction, initiate battle
        if (square.faction && square.faction !== userFaction) {
            handleBattle(id);
            return;
        }
        
        // If square is empty, allow placement
        setSelectedSquareId(id);
        setShowBearSelector(true);
    };

    const handleBearSelect = async (bear: any) => {
        if (!gameState || selectedSquareId === null) return;

        // Check if this is a battle
        const targetSquare = gameState.squares[selectedSquareId];
        if (targetSquare.faction && targetSquare.faction !== userFaction) {
            try {
                setIsBattling(true);
                const ethereum = window.ethereum;
                if (!ethereum) {
                    alert('Please install MetaMask to participate in battles!');
                    return;
                }

                // Check if target square has a bear
                if (!targetSquare.bear) {
                    console.error('No bear found in target square');
                    return;
                }

                const provider = new BrowserProvider(ethereum);
                
                const battleWon = await battleService.initiateBattle(
                    provider,
                    bear.tokenId,
                    targetSquare.bear.tokenId
                );

                if (battleWon) {
                    // Update square with attacking bear
                    const newGameState = {
                        ...gameState,
                        squares: gameState.squares.map((square, index) => 
                            index === selectedSquareId
                                ? { ...square, bear, faction: userFaction }
                                : square
                        ),
                        usedBears: [...gameState.usedBears, bear.tokenId]
                    };
                    gameService.updateGameState(newGameState);
                    setGameState(newGameState);
                    alert('Battle won! Square captured!');
                } else {
                    // Handle battle loss and cooldown
                    const updatedGameState = battleService.handleBattleLoss(gameState, bear.tokenId);
                    gameService.updateGameState(updatedGameState);
                    setGameState(updatedGameState);
                    alert('Battle lost! Your bear needs to rest for 2 hours.');
                }
            } catch (error) {
                console.error('Battle error:', error);
                alert('Battle failed. Please try again.');
            } finally {
                setIsBattling(false);
            }
        } else {
            // Normal placement logic
            if (gameService.isBearUsed(bear.tokenId)) {
                alert('This bear has already been placed on the board!');
                return;
            }

            const newGameState = {
                ...gameState,
                squares: gameState.squares.map((square, index) => 
                    index === selectedSquareId
                        ? { ...square, bear, faction: userFaction }
                        : square
                ),
                usedBears: [...gameState.usedBears, bear.tokenId]
            };

            gameService.updateGameState(newGameState);
            setGameState(newGameState);
        }

        setShowBearSelector(false);
        setSelectedSquareId(null);
    };

    if (!gameState) {
        return <div className="text-center text-white">Loading game state...</div>;
    }

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Timer Display */}
            <div className="px-4 py-2 bg-gray-800 rounded-lg text-white font-mono">
                Time Remaining: {timeLeft}
            </div>

            {/* Battle Status */}
            {isBattling && (
                <div className="px-4 py-2 bg-yellow-600 text-white rounded-lg animate-pulse">
                    Battle in progress...
                </div>
            )}

            {/* Game Board */}
            <div className="grid grid-cols-8 gap-1 p-4 bg-gray-800 rounded-lg shadow-lg">
                {gameState.squares.map((square) => (
                    <div
                        key={square.id}
                        onClick={() => handleSquareClick(square.id)}
                        className={`
                            w-16 h-16 bg-gray-700 rounded-sm cursor-pointer
                            hover:bg-gray-600 transition-all duration-200
                            border-2 ${square.faction ? getFactionColor(square.faction) : 'border-transparent'}
                            ${selectedSquareId === square.id ? 'ring-2 ring-yellow-400' : ''}
                            ${isBattling && selectedSquareId === square.id ? 'animate-pulse' : ''}
                            relative overflow-hidden
                        `}
                    >
                        {square.bear && (
                            <div className="w-full h-full">
                                <img 
                                    src={square.bear.metadata.image}
                                    alt={square.bear.metadata.name}
                                    className="w-full h-full object-cover rounded-sm"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                                    {square.bear.metadata.name}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Game Stats */}
            <div className="flex gap-4 justify-center text-sm">
                <div className="px-4 py-2 bg-gray-800 rounded-lg">
                    <span className="text-gray-400">Your Bears:</span>
                    <span className="ml-2 text-white">
                        {gameState.squares.filter(s => s.faction === userFaction).length}
                    </span>
                </div>
                <div className="px-4 py-2 bg-gray-800 rounded-lg">
                    <span className="text-gray-400">Territory:</span>
                    <span className="ml-2 text-white">
                        {Math.round((gameState.squares.filter(s => s.faction === userFaction).length / 64) * 100)}%
                    </span>
                </div>
            </div>

            {showBearSelector && (
                <BearSelector
                    nfts={nfts.filter(bear => !gameState.usedBears.includes(bear.tokenId))}
                    onSelect={handleBearSelect}
                    onClose={() => {
                        setShowBearSelector(false);
                        setSelectedSquareId(null);
                    }}
                    gameState={gameState}
                    isBattle={!!gameState.squares[selectedSquareId!]?.faction}
                />
            )}
        </div>
    );
} 