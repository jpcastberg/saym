import { defineStore } from "pinia";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

interface GameModel {
    playerOneUserId: string,
    playerTwoUserId: string,
    playerOneTurns: string[],
    playerTwoTurns: string[],
    isGameComplete: boolean,
    otherUserUsername: string,
    isCurrentUsersTurn: boolean,

}

interface ComputedGameModel extends GameModel {
    otherUserUsername: string,
    isCurrentUsersTurn: boolean,
}

const sampleGames = [{
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
    "state": () => ({
        "currentGames": [],
        "finishedGames": []
    }),
    "getters": {
        async getCurrentGames() {
            // await fetch("/api/games")
            const currentGames = [];
            const otherPlayerUsername = "Bobson";
            for (const sampleGame of sampleGames) {
                const clonedGame = cloneJson(sampleGame);
                // fetch other player's username
                currentGames.push(clonedGame);
            }

            return currentGames;
        }
    }
});

function cloneJson(json: object): object {
    return JSON.parse(JSON.stringify(json));
}
