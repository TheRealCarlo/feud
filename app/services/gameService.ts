import { GameState, Square, BattleResult, Faction } from '../types/game';

const GAME_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const GAME_STATE_KEY = 'brawler_bearz_game_state';
const BATTLE_HISTORY_KEY = 'brawler_bearz_battle_history';

export const gameService = {
    getGameState: (): GameState | null => {
        const savedState = localStorage.getItem(GAME_STATE_KEY);
        if (!savedState) return null;
        
        try {
            const state = JSON.parse(savedState);
            return state;
        } catch (error) {
            console.error('Error parsing game state:', error);
            return null;
        }
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
            usedBears: [],
            cooldowns: [] // Initialize empty cooldowns array
        };

        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(newGame));
        return newGame;
    },

    updateGameState: (state: GameState): void => {
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
    },

    isBearUsed: (bearId: string): boolean => {
        const state = gameService.getGameState();
        if (!state) return false;
        return state.usedBears.includes(bearId);
    },

    getBattleHistory: (): BattleResult[] => {
        const savedHistory = localStorage.getItem(BATTLE_HISTORY_KEY);
        if (!savedHistory) return [];
        
        try {
            return JSON.parse(savedHistory);
        } catch (error) {
            console.error('Error parsing battle history:', error);
            return [];
        }
    },

    addBattleResult: (result: BattleResult): void => {
        const history = gameService.getBattleHistory();
        history.push(result);
        localStorage.setItem(BATTLE_HISTORY_KEY, JSON.stringify(history));
    },

    getFactionScore: (faction: Faction): number => {
        const state = gameService.getGameState();
        if (!state) return 0;
        
        return state.squares.filter(square => square.faction === faction).length;
    },

    clearGameState: (): void => {
        localStorage.removeItem(GAME_STATE_KEY);
    },

    isGameActive: (): boolean => {
        const state = gameService.getGameState();
        if (!state) return false;
        
        const now = Date.now();
        return state.isActive && now < state.endTime;
    },

    getTimeRemaining: (): number => {
        const state = gameService.getGameState();
        if (!state) return 0;
        
        const now = Date.now();
        return Math.max(0, state.endTime - now);
    },

    endGame: (gameState: GameState): BattleResult => {
        // Calculate scores for each faction
        const scores = {
            IRON: 0,
            GEO: 0,
            TECH: 0,
            PAW: 0
        };

        // Count squares controlled by each faction
        gameState.squares.forEach(square => {
            if (square.faction) {
                scores[square.faction]++;
            }
        });

        // Determine winning faction
        let winningFaction: Faction = 'IRON';
        let maxScore = scores.IRON;

        Object.entries(scores).forEach(([faction, score]) => {
            if (score > maxScore) {
                maxScore = score;
                winningFaction = faction as Faction;
            }
        });

        const battleResult: BattleResult = {
            id: `game-${gameState.startTime}`,
            startTime: gameState.startTime,
            endTime: gameState.endTime,
            winningFaction,
            scores
        };

        // Clear the current game state
        gameService.clearGameState();

        return battleResult;
    },

    saveBattleResult: (result: BattleResult): void => {
        const history = gameService.getBattleHistory();
        history.push(result);
        localStorage.setItem(BATTLE_HISTORY_KEY, JSON.stringify(history));
    },

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

    createInitialGameState: () => ({
        squares: gameService.createInitialSquares(),
        end_time: Date.now() + (24 * 60 * 60 * 1000),
        used_bears: [],
        is_active: true,
        cooldowns: [] // Initialize empty cooldowns array
    })
}; 