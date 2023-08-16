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
    currentGames: Record<string, ComputedGameModel | undefined>;
    finishedGames: ComputedGameModel[];
}

interface Deferred {
    promise: Promise<void>;
    resolve?: () => void;
}

const pendingInitializationCallbacks: (() => void)[] = [];
let isInitializationInProgress = false;

export const useGamesStore = defineStore("games", {
    state: (): GamesState => ({
        areGamesInitialized: false,
        currentGames: {},
        finishedGames: [],
    }),
    getters: {
        currentGamesList(state) {
            return [...Object.values(state.currentGames)].sort((a, b) =>
                byLastUpdatedDescending(a!, b!),
            );
        },
    },
    actions: {
        async initGames() {
            if (isInitializationInProgress) {
                const initializationDeferred = getDeferred();
                pendingInitializationCallbacks.push(
                    initializationDeferred.resolve ?? (() => void 0),
                );
                return initializationDeferred.promise;
            }
            const userStore = useUserStore();
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

            while (pendingInitializationCallbacks.length) {
                const callback = pendingInitializationCallbacks.shift();
                callback && callback();
            }
        },
        getGameById(gameId: string): ComputedGameModel | undefined {
            if (this.currentGames[gameId]) {
                return this.currentGames[gameId]!;
            }

            const finishedGame = this.finishedGames.find(
                (game) => game._id === gameId,
            );

            if (finishedGame) {
                return finishedGame;
            }
        },
        updateGame(game: ComputedGameModel) {
            if (this.currentGames[game._id]) {
                Object.assign(this.currentGames[game._id]!, game);
            }
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
        async inviteBot(gameId: string) {
            const gameResponse = (await fetch(
                `/api/games/${gameId}/invite-bot`,
                {
                    method: "post",
                },
            ).then((response) => response.json())) as GameResponseModel;
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

function getDeferred() {
    const deferred: Deferred = {
        promise: new Promise((resolve) => {
            deferred.resolve = resolve;
        }),
    };
    return deferred;
}

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
                icon:
                    game.isGameComplete && idx === currentPlayerTurns.length - 1
                        ? "✅"
                        : "❌",
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
