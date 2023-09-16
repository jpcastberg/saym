import { defineStore } from "pinia";
import {
    type AllGamesResponseModel,
    type GameResponseModel,
    type GameUpdateModel,
    type TurnModel,
} from "../../../shared/models/GameModels";
import {
    botName,
    type PublicPlayerModel,
} from "../../../shared/models/PlayerModels";
import { listenForEvent } from "../api/websocket";
import router from "../router";
import { usePlayerStore } from "./player";

export interface ComputedGameModel extends GameResponseModel {
    otherPlayer: PublicPlayerModel | null;
    displayTurns: DisplayTurn[];
    hasPlayerPlayedRound: boolean;
    uiTitle: string;
    uiSubtitle: string;
    sawFinishedGame: boolean;
}

interface DisplayTurn {
    currentPlayerTurn: TurnModel;
    icon: string;
    otherPlayerTurn?: TurnModel;
}

type GamesMap = Map<string, ComputedGameModel | undefined>;

interface GamesState {
    areGamesInitialized: boolean;
    currentGames: GamesMap;
    finishedGames: GamesMap;
}

interface Deferred {
    promise: Promise<void>;
    resolve?: () => void;
}

const pendingInitializationCallbacks: (() => void)[] = [];
let isInitializationInProgress = false;

export const useGamesStore = defineStore("games", {
    state: (): GamesState => {
        const currentGames: GamesMap = new Map();
        const finishedGames: GamesMap = new Map();
        return {
            areGamesInitialized: false,
            currentGames,
            finishedGames,
        };
    },
    getters: {
        getGameById(state): (gameId: string) => ComputedGameModel | undefined {
            return (gameId: string) => {
                if (state.currentGames.has(gameId)) {
                    return state.currentGames.get(gameId)!;
                } else if (state.finishedGames.has(gameId)) {
                    return state.finishedGames.get(gameId)!;
                }
            };
        },
        activeGame(): ComputedGameModel | undefined {
            const {
                currentRoute: {
                    value: {
                        params: { gameId },
                    },
                },
            } = router;

            return this.getGameById(gameId as string);
        },
        activeGameNotFound(): boolean {
            return (
                router.currentRoute.value.name === "games" && !this.activeGame
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
            const allGames = (await fetch("/api/games").then((response) =>
                response.json(),
            )) as AllGamesResponseModel;

            this.currentGames = toGamesMap(allGames.currentGames);
            this.finishedGames = toGamesMap(allGames.finishedGames);
            this.areGamesInitialized = true;

            while (pendingInitializationCallbacks.length) {
                const callback = pendingInitializationCallbacks.shift();
                callback && callback();
            }
        },
        async createGame(): Promise<ComputedGameModel> {
            const newGame = (await fetch("/api/games", { method: "post" }).then(
                (response) => response.json(),
            )) as GameResponseModel;
            this.currentGames.set(newGame._id, computeGameMetadata(newGame));

            return this.currentGames.get(newGame._id)!;
        },
        async joinGame(gameId: string): Promise<ComputedGameModel | null> {
            const playerStore = usePlayerStore();
            const body: GameUpdateModel = {
                playerTwoId: playerStore.player?._id,
            };
            const joinedGame = (await fetch(`/api/games/${gameId}`, {
                method: "put",
                body: JSON.stringify(body),
                headers: {
                    "content-type": "application/json",
                },
            }).then((response) => {
                return response.ok ? response.json() : null;
            })) as GameResponseModel | null;

            if (joinedGame) {
                this.currentGames.set(
                    joinedGame._id,
                    computeGameMetadata(joinedGame),
                );

                return this.currentGames.get(joinedGame._id)!;
            }

            return null;
        },
        async refreshGame(gameId: string) {
            const refreshedGame = (await fetch(`/api/games/${gameId}`).then(
                (response) => response.json(),
            )) as GameResponseModel;

            this.updateGame(computeGameMetadata(refreshedGame));
        },
        async markGameComplete(gameId: string) {
            const body: GameUpdateModel = {
                isGameComplete: true,
            };
            const completedGame = (await fetch(`/api/games/${gameId}`, {
                method: "put",
                body: JSON.stringify(body),
                headers: {
                    "content-type": "application/json",
                },
            }).then((response) => response.json())) as GameResponseModel;

            this.updateGame(computeGameMetadata(completedGame));
        },
        updateGame(game: ComputedGameModel) {
            if (this.currentGames.has(game._id)) {
                const matchingGame = this.currentGames.get(game._id);
                if (game.isGameComplete) {
                    this.currentGames.delete(game._id);
                    this.finishedGames.set(game._id, matchingGame);
                }

                Object.assign(matchingGame!, game);
            }
        },
        async createGameWithPlayer(
            playerTwoId: string,
        ): Promise<ComputedGameModel> {
            await this.initGames();
            const existingGameWithOtherPlayer = [
                ...this.currentGames.values(),
            ].find((game) => game?.otherPlayer?._id === playerTwoId);
            if (existingGameWithOtherPlayer) {
                return existingGameWithOtherPlayer;
            }
            const newGame = (await fetch("/api/games", {
                method: "post",
                body: JSON.stringify({ playerTwoId }),
                headers: { "content-type": "application/json" },
            }).then((response) => response.json())) as GameResponseModel;
            const computedNewGame = computeGameMetadata(newGame);
            this.currentGames.set(newGame._id, computedNewGame);

            return computedNewGame;
        },
        async invitePlayer(gameId: string, inviteBot: boolean) {
            const playerStore = usePlayerStore();
            if (inviteBot) {
                return this.inviteBot(gameId);
            }

            const shareLink = `${location.protocol}//${location.host}/games/${gameId}`;
            const isNativeSharingAvailable = "share" in navigator;

            if (isNativeSharingAvailable) {
                await navigator.share({
                    title: "Come play Saym!",
                    text: `${playerStore.player?.username} is inviting you to play Saym with them. Follow this link to join: ${shareLink}`,
                    url: shareLink,
                });
            } else {
                await navigator.clipboard.writeText(shareLink);
            }
        },
        async logGameInvite(gameId: string) {
            const body: GameUpdateModel = {
                needToInvitePlayer: false,
            };
            const gameResponse = (await fetch(`/api/games/${gameId}`, {
                method: "put",
                body: JSON.stringify(body),
                headers: {
                    "content-type": "application/json",
                },
            }).then((response) => response.json())) as GameResponseModel;
            this.updateGame(computeGameMetadata(gameResponse));
        },
        async inviteBot(gameId: string) {
            const body: GameUpdateModel = {
                playerTwoId: botName,
            };
            const gameResponse = (await fetch(`/api/games/${gameId}`, {
                method: "put",
                body: JSON.stringify(body),
                headers: {
                    "content-type": "application/json",
                },
            }).then((response) => response.json())) as GameResponseModel;
            this.updateGame(computeGameMetadata(gameResponse));
        },
        async submitTurn(gameId: string, text: string) {
            const gameResponse = (await fetch(`/api/games/${gameId}/turns`, {
                method: "post",
                body: JSON.stringify({ text }),
                headers: {
                    "content-type": "application/json",
                },
            }).then((response) => response.json())) as GameResponseModel;

            this.updateGame(computeGameMetadata(gameResponse));
        },
        async submitMessage(gameId: string, text: string) {
            const gameResponse = (await fetch(`/api/games/${gameId}/messages`, {
                method: "post",
                body: JSON.stringify({ text }),
                headers: {
                    "content-type": "application/json",
                },
            }).then((response) => response.json())) as GameResponseModel;

            this.updateGame(computeGameMetadata(gameResponse));
        },
        async markMessageRead(gameId: string, messageId: string) {
            const gameResponse = (await fetch(
                `/api/games/${gameId}/messages/${messageId}`,
                {
                    method: "put",
                    body: JSON.stringify({ readByOtherPlayer: true }),
                    headers: {
                        "content-type": "application/json",
                    },
                },
            ).then((response) => response.json())) as GameResponseModel;

            this.updateGame(computeGameMetadata(gameResponse));
        },
        async markFinishedGameAsSeen(gameId: string) {
            const playerStore = usePlayerStore();
            const game =
                this.currentGames.get(gameId) ?? this.finishedGames.get(gameId);
            const isPlayerOne = game?.playerOne._id === playerStore.player?._id;
            const body: GameUpdateModel = {
                [isPlayerOne
                    ? "playerOneSawFinishedGame"
                    : "playerTwoSawFinishedGame"]: true,
            };
            if (game?.isGameComplete) {
                const gameResponse = (await fetch(`/api/games/${gameId}`, {
                    method: "put",
                    body: JSON.stringify(body),
                    headers: {
                        "content-type": "application/json",
                    },
                }).then((response) => response.json())) as GameResponseModel;

                this.updateGame(computeGameMetadata(gameResponse));
            }
        },
    },
});

listenForEvent("gameUpdate", (updatedGame) => {
    console.log("RECEIVED GAME UPDATE:", updatedGame);
    const gamesStore = useGamesStore();
    gamesStore.updateGame(computeGameMetadata(updatedGame));
});

function toGamesMap(games: GameResponseModel[]) {
    return games
        .map(computeGameMetadata)
        .sort(gamesSortAlgorithm)
        .reduce((gamesMap: GamesMap, game) => {
            gamesMap.set(game._id, game);
            return gamesMap;
        }, new Map());
}

function getDeferred() {
    const deferred: Deferred = {
        promise: new Promise((resolve) => {
            deferred.resolve = resolve;
        }),
    };
    return deferred;
}

function gamesSortAlgorithm(a: ComputedGameModel, b: ComputedGameModel) {
    if (!a.hasPlayerPlayedRound && b.hasPlayerPlayedRound) {
        return -1;
    } else if (a.lastUpdate > b.lastUpdate) {
        return -1;
    }

    return 1;
}

function computeGameMetadata(game: GameResponseModel): ComputedGameModel {
    const playerStore = usePlayerStore();
    const isPlayerOne = playerStore.player?._id === game.playerOne._id;
    const [otherPlayer, currentPlayerTurns, otherPlayerTurns] = isPlayerOne
        ? [game.playerTwo, game.playerOneTurns, game.playerTwoTurns]
        : [game.playerOne, game.playerTwoTurns, game.playerOneTurns];
    const hasPlayerPlayedRound =
        currentPlayerTurns.length === otherPlayerTurns.length + 1;
    const displayTurns: DisplayTurn[] = currentPlayerTurns.map(
        (currentPlayerTurn, idx) => {
            return {
                currentPlayerTurn,
                icon:
                    game.isGameComplete && idx === currentPlayerTurns.length - 1
                        ? "✅"
                        : "❌",
                otherPlayerTurn: otherPlayerTurns[idx],
            };
        },
    );

    let uiTitle: string;
    let uiSubtitle = "";

    if (otherPlayer) {
        uiTitle = `Game with ${otherPlayer.username ?? "your friend"}`;
        if (game.isGameComplete) {
            const lastWord = currentPlayerTurns[currentPlayerTurns.length - 1];
            uiSubtitle = `Saym! You both guessed ${lastWord.text}.`;
        } else if (hasPlayerPlayedRound) {
            uiSubtitle = `Waiting for ${
                otherPlayer.username ?? "your friend"
            } to go`;
        } else {
            uiSubtitle = "Ready for your word!";
        }
    } else {
        uiTitle = "Pending Game";
        if (game.needToInvitePlayer) {
            uiSubtitle = "Invite someone to play!";
        } else if (!hasPlayerPlayedRound) {
            uiSubtitle = "Submit your first word while waiting";
        } else {
            uiSubtitle = "Waiting for other player to join...";
        }
    }

    const sawFinishedGame = isPlayerOne
        ? game.playerOneSawFinishedGame
        : game.playerTwoSawFinishedGame;

    const computedGame = {
        ...game,
        uiTitle,
        uiSubtitle,
        otherPlayer,
        displayTurns,
        hasPlayerPlayedRound,
        sawFinishedGame,
    };

    return computedGame;
}
