import { defineStore } from "pinia";
import { type GameModel } from "../../../shared/models/GameModels";

// const userStore = useUserStore();

interface ComputedGameModel extends GameModel {
    otherUserUsername: string,
    isCurrentUsersTurn: boolean,
}

interface GamesState {
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
}];

export const useGamesStore = defineStore("games", {
    "state": (): GamesState => ({
        "currentGames": [],
        "finishedGames": []
    }),
    "getters": {
        async getCurrentGames(): Promise<ComputedGameModel[]> {
            // await fetch("/api/games")
            const currentGames: ComputedGameModel[] = [];
            // const otherPlayerUsername = "Bobson";
            for (const sampleGame of sampleGames) {
                currentGames.push({
                    ...sampleGame,
                    "isCurrentUsersTurn": true,
                    "otherUserUsername": "Bobson"
                });

            }

            return currentGames;
        }
    }
});
