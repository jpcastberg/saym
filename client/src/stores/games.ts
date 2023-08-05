import { defineStore } from "pinia";
import { type GameModel } from "../../../shared/models/GameModels";

// const userStore = useUserStore();

export interface ComputedGameModel extends GameModel {
    otherUserUsername: string,
    isCurrentUsersTurn: boolean,
}

interface GamesState {
    areGamesInitialized: boolean,
    currentGames: ComputedGameModel[],
    finishedGames: GameModel[],
    activeGame: ComputedGameModel | undefined
}

const sampleGames: GameModel[] = [{
    "_id": "game1",
    "playerOneUserId": "88f6c7d8",
    "playerTwoUserId": null,
    "playerOneTurns": [],
    "playerTwoTurns": [],
    "isGameComplete": false
}, {
    "_id": "game2",
    "playerOneUserId": "88f6c7d8",
    "playerTwoUserId": null,
    "playerOneTurns": [],
    "playerTwoTurns": [],
    "isGameComplete": false
}, {
    "_id": "game3",
    "playerOneUserId": "88f6c7d8",
    "playerTwoUserId": null,
    "playerOneTurns": [],
    "playerTwoTurns": [],
    "isGameComplete": true
}];

export const useGamesStore = defineStore("games", {
    "state": (): GamesState => ({
        "areGamesInitialized": false,
        "currentGames": [],
        "finishedGames": [],
        "activeGame": void 0
    }),
    "actions": {
        async initGames(): Promise<void> {
            if (this.areGamesInitialized) {
                return;
            }

            for (const sampleGame of sampleGames) {
                if (sampleGame.isGameComplete) {
                    this.finishedGames.push(sampleGame);
                } else {
                    this.currentGames.push({
                        ...sampleGame,
                        "isCurrentUsersTurn": true,
                        "otherUserUsername": "Bobson"
                    });
                }

                this.areGamesInitialized = true;
            }
        },
        async setActiveGame(gameId: string) {
            if (!this.areGamesInitialized) {
                await this.initGames();
            }

            this.activeGame = this.currentGames.find(game => game._id === gameId);
        }
    }
});
