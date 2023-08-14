import { defineStore } from "pinia";
import {
    type AllGamesResponseModel,
    type GameResponseModel,
} from "../../../shared/models/GameModels";
import { type UserModel } from "../../../shared/models/UserModels";
import { listenForEvent } from "../api/websocket";
import { useUserStore } from "./user";

export interface ComputedGameModel extends GameResponseModel {
    otherPlayer: UserModel | null;
    displayTurns: DisplayTurn[];
    hasUserPlayedRound: boolean;
    uiTitle: string;
    uiSubtitle: string;
}

interface DisplayTurn {
    currentPlayerTurn: string;
    icon: string;
    otherPlayerTurn: string;
}

interface GamesState {
    areGamesInitialized: boolean;
    currentGames: Record<string, ComputedGameModel>;
    finishedGames: ComputedGameModel[];
}

export const useGamesStore = defineStore("games", {
    state: (): GamesState => ({
        areGamesInitialized: false,
        currentGames: {},
        finishedGames: [],
    }),
    getters: {
        currentGamesList(state) {
            return [...Object.values(state.currentGames)].sort(
                byLastUpdatedDescending,
            );
        },
    },
    actions: {
        async initGames() {
            const userStore = useUserStore();
            await userStore.initUser();
            const allGames = (await fetch("/api/games").then((response) =>
                response.json(),
            )) as AllGamesResponseModel;

            this.currentGames = allGames.currentGames
                .map(computeGameMetadata)
                .reduce(
                    (
                        currentGamesMap: Record<string, ComputedGameModel>,
                        game,
                    ) => {
                        currentGamesMap[game._id] = game;
                        return currentGamesMap;
                    },
                    {},
                );
            this.finishedGames =
                allGames.finishedGames.map(computeGameMetadata);
            this.areGamesInitialized = true;
        },
        getGameById(gameId: string): ComputedGameModel {
            return this.currentGames[gameId];
        },
        updateGame(game: ComputedGameModel) {
            Object.assign(this.currentGames[game._id], game);
        },
        async createGame(): Promise<GameResponseModel> {
            const newGame = (await fetch("/api/games", { method: "post" }).then(
                (response) => response.json(),
            )) as GameResponseModel;
            this.currentGames[newGame._id] = computeGameMetadata(newGame);

            return newGame;
        },
        async logGameInvite(gameId: string) {
            const gameResponse = (await fetch(`/api/games/${gameId}/invite`, {
                method: "post",
            }).then((response) => response.json())) as GameResponseModel;
            this.updateGame(computeGameMetadata(gameResponse));
        },
        async submitTurn(turn: string, gameId: string) {
            const gameResponse = (await fetch(`/api/games/${gameId}/turns`, {
                method: "post",
                body: JSON.stringify({ turn }),
                headers: {
                    "content-type": "application/json",
                },
            }).then((response) => response.json())) as GameResponseModel;

            this.updateGame(computeGameMetadata(gameResponse));
        },
    },
});

listenForEvent("gameUpdate", (updatedGame) => {
    const gamesStore = useGamesStore();
    gamesStore.updateGame(computeGameMetadata(updatedGame));
});

function byLastUpdatedDescending(a: ComputedGameModel, b: ComputedGameModel) {
    return a.lastUpdate > b.lastUpdate ? -1 : 1;
}

function computeGameMetadata(game: GameResponseModel): ComputedGameModel {
    const userStore = useUserStore();
    const isPlayerOne = userStore.userId === game.playerOne?._id;
    const [otherPlayer, currentPlayerTurns, otherPlayerAllTurns] = isPlayerOne
        ? [game.playerTwo, game.playerOneTurns, game.playerTwoTurns]
        : [game.playerOne, game.playerTwoTurns, game.playerOneTurns];
    const hasUserPlayedRound =
        currentPlayerTurns.length === otherPlayerAllTurns.length + 1;
    const displayTurns: DisplayTurn[] = currentPlayerTurns.map(
        (currentPlayerTurn, idx) => {
            return {
                currentPlayerTurn,
                icon: "❌",
                otherPlayerTurn: otherPlayerAllTurns[idx],
            };
        },
    );

    let uiTitle: string;
    let uiSubtitle = "";

    if (otherPlayer) {
        uiTitle = `Game with ${otherPlayer.username || "your friend"}`;
        uiSubtitle = hasUserPlayedRound
            ? `Waiting for ${otherPlayer.username || "your friend"} to go`
            : "Ready for your word!";
    } else {
        uiTitle = "Pending Game";
        if (game.needToInvitePlayer) {
            uiSubtitle = "Invite someone to play!";
        } else if (!hasUserPlayedRound) {
            uiSubtitle = "Submit your first word while waiting";
        } else {
            uiSubtitle = "Waiting for other player to join...";
        }
    }

    const computedGame = {
        ...game,
        uiTitle,
        uiSubtitle,
        otherPlayer,
        displayTurns,
        hasUserPlayedRound,
    };

    return computedGame;
}
