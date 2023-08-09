import { defineStore } from "pinia";
import { type GameModel } from "../../../shared/models/GameModels";
import { type UserModel } from "../../../shared/models/UserModels";
import { useUserStore } from "./user";

export interface ComputedGameModel extends GameModel {
    otherUserUsername: string;
    isCurrentUsersTurn: boolean;
}

interface GamesState {
    areGamesInitialized: boolean;
    currentGames: ComputedGameModel[];
    finishedGames: GameModel[];
    activeGame: ComputedGameModel | undefined;
}

type UsernameCache = Record<string, string>;

const usernameCache: UsernameCache = {};

export const useGamesStore = defineStore("games", {
    state: (): GamesState => ({
        areGamesInitialized: false,
        currentGames: [],
        finishedGames: [],
        activeGame: void 0,
    }),
    actions: {
        async initGames() {
            const userStore = useUserStore();
            await userStore.initUser();
            const allGames: GameModel[] = (await fetch("/api/games").then(
                (response) => response.json(),
            )) as GameModel[];
            const newCurrentGames = [];
            const newFinishedGames = [];

            for (const game of allGames) {
                const computedGame = await computeGameMetadata(game);
                if (computedGame.isGameComplete) {
                    newFinishedGames.push(computedGame);
                } else {
                    newCurrentGames.push(computedGame);
                }

                this.currentGames = newCurrentGames;
                this.finishedGames = newFinishedGames;
                this.areGamesInitialized = true;
            }
        },
        getGameById(gameId: string) {
            return this.currentGames.find((game) => game._id === gameId);
        },
        async setActiveGame(gameId: string) {
            if (!this.areGamesInitialized) {
                await this.initGames();
            }

            this.activeGame = this.getGameById(gameId);
        },
        async submitTurn(turn: string) {
            if (!this.activeGame) {
                return;
            }

            const activeGameId = this.activeGame._id;

            const gameResponse: GameModel = (await fetch(
                `/api/games/${activeGameId}`,
                {
                    method: "post",
                    body: JSON.stringify({ turn }),
                    headers: {
                        "content-type": "application/json",
                    },
                },
            ).then((response) => response.json())) as GameModel;

            const computedGameResponse = await computeGameMetadata(
                gameResponse,
            );
            const updatedCurrentGames = [...this.currentGames];

            updatedCurrentGames.splice(
                updatedCurrentGames.indexOf(this.activeGame),
                1,
                computedGameResponse,
            );
            this.currentGames = updatedCurrentGames;
            this.activeGame = computedGameResponse;
        },
    },
});

async function computeGameMetadata(
    game: GameModel,
): Promise<ComputedGameModel> {
    const userStore = useUserStore();
    const isPlayerOne = userStore.userId === game.playerOneUserId;
    const isCurrentUsersTurn =
        isPlayerOne &&
        game.playerOneTurns.length === game.playerTwoTurns.length;
    const otherPlayerUserId = isPlayerOne
        ? game.playerTwoUserId
        : game.playerOneUserId;
    let otherUserUsername = "";

    if (otherPlayerUserId && usernameCache[otherPlayerUserId]) {
        otherUserUsername = usernameCache[otherPlayerUserId];
    } else if (otherPlayerUserId) {
        otherUserUsername = await fetch(`/api/users/${otherPlayerUserId}`)
            .then((response) => response.json())
            .then((otherUser: UserModel) => otherUser.username);
        usernameCache[otherPlayerUserId] = otherUserUsername;
    }

    return {
        ...game,
        otherUserUsername,
        isCurrentUsersTurn,
    };
}

// const socket = new WebSocket("ws://localhost:3000");

// socket.onopen = () => {
//     console.log("Connected to server");
// };

// socket.onmessage = (event) => {
//     console.log(event);
// };

// socket.onclose = () => {
//     console.log("Connection closed");
// };

// // Function to send moves to the server
// function sendMessage(message) {
//     socket.send(message);
// }
