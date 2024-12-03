import { GameState, Square, Battle } from '../types/game';

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

    createInitialGameState: (): Omit<GameState, 'id'> => {
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
        };
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
    },

    getBattleHistory: (): Battle[] => {
        try {
            const storedHistory = localStorage.getItem('battleHistory');
            if (storedHistory) {
                return JSON.parse(storedHistory);
            }
        } catch (err) {
            console.error('Error reading battle history:', err);
        }
        return [];
    },

    addBattleToHistory: (battle: Battle): void => {
        try {
            const history = gameService.getBattleHistory();
            history.unshift(battle);
            const trimmedHistory = history.slice(0, 10);
            localStorage.setItem('battleHistory', JSON.stringify(trimmedHistory));
        } catch (err) {
            console.error('Error saving battle history:', err);
        }
    }
}; 