import express, { Request, Response } from "express";
import { gamesDbApi, botName } from "../database";
import {
    AllGamesResponseModel,
    GameResponseModel,
    GameUpdateModel,
    GameWebsocketUpdateModel,
    TurnCreateModel,
} from "../../../shared/models/GameModels";
import { ResponseLocals } from "../models/models";
import { sendWebsocketMessage } from "../websocket";
import { generateTurn } from "../utils/saymbot";

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
        );

        if (joinedGame) {
            res.send(joinedGame);
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

        if (
            currentGame.playerOneTurns.length ===
            currentGame.playerTwoTurns.length
        ) {
            const dbResponse = await gamesDbApi.update(
                userId,
                gameId,
                null,
                null,
                null,
                null,
                true,
            );
            res.send(dbResponse ?? void 0);
        } else {
            res.status(400).send();
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

        let playerOneTurn: string | null = null;
        let playerTwoTurn: string | null = null;
        let isGameComplete: boolean | null = null;

        if (isPlayerOne(userId, currentGame)) {
            playerOneTurn = sanitizedTurn;
        } else {
            playerTwoTurn = sanitizedTurn;
        }

        if (
            (playerOneTurn &&
                !isValidTurn(
                    playerOneTurn,
                    currentGame.playerOneTurns,
                    currentGame.playerTwoTurns,
                )) ??
            (playerTwoTurn &&
                !isValidTurn(
                    playerTwoTurn,
                    currentGame.playerTwoTurns,
                    currentGame.playerOneTurns,
                ))
        ) {
            reject(400);
        }

        if (
            (playerOneTurn &&
                isWinningTurn(
                    playerOneTurn,
                    currentGame.playerOneTurns,
                    currentGame.playerTwoTurns,
                )) ??
            (playerTwoTurn &&
                isWinningTurn(
                    playerTwoTurn,
                    currentGame.playerTwoTurns,
                    currentGame.playerOneTurns,
                ))
        ) {
            isGameComplete = true;
        }

        const updatedGame = await gamesDbApi.update(
            userId,
            gameId,
            null,
            playerOneTurn,
            playerTwoTurn,
            null,
            isGameComplete,
        );

        if (updatedGame) {
            resolve(updatedGame);

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
        } else {
            reject(500); // todo: replace with real errors
        }
    });
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
    // todo: regex validation?
    return (
        Boolean(turn) &&
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
