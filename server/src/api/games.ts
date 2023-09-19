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
    type TurnModel,
    type GameUpdateModel,
    type TurnResponseModel,
    type MessageModel,
    type MessageResponseModel,
} from "../../../shared/models/GameModels";
import { type ResponseLocals } from "../models";
import { sendWebsocketMessage } from "../websocket";
import { generateTurnText } from "../utils/saymbot";
import sendNotification from "../utils/sendNotification";
import { type PushNotificationModel } from "../../../shared/models/NotificationModels";
import generateId from "../utils/idGenerator";

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

        if (newGameResponse && playerTwoId) {
            await notifyOtherPlayerOfNewGame(
                playerId,
                playerTwoId,
                newGameResponse,
            );
        }
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
            TurnResponseModel,
            TurnCreateModel
        >,
        res: Response<TurnResponseModel, ResponseLocals>,
    ) => {
        const {
            params: { gameId },
            body: { text },
        } = req;
        const {
            locals: { playerId },
        } = res;

        const turn = createTurn(text);
        const updatedGame = await addTurnToGame(turn, playerId, gameId);
        if (
            !updatedGame.isGameComplete &&
            updatedGame.playerTwo?._id === botName
        ) {
            scheduleBotTurn(updatedGame);
        }

        res.send({
            turn,
            game: updatedGame,
        });

        if (
            updatedGame.playerOneTurns.length ===
            updatedGame.playerTwoTurns.length
        ) {
            const otherPlayerId = getOtherPlayer(playerId, updatedGame)?._id;
            if (otherPlayerId) {
                await notifyOtherPlayerOfMove(
                    playerId,
                    otherPlayerId,
                    updatedGame,
                );
            }
        }
    },
);

gamesApi.post(
    "/:gameId/messages",
    async (
        req: Request<
            Record<string, string>,
            MessageResponseModel,
            MessageCreateModel
        >,
        res: Response<MessageResponseModel, ResponseLocals>,
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

        const message = createMessage(playerId, text);

        if (!message.text || message.text.length > 250) {
            res.status(400).send();
        }

        const game = await gamesDbApi.createMessage({
            playerId,
            gameId,
            message,
        });

        if (game) {
            res.send({
                message,
                game,
            });
            sendWebsocketGameUpdate(playerId, game);
            const otherPlayerId = getOtherPlayer(playerId, game)?._id;
            if (otherPlayerId) {
                await notifyOtherPlayerOfMessage(playerId, otherPlayerId, game);
            }
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
            MessageResponseModel,
            MessageUpdateModel
        >,
        res: Response<MessageResponseModel, ResponseLocals>,
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

        const game = await gamesDbApi.updateMessage({
            playerId,
            gameId,
            messageId,
            readByOtherPlayer,
        });

        const message = game?.messages.find(
            (message) => message._id === messageId,
        );

        if (game && message) {
            res.send({
                message,
                game,
            });
            sendWebsocketGameUpdate(playerId, game);
        } else {
            res.status(404).send();
        }
    },
);

async function notifyOtherPlayerOfNewGame(
    playerId: string,
    otherPlayerId: string,
    game: GameResponseModel,
) {
    const currentPlayer = getCurrentPlayer(playerId, game);
    const currentPlayerUsername = currentPlayer?.username ?? "Your friend";
    const url = `https://${process.env.SAYM_DOMAIN}/games/${game._id}`;
    const notification: PushNotificationModel = {
        playerId: otherPlayerId,
        url,
        title: "Join The Saym Game!",
        message: `${currentPlayerUsername} just started a new game with you. Tap here to join.`,
    };

    await sendNotification(notification);
}

async function notifyOtherPlayerOfMove(
    playerId: string,
    otherPlayerId: string,
    game: GameResponseModel,
) {
    const currentPlayer = getCurrentPlayer(playerId, game);
    const currentPlayerUsername = currentPlayer?.username ?? "Your friend";
    const url = `https://${process.env.SAYM_DOMAIN}/games/${game._id}`;
    const title = game.isGameComplete ? "Saym!" : "It's your move!";
    const message = game.isGameComplete
        ? `You and ${currentPlayerUsername} said the saym word!`
        : `${currentPlayerUsername} just made a move in your game!`;
    const notification: PushNotificationModel = {
        playerId: otherPlayerId,
        url,
        title,
        message,
    };

    await sendNotification(notification);
}

async function notifyOtherPlayerOfMessage(
    playerId: string,
    otherPlayerId: string,
    game: GameResponseModel,
) {
    const currentPlayer = getCurrentPlayer(playerId, game);
    let foundLastMessage = false;
    const secondToLastMessage = game.messages.findLast((message) => {
        if (message.playerId === playerId) {
            if (foundLastMessage) {
                return true;
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
    const notification: PushNotificationModel = {
        playerId: otherPlayerId,
        url,
        title: "You got a message!",
        message: `${currentPlayerUsername}: sent you a message - tap here to respond`,
    };

    await sendNotification(notification);
}

function createTurn(text: string): TurnModel {
    return {
        _id: generateId(),
        text: sanitize(text),
        timestamp: new Date().toISOString(),
    };
}

function createMessage(playerId: string, text: string): MessageModel {
    return {
        _id: generateId(),
        playerId,
        text: String(text).trim(),
        readByOtherPlayer: false,
        timestamp: new Date().toISOString(),
    };
}

async function addTurnToGame(
    turn: TurnModel,
    playerId: string,
    gameId: string,
): Promise<GameResponseModel> {
    return new Promise(async (resolve, reject) => {
        const currentGame = await gamesDbApi.get({ playerId, gameId });

        if (!currentGame) {
            reject(404);
            return;
        } else if (!turn.text || currentGame.isGameComplete) {
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
                  turn,
                  undefined,
                  currentGame.playerOneTurns,
                  currentGame.playerTwoTurns,
              ]
            : [
                  undefined,
                  turn,
                  currentGame.playerTwoTurns,
                  currentGame.playerOneTurns,
              ];

        if (!isValidTurn(turn, currentPlayerTurns, otherPlayerTurns)) {
            reject(400);
        }

        if (isWinningTurn(turn, currentPlayerTurns, otherPlayerTurns)) {
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
    return String(turn)
        .replace(/\s+/, " ")
        .replace(/[^0-9a-z\s]/gi, "");
}

function isValidTurn(
    turn: TurnModel,
    currentPlayerTurns: TurnModel[],
    otherPlayerTurns: TurnModel[],
): boolean {
    const maxTurnLength = 25;
    return (
        Boolean(turn) &&
        turn.text.length < maxTurnLength &&
        (currentPlayerTurns.length === otherPlayerTurns.length ||
            currentPlayerTurns.length === otherPlayerTurns.length - 1)
    );
}

function isWinningTurn(
    turn: TurnModel,
    currentPlayerTurns: TurnModel[],
    otherPlayerTurns: TurnModel[],
): boolean {
    return (
        currentPlayerTurns.length === otherPlayerTurns.length - 1 &&
        turn.text.trim().toLowerCase() ===
            otherPlayerTurns[otherPlayerTurns.length - 1].text
                .trim()
                .toLowerCase()
    );
}

function scheduleBotTurn(game: GameResponseModel) {
    setTimeout(async () => {
        const botTurnText = await generateTurnText(game);
        const botTurn = createTurn(botTurnText);
        void addTurnToGame(botTurn, botName, game._id);
    }, 1000);
}

export default gamesApi;
