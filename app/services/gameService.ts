import { GameState, Square } from '../types/game';

const GAME_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const gameService = {
    createInitialSquares: (): Square[] => {
        const squares = [];
        for (let i = 0; i < 64; i++) {
            squares.push({
                id: i,
                faction: null,
                bear: null
            });
        }
        return squares;
    },

    createInitialGameState: () => {
        const now = Date.now();
        return {
            squares: Array(64).fill(null).map((_, index) => ({
                id: index,
                bear: null,
                faction: null
            })),
            end_time: now + GAME_DURATION,
            used_bears: [],
            is_active: true,
            cooldowns: []
        } as GameState;
    },

    isGameActive: (gameState: GameState): boolean => {
        if (!gameState) return false;
        return gameState.is_active && gameState.end_time > Date.now();
    },

    getTimeRemaining: (gameState: GameState): string => {
        if (!gameState) return '0h 0m';
        
        const timeLeft = gameState.end_time - Date.now();
        if (timeLeft <= 0) return '0h 0m';

        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}m`;
    }
}; 