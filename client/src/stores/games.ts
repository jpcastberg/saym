import { defineStore } from "pinia";
import { type GameModel } from "../../../shared/models/GameModels";

// const userStore = useUserStore();

interface ComputedGameModel extends GameModel {
    otherUserUsername: string,
    isCurrentUsersTurn: boolean,
}

interface GamesState {
    areGamesInitialized: boolean,
    currentGames: ComputedGameModel[],
    finishedGames: GameModel[]
}

const sampleGames: GameModel[] = [{
    "_id": "b85a49ed",
    "playerOneUserId": "88f6c7d8",
    "playerTwoUserId": null,
    "playerOneTurns": [],
    "playerTwoTurns": [],
    "isGameComplete": false
}, {
    "_id": "b85a49ed",
    "playerOneUserId": "88f6c7d8",
    "playerTwoUserId": null,
    "playerOneTurns": [],
    "playerTwoTurns": [],
    "isGameComplete": false
}, {
    "_id": "b85a49ed",
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
        "finishedGames": []
    }),
    "actions": {
        async initGames(): Promise<void> {
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
        }
    }
});
