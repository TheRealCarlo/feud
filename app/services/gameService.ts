import { GameState, BattleResult, Faction } from '../types/game';

const GAME_STATE_KEY = 'current_game_state';
const BATTLE_HISTORY_KEY = 'battle_history';
const GAME_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const gameService = {
    getCurrentGame: (): GameState | null => {
        const state = localStorage.getItem(GAME_STATE_KEY);
        if (!state) return null;
        
        const gameState: GameState = JSON.parse(state);
        
        // Check if game has ended
        if (gameState.isActive && Date.now() >= gameState.endTime) {
            const battleResult = gameService.endGame(gameState);
            gameService.saveBattleResult(battleResult);
            return null;
        }
        
        return gameState;
    },

    startNewGame: (): GameState => {
        const startTime = Date.now();
        const newGame: GameState = {
            isActive: true,
            startTime,
            endTime: startTime + GAME_DURATION,
            squares: Array(64).fill(null).map((_, index) => ({
                id: index,
                bear: null,
                faction: null
            })),
            usedBears: []
        };
        
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(newGame));
        return newGame;
    },

    updateGameState: (state: GameState) => {
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
    },

    endGame: (state: GameState): BattleResult => {
        // Calculate scores
        const scores = state.squares.reduce((acc, square) => {
            if (square.faction) {
                acc[square.faction] = (acc[square.faction] || 0) + 1;
            }
            return acc;
        }, {} as Record<Faction, number>);

        // Determine winner
        let winningFaction: Faction = 'IRON';
        let maxScore = 0;
        
        (Object.entries(scores) as [Faction, number][]).forEach(([faction, score]) => {
            if (score > maxScore) {
                maxScore = score;
                winningFaction = faction;
            }
        });

        const battleResult: BattleResult = {
            id: state.startTime.toString(),
            startTime: state.startTime,
            endTime: state.endTime,
            winningFaction,
            scores
        };

        // Clear current game
        localStorage.removeItem(GAME_STATE_KEY);
        
        return battleResult;
    },

    saveBattleResult: (result: BattleResult) => {
        const history = gameService.getBattleHistory();
        history.unshift(result);
        localStorage.setItem(BATTLE_HISTORY_KEY, JSON.stringify(history));
    },

    getBattleHistory: (): BattleResult[] => {
        const history = localStorage.getItem(BATTLE_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    },

    isBearUsed: (tokenId: string): boolean => {
        const currentGame = gameService.getCurrentGame();
        return currentGame ? currentGame.usedBears.includes(tokenId) : false;
    }
}; 