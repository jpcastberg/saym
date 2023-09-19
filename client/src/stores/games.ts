import { defineStore } from "pinia";
import {
    type AllGamesResponseModel,
    type GameResponseModel,
    type GameUpdateModel,
    type MessageResponseModel,
    type TurnModel,
    type TurnResponseModel,
} from "../../../shared/models/GameModels";
import {
    botName,
    type PublicPlayerModel,
} from "../../../shared/models/PlayerModels";
import { listenForWebsocketEvent } from "../api/websocket";
import router from "../router";
import logger from "../api/logger";
import { usePlayerStore } from "./player";

export interface ComputedGameModel extends GameResponseModel {
    otherPlayer: PublicPlayerModel | null;
    currentPlayerTurns: TurnModel[];
    displayTurns: DisplayTurn[];
    hasPlayerPlayedRound: boolean;
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
        initGames,
        createGame,
        joinGame,
        refreshGame,
        markGameComplete,
        updateGame,
        createGameWithPlayer,
        invitePlayer,
        logGameInvite,
        inviteBot,
        submitTurn,
        submitMessage,
        markMessageRead,
        markFinishedGameAsSeen,
    },
});

async function initGames() {
    const gamesStore = useGamesStore();
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

    gamesStore.currentGames = toGamesMap(
        allGames.currentGames,
        currentGamesSortAlgorithm,
    );
    gamesStore.finishedGames = toGamesMap(
        allGames.finishedGames,
        finishedGamesSortAlgorithm,
    );
    gamesStore.areGamesInitialized = true;

    while (pendingInitializationCallbacks.length) {
        const callback = pendingInitializationCallbacks.shift();
        callback && callback();
    }

    logger.debug("games_initialized", null);
}

async function createGame(): Promise<ComputedGameModel> {
    const gamesStore = useGamesStore();
    const newGame = (await fetch("/api/games", { method: "post" }).then(
        (response) => response.json(),
    )) as GameResponseModel;
    gamesStore.currentGames.set(newGame._id, computeGameMetadata(newGame));

    logger.debug("game_created", {
        gameId: newGame._id,
    });
    return gamesStore.currentGames.get(newGame._id)!;
}

async function joinGame(gameId: string): Promise<ComputedGameModel | null> {
    const gamesStore = useGamesStore();
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
        gamesStore.currentGames.set(
            joinedGame._id,
            computeGameMetadata(joinedGame),
        );

        logger.debug("joined_game", {
            gameId: joinedGame._id,
        });

        return gamesStore.currentGames.get(joinedGame._id)!;
    }

    return null;
}

async function refreshGame(gameId: string) {
    const gamesStore = useGamesStore();
    const refreshedGame = (await fetch(`/api/games/${gameId}`).then(
        (response) => response.json(),
    )) as GameResponseModel;

    logger.debug("game_refreshed", {
        gameId: refreshedGame._id,
    });
    gamesStore.updateGame(computeGameMetadata(refreshedGame));
}

async function markGameComplete(gameId: string) {
    const gamesStore = useGamesStore();
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

    logger.debug("game_marked_complete", {
        gameId: completedGame._id,
    });
    gamesStore.updateGame(computeGameMetadata(completedGame));
}

function updateGame(game: ComputedGameModel) {
    const gamesStore = useGamesStore();
    let matchingGame;

    if (gamesStore.currentGames.has(game._id)) {
        matchingGame = gamesStore.currentGames.get(game._id);
    } else if (gamesStore.finishedGames.has(game._id)) {
        matchingGame = gamesStore.finishedGames.get(game._id);
    }

    if (matchingGame) {
        logger.debug(
            "updateGame called, matching game found, merging in new game",
            game,
        );
        Object.assign(matchingGame, game);
    } else {
        logger.debug(
            "updateGame called, matching game NOT found for updated game",
            game,
        );
    }

    if (
        matchingGame &&
        game.isGameComplete &&
        gamesStore.currentGames.has(game._id)
    ) {
        logger.debug("moving current game to finished", game);
        gamesStore.currentGames.delete(game._id);
        gamesStore.finishedGames.set(game._id, matchingGame);
    }
}

async function createGameWithPlayer(
    playerTwoId: string,
): Promise<ComputedGameModel> {
    const gamesStore = useGamesStore();
    await gamesStore.initGames();
    const existingGameWithOtherPlayer = [
        ...gamesStore.currentGames.values(),
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
    gamesStore.currentGames.set(newGame._id, computedNewGame);

    logger.debug("created_new_game_with_player", {
        gameId: newGame._id,
        playerTwoId,
    });

    return computedNewGame;
}

async function invitePlayer(gameId: string, inviteBot: boolean) {
    const gamesStore = useGamesStore();
    const playerStore = usePlayerStore();
    if (inviteBot) {
        return gamesStore.inviteBot(gameId);
    }

    const shareLink = `${location.protocol}//${location.host}/games/${gameId}`;
    const isNativeSharingAvailable = "share" in navigator;

    if (isNativeSharingAvailable) {
        await navigator.share({
            title: "Come play Saym!",
            text: `${playerStore.player?.username} is inviting you to play Saym with them. Follow this link to join:`,
            url: shareLink,
        });
    } else {
        await navigator.clipboard.writeText(shareLink);
    }
}

async function logGameInvite(gameId: string) {
    const gamesStore = useGamesStore();
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

    logger.debug("game_invite_logged", {
        gameId,
    });
    gamesStore.updateGame(computeGameMetadata(gameResponse));
}

async function inviteBot(gameId: string) {
    const gamesStore = useGamesStore();
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

    logger.debug("bot_invited", {
        gameId,
    });
    gamesStore.updateGame(computeGameMetadata(gameResponse));
}

async function submitTurn(gameId: string, text: string) {
    text = text.trim();
    const gamesStore = useGamesStore();
    const turnResponse = (await fetch(`/api/games/${gameId}/turns`, {
        method: "post",
        body: JSON.stringify({ text }),
        headers: {
            "content-type": "application/json",
        },
    }).then((response) => response.json())) as TurnResponseModel;

    logger.debug("turn_submitted", {
        gameId: turnResponse.game._id,
        turn: turnResponse.turn,
    });
    gamesStore.updateGame(computeGameMetadata(turnResponse.game));
}

async function submitMessage(gameId: string, text: string) {
    text = String(text).trim();
    const gamesStore = useGamesStore();
    const messageResponse = (await fetch(`/api/games/${gameId}/messages`, {
        method: "post",
        body: JSON.stringify({ text }),
        headers: {
            "content-type": "application/json",
        },
    }).then((response) => response.json())) as MessageResponseModel;
    logger.debug("message_submitted", {
        gameId: messageResponse.game._id,
        message: messageResponse.message,
    });
    gamesStore.updateGame(computeGameMetadata(messageResponse.game));
}

async function markMessageRead(gameId: string, messageId: string) {
    const gamesStore = useGamesStore();
    const messageResponse = (await fetch(
        `/api/games/${gameId}/messages/${messageId}`,
        {
            method: "put",
            body: JSON.stringify({ readByOtherPlayer: true }),
            headers: {
                "content-type": "application/json",
            },
        },
    ).then((response) => response.json())) as MessageResponseModel;
    logger.debug("marked_message_as_read", {
        gameId: messageResponse.game._id,
        message: messageResponse.message,
    });
    gamesStore.updateGame(computeGameMetadata(messageResponse.game));
}

async function markFinishedGameAsSeen(gameId: string) {
    const gamesStore = useGamesStore();
    const playerStore = usePlayerStore();
    const game =
        gamesStore.currentGames.get(gameId) ??
        gamesStore.finishedGames.get(gameId);
    const isPlayerOne = playerStore.player?._id === game?.playerOne._id;
    const body: GameUpdateModel = {
        [isPlayerOne ? "playerOneSawFinishedGame" : "playerTwoSawFinishedGame"]:
            true,
    };
    if (game?.isGameComplete) {
        const gameResponse = (await fetch(`/api/games/${gameId}`, {
            method: "put",
            body: JSON.stringify(body),
            headers: {
                "content-type": "application/json",
            },
        }).then((response) => response.json())) as GameResponseModel;
        logger.debug("marked_finished_game_as_seen", {
            gameId: gameResponse._id,
        });
        gamesStore.updateGame(computeGameMetadata(gameResponse));
    }
}

listenForWebsocketEvent("gameUpdate", (updatedGame) => {
    const gamesStore = useGamesStore();
    gamesStore.updateGame(computeGameMetadata(updatedGame));
});

function toGamesMap(
    games: GameResponseModel[],
    sortAlgorithm: (a: ComputedGameModel, b: ComputedGameModel) => -1 | 0 | 1,
) {
    return games
        .map(computeGameMetadata)
        .sort(sortAlgorithm)
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

function currentGamesSortAlgorithm(a: ComputedGameModel, b: ComputedGameModel) {
    if (!a.hasPlayerPlayedRound && b.hasPlayerPlayedRound) {
        return -1;
    } else if (a.lastUpdate > b.lastUpdate) {
        return -1;
    }

    return 1;
}

function finishedGamesSortAlgorithm(
    a: ComputedGameModel,
    b: ComputedGameModel,
) {
    if (a.lastUpdate > b.lastUpdate) {
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

    const sawFinishedGame = isPlayerOne
        ? game.playerOneSawFinishedGame
        : game.playerTwoSawFinishedGame;

    const computedGame = {
        ...game,
        otherPlayer,
        currentPlayerTurns,
        displayTurns,
        hasPlayerPlayedRound,
        sawFinishedGame,
    };

    return computedGame;
}
