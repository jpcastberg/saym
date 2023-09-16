import express, { type Request, type Response } from "express";
import { botName } from "../../../shared/models/PlayerModels";
import gamesDbApi from "../database/games";
import {
    type AllGamesResponseModel,
    type GameResponseModel,
    type GameCreateModel,
    type GameWebsocketUpdateModel,
    type TurnCreateModel,
    type MessageUpdateModel,
    type MessageCreateModel,
    TurnModel,
    GameUpdateModel,
} from "../../../shared/models/GameModels";
import { type ResponseLocals } from "../models";
import { sendWebsocketMessage } from "../websocket";
import { generateTurn } from "../utils/saymbot";
import sendNotification, { NotificationModel } from "../utils/sendNotification";

const gamesApi = express.Router();

gamesApi.get(
    "/",
    async (req, res: Response<AllGamesResponseModel, ResponseLocals>) => {
        const {
            locals: { playerId },
        } = res;
        const allGames = await gamesDbApi.getAll({ playerId });
        const response: AllGamesResponseModel = {
            currentGames: [],
            finishedGames: [],
        };

        for (const game of allGames) {
            game.isGameComplete
                ? response.finishedGames.push(game)
                : response.currentGames.push(game);
        }
        res.send(response);
    },
);

gamesApi.post(
    "/",
    async (
        req: Request<
            Record<string, string>,
            GameResponseModel,
            GameCreateModel
        >,
        res: Response<GameResponseModel, ResponseLocals>,
    ) => {
        const {
            locals: { playerId },
        } = res;
        const {
            body: { playerTwoId },
        } = req;
        const newGameResponse = await gamesDbApi.create({
            playerOneId: playerId,
            playerTwoId: playerTwoId ?? null,
        });

        if (playerTwoId === botName) {
            scheduleBotTurn(newGameResponse!);
        }

        res.send(newGameResponse);
    },
);

gamesApi.get(
    "/:gameId",
    async (req, res: Response<GameResponseModel, ResponseLocals>) => {
        const {
            params: { gameId },
        } = req;
        const {
            locals: { playerId },
        } = res;
        const foundGame = await gamesDbApi.get({ playerId, gameId });
        res.send(foundGame ?? void 0);
    },
);

gamesApi.put(
    "/:gameId",
    async (
        req: Request<
            Record<string, string>,
            GameResponseModel,
            GameUpdateModel
        >,
        res: Response<GameResponseModel, ResponseLocals>,
    ) => {
        const {
            params: { gameId },
        } = req;
        const {
            locals: { playerId },
        } = res;
        const updateBody = req.body;
        const currentGame = await gamesDbApi.get({ playerId, gameId });

        if (!currentGame && !updateBody.playerTwoId) {
            res.status(404).send();
            return;
        }

        if (
            Boolean(
                updateBody.playerTwoId && // can't join anyone but yourself or the both to a game
                    updateBody.playerTwoId !== playerId &&
                    updateBody.playerTwoId !== botName,
            ) ||
            Boolean(
                updateBody.playerOneSawFinishedGame && // can't mark the other player as having seen the game
                    playerId !== currentGame?.playerOne._id,
            ) ||
            Boolean(
                updateBody.playerTwoSawFinishedGame &&
                    playerId !== currentGame?.playerTwo?._id,
            )
        ) {
            res.status(400).send();
            return;
        }

        const updatedGame = await gamesDbApi.update({
            playerId,
            gameId,
            ...updateBody,
        });

        if (updatedGame) {
            res.send(updatedGame);

            if (
                currentGame &&
                !currentGame.playerTwo &&
                updatedGame.playerTwo?._id === botName
            ) {
                scheduleBotTurn(updatedGame);
            }

            sendWebsocketGameUpdate(playerId, updatedGame);
        } else {
            res.status(404).send();
        }
    },
);

gamesApi.post(
    "/:gameId/turns",
    async (
        req: Request<
            Record<string, string>,
            GameResponseModel,
            TurnCreateModel
        >,
        res: Response<GameResponseModel, ResponseLocals>,
    ) => {
        const {
            params: { gameId },
            body: { text },
        } = req;
        const {
            locals: { playerId },
        } = res;

        const updatedGame = await addTurnToGame(text, playerId, gameId);
        if (
            !updatedGame.isGameComplete &&
            updatedGame.playerTwo?._id === botName
        ) {
            scheduleBotTurn(updatedGame);
        }

        res.send(updatedGame);
        await notifyOtherPlayerOfMove(playerId, updatedGame);
    },
);

gamesApi.post(
    "/:gameId/messages",
    async (
        req: Request<
            Record<string, string>,
            GameResponseModel,
            MessageCreateModel
        >,
        res: Response<GameResponseModel, ResponseLocals>,
    ) => {
        const {
            params: { gameId },
        } = req;
        const {
            locals: { playerId },
        } = res;
        const {
            body: { text },
        } = req;

        if (!text) {
            res.status(400).send();
            return;
        }

        const gameResponse = await gamesDbApi.createMessage({
            playerId,
            gameId,
            text,
        });

        if (gameResponse) {
            res.send(gameResponse);
            sendWebsocketGameUpdate(playerId, gameResponse);
            await notifyOtherPlayerOfMessage(playerId, gameResponse);
        } else {
            res.status(404).send();
        }
    },
);

gamesApi.put(
    "/:gameId/messages/:messageId",
    async (
        req: Request<
            Record<string, string>,
            GameResponseModel,
            MessageUpdateModel
        >,
        res: Response<GameResponseModel, ResponseLocals>,
    ) => {
        const {
            params: { gameId, messageId },
        } = req;
        const {
            locals: { playerId },
        } = res;
        const {
            body: { readByOtherPlayer },
        } = req;

        const updatedGame = await gamesDbApi.updateMessage({
            playerId,
            gameId,
            messageId,
            readByOtherPlayer,
        });

        if (updatedGame) {
            res.send(updatedGame);
            sendWebsocketGameUpdate(playerId, updatedGame);
        } else {
            res.status(404).send();
        }
    },
);

async function notifyOtherPlayerOfMove(
    playerId: string,
    game: GameResponseModel,
) {
    const currentPlayer = getCurrentPlayer(playerId, game);
    const currentPlayerUsername = currentPlayer?.username ?? "Your friend";
    const url = `https://${process.env.SAYM_DOMAIN}/games/${game._id}`;
    const message = `${currentPlayerUsername} just made a move in your game!`;
    const notification: NotificationModel = {
        url,
        pushTitle: "It's your move!",
        pushMessage: message,
        smsMessage: `${message} https://${process.env.SAYM_DOMAIN}/games/${game._id}`,
    };

    await notifyOtherPlayer(playerId, game, notification);
}

async function notifyOtherPlayerOfMessage(
    playerId: string,
    game: GameResponseModel,
) {
    const currentPlayer = getCurrentPlayer(playerId, game);
    let foundLastMessage = false;
    const secondToLastMessage = game.messages.findLast((message) => {
        if (message._id === playerId) {
            if (foundLastMessage) {
                return message;
            }

            foundLastMessage = true;
        }

        return false;
    });

    if (secondToLastMessage) {
        const twoMinutesAgo = new Date().getTime() - 120000;
        const sentTime = new Date(secondToLastMessage.timestamp).getTime();

        if (sentTime < twoMinutesAgo) {
            return;
        }
    }

    const currentPlayerUsername = currentPlayer?.username ?? "Your friend";
    const url = `https://${process.env.SAYM_DOMAIN}/games/${game._id}/messages`;
    const notification: NotificationModel = {
        url,
        pushTitle: "You got a message!",
        pushMessage: `${currentPlayerUsername}: sent you a message - tap here to respond`,
        smsMessage: `${currentPlayerUsername} sent you a message - respond here: ${url}`,
    };

    await notifyOtherPlayer(playerId, game, notification);
}

async function notifyOtherPlayer(
    playerId: string,
    game: GameResponseModel,
    notification: NotificationModel,
) {
    const otherPlayer = getOtherPlayer(playerId, game);

    if (otherPlayer) {
        await sendNotification(otherPlayer._id, notification);
    }
}

async function addTurnToGame(
    turn: string,
    playerId: string,
    gameId: string,
): Promise<GameResponseModel> {
    return new Promise(async (resolve, reject) => {
        const currentGame = await gamesDbApi.get({ playerId, gameId });
        const sanitizedTurn = sanitize(turn);

        if (!currentGame) {
            reject(404);
            return;
        } else if (!sanitizedTurn || currentGame.isGameComplete) {
            reject(400);
            return;
        }

        let isGameComplete: boolean | undefined;

        const [
            playerOneTurn,
            playerTwoTurn,
            currentPlayerTurns,
            otherPlayerTurns,
        ] = isPlayerOne(playerId, currentGame)
            ? [
                  sanitizedTurn,
                  undefined,
                  currentGame.playerOneTurns,
                  currentGame.playerTwoTurns,
              ]
            : [
                  undefined,
                  sanitizedTurn,
                  currentGame.playerTwoTurns,
                  currentGame.playerOneTurns,
              ];

        if (
            sanitizedTurn &&
            !isValidTurn(sanitizedTurn, currentPlayerTurns, otherPlayerTurns)
        ) {
            reject(400);
        }

        if (
            sanitizedTurn &&
            isWinningTurn(sanitizedTurn, currentPlayerTurns, otherPlayerTurns)
        ) {
            isGameComplete = true;
        }

        const updatedGame = await gamesDbApi.update({
            playerId,
            gameId,
            playerOneTurn,
            playerTwoTurn,
            isGameComplete,
        });

        if (updatedGame) {
            resolve(updatedGame);
            sendWebsocketGameUpdate(playerId, updatedGame);
        } else {
            reject(500); // todo: replace with real errors
        }
    });
}

function sendWebsocketGameUpdate(
    playerId: string,
    updatedGame: GameResponseModel,
) {
    const otherPlayerId = isPlayerOne(playerId, updatedGame)
        ? updatedGame.playerTwo?._id
        : updatedGame.playerOne._id;
    if (otherPlayerId) {
        sendWebsocketMessage(
            otherPlayerId,
            JSON.stringify({
                eventType: "gameUpdate",
                data: updatedGame,
            } as GameWebsocketUpdateModel),
        );
    }
}

function isPlayerOne(playerId: string, game: GameResponseModel) {
    return game.playerOne._id === playerId;
}

function getCurrentPlayer(playerId: string, game: GameResponseModel) {
    return isPlayerOne(playerId, game) ? game.playerOne : game.playerTwo;
}

function getOtherPlayer(playerId: string, game: GameResponseModel) {
    return isPlayerOne(playerId, game) ? game.playerTwo : game.playerOne;
}

function sanitize(turn: string): string {
    return turn.replace(/\s+/, " ").replace(/[^0-9a-z\s]/gi, "");
}

function isValidTurn(
    turn: string,
    currentPlayerTurns: TurnModel[],
    otherPlayerTurns: TurnModel[],
): boolean {
    const maxTurnLength = 25;
    return (
        Boolean(turn) &&
        turn.length < maxTurnLength &&
        (currentPlayerTurns.length === otherPlayerTurns.length ||
            currentPlayerTurns.length === otherPlayerTurns.length - 1)
    );
}

function isWinningTurn(
    turn: string,
    currentPlayerTurns: TurnModel[],
    otherPlayerTurns: TurnModel[],
): boolean {
    return (
        currentPlayerTurns.length === otherPlayerTurns.length - 1 &&
        turn.trim().toLowerCase() ===
            otherPlayerTurns[otherPlayerTurns.length - 1].text
                .trim()
                .toLowerCase()
    );
}

function scheduleBotTurn(game: GameResponseModel) {
    setTimeout(async () => {
        const botTurn = await generateTurn(game);
        void addTurnToGame(botTurn, botName, game._id);
    }, 2000);
}

export default gamesApi;
