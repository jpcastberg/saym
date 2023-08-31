import express, { type Request, type Response } from "express";
import { botName } from "../database";
import gamesDbApi from "../database/games";
import {
    type AllGamesResponseModel,
    type GameResponseModel,
    type GameUpdateModel,
    type GameWebsocketUpdateModel,
    type TurnCreateModel,
} from "../../../shared/models/GameModels";
import { type ResponseLocals } from "../models";
import { sendWebsocketMessage } from "../websocket";
import { generateTurn } from "../utils/saymbot";
import sendNotification from "../utils/sendNotification";

const gamesApi = express.Router();

gamesApi.get(
    "/",
    async (req, res: Response<AllGamesResponseModel, ResponseLocals>) => {
        const {
            locals: { userId },
        } = res;
        const allGames = await gamesDbApi.getAll(userId);
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
            GameUpdateModel
        >,
        res: Response<GameResponseModel, ResponseLocals>,
    ) => {
        const {
            locals: { userId },
        } = res;
        const {
            body: { playerOneUserId, playerTwoUserId },
        } = req;
        const newGameResponse = await gamesDbApi.create(
            playerOneUserId ?? userId,
            playerTwoUserId ?? null,
        );

        if (playerTwoUserId === botName) {
            await invite(newGameResponse!._id, userId, true);
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
            locals: { userId },
        } = res;
        const foundGame = await gamesDbApi.get(gameId, userId);
        res.send(foundGame ?? void 0);
    },
);

gamesApi.post(
    "/:gameId/join",
    async (req, res: Response<GameResponseModel, ResponseLocals>) => {
        const {
            params: { gameId },
        } = req;
        const {
            locals: { userId },
        } = res;

        const joinedGame = await gamesDbApi.update(
            userId,
            gameId,
            userId,
            null,
            null,
            null,
            null,
            null,
        );

        if (joinedGame) {
            res.send(joinedGame);
            sendWebsocketGameUpdate(userId, joinedGame);
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
            body: { turn },
        } = req;
        const {
            locals: { userId },
        } = res;

        const updatedGame = await addTurnToGame(turn, userId, gameId);
        if (
            !updatedGame.isGameComplete &&
            updatedGame.playerTwo?._id === botName
        ) {
            scheduleBotTurn(updatedGame);
        }
        res.send(updatedGame);
    },
);

gamesApi.post(
    "/:gameId/complete",
    async (req, res: Response<GameResponseModel, ResponseLocals>) => {
        const {
            params: { gameId },
        } = req;
        const {
            locals: { userId },
        } = res;
        const currentGame = await gamesDbApi.get(gameId, userId);

        if (!currentGame) {
            res.status(404).send();
            return;
        }

        const completedGame = await gamesDbApi.update(
            userId,
            gameId,
            null,
            null,
            null,
            null,
            null,
            true,
        );

        if (completedGame) {
            res.send(completedGame);
            sendWebsocketGameUpdate(userId, completedGame);
        } else {
            res.status(500).send();
        }
    },
);

gamesApi.post(
    "/:gameId/invite",
    async (req, res: Response<GameResponseModel, ResponseLocals>) => {
        const {
            params: { gameId },
        } = req;
        const {
            locals: { userId },
        } = res;

        const updatedGame = await invite(gameId, userId, false);

        res.send(updatedGame);
    },
);

gamesApi.post(
    "/:gameId/invite-bot",
    async (req, res: Response<GameResponseModel, ResponseLocals>) => {
        const {
            params: { gameId },
        } = req;
        const {
            locals: { userId },
        } = res;

        const updatedGame = await invite(gameId, userId, true);
        scheduleBotTurn(updatedGame);

        res.send(updatedGame);
    },
);

gamesApi.post(
    "/:gameId/nudge",
    async (req, res: Response<GameResponseModel, ResponseLocals>) => {
        const {
            params: { gameId },
        } = req;
        const {
            locals: { userId },
        } = res;

        const game = await gamesDbApi.get(gameId, userId);

        if (game) {
            const [currentPlayer, otherPlayer] = isPlayerOne(userId, game)
                ? [game.playerOne, game.playerTwo]
                : [game.playerTwo, game.playerOne];

            if (otherPlayer && !game.nudgeWasSent) {
                await sendNotification(otherPlayer._id, {
                    gameId,
                    pushTitle: "It's your move!",
                    pushMessage: `${currentPlayer?.username} sent you a nudge - tap here to make a move in your game`,
                    smsMessage: `${currentPlayer?.username} sent you a nudge - make a move in your game: https://saym.castberg.media/games/${gameId}`,
                });

                await gamesDbApi.update(
                    userId,
                    gameId,
                    null,
                    null,
                    null,
                    null,
                    true,
                    null,
                );
            }

            res.send();
        } else {
            res.status(404).send();
        }
    },
);

async function invite(
    gameId: string,
    userId: string,
    inviteBot: boolean,
): Promise<GameResponseModel> {
    return new Promise(async (resolve, reject) => {
        const currentGame = await gamesDbApi.get(gameId, userId);

        if (!currentGame) {
            reject(404);
            return;
        }

        const dbResponse = await gamesDbApi.update(
            userId,
            gameId,
            inviteBot ? botName : null,
            null,
            null,
            false,
            null,
            null,
        );

        if (dbResponse) {
            resolve(dbResponse);
        }
    });
}

async function addTurnToGame(
    turn: string,
    userId: string,
    gameId: string,
): Promise<GameResponseModel> {
    return new Promise(async (resolve, reject) => {
        const currentGame = await gamesDbApi.get(gameId, userId);
        const sanitizedTurn = sanitize(turn);

        if (!currentGame) {
            reject(404);
            return;
        } else if (!sanitizedTurn || currentGame.isGameComplete) {
            reject(400);
            return;
        }

        let isGameComplete: boolean | null = null;

        const [
            playerOneTurn,
            playerTwoTurn,
            currentPlayerTurns,
            otherPlayerTurns,
        ] = isPlayerOne(userId, currentGame)
            ? [
                  sanitizedTurn,
                  null,
                  currentGame.playerOneTurns,
                  currentGame.playerTwoTurns,
              ]
            : [
                  null,
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

        const updatedNudgeWasSent =
            currentPlayerTurns.length + 1 === otherPlayerTurns.length
                ? false
                : null; // reset nudge status if we are starting a new round

        const updatedGame = await gamesDbApi.update(
            userId,
            gameId,
            null,
            playerOneTurn,
            playerTwoTurn,
            null,
            updatedNudgeWasSent,
            isGameComplete,
        );

        if (updatedGame) {
            resolve(updatedGame);
            sendWebsocketGameUpdate(userId, updatedGame);
        } else {
            reject(500); // todo: replace with real errors
        }
    });
}

function sendWebsocketGameUpdate(
    userId: string,
    updatedGame: GameResponseModel,
) {
    const otherPlayerUserId = isPlayerOne(userId, updatedGame)
        ? updatedGame.playerTwo?._id
        : updatedGame.playerOne?._id;
    if (otherPlayerUserId) {
        sendWebsocketMessage(
            otherPlayerUserId,
            JSON.stringify({
                eventType: "gameUpdate",
                data: updatedGame,
            } as GameWebsocketUpdateModel),
        );
    }
}

function isPlayerOne(userId: string, game: GameResponseModel) {
    return game.playerOne?._id === userId;
}

function sanitize(turn: string): string {
    return turn.replace(/\s+/, " ").replace(/[^0-9a-z\s]/gi, "");
}

function isValidTurn(
    turn: string,
    currentPlayerTurns: string[],
    otherPlayerTurns: string[],
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
    currentPlayerTurns: string[],
    otherPlayerTurns: string[],
): boolean {
    return (
        currentPlayerTurns.length === otherPlayerTurns.length - 1 &&
        turn.trim().toLowerCase() ===
            otherPlayerTurns[otherPlayerTurns.length - 1].trim().toLowerCase()
    );
}

function scheduleBotTurn(game: GameResponseModel) {
    setTimeout(async () => {
        const botTurn = await generateTurn(game);
        void addTurnToGame(botTurn, botName, game._id);
    }, 2000);
}

export default gamesApi;
