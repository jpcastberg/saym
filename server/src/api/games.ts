import express, { Request, Response } from "express";
import { gamesDbApi } from "../database";
import {
    AllGamesResponseModel,
    GameResponseModel,
    GameUpdateModel,
    GameWebsocketUpdateModel,
    TurnCreateModel,
} from "../../../shared/models/GameModels";
import { ResponseLocals } from "../models/models";
import { sendWebsocketMessage } from "../websocket";

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
        console.log(
            `found game with id: ${gameId} associated w user ${userId}: ${JSON.stringify(
                foundGame,
            )}`,
        );
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
        const currentGame = await gamesDbApi.get(gameId, userId);
        const sanitizedTurn = sanitize(turn);

        if (!currentGame) {
            res.status(404).send();
            return;
        } else if (!sanitizedTurn || currentGame.isGameComplete) {
            res.status(400).send();
            return;
        }

        let playerOneTurn: string | null = null;
        let playerTwoTurn: string | null = null;
        let isGameComplete: boolean | null = null;
        let otherPlayerUserId: string | null = null;

        if (currentGame.playerOne?._id === userId) {
            playerOneTurn = sanitizedTurn;
            otherPlayerUserId = currentGame.playerTwo?._id ?? null;
        } else if (currentGame.playerTwo?._id === userId) {
            playerTwoTurn = sanitizedTurn;
            otherPlayerUserId = currentGame.playerOne?._id ?? null;
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
            res.status(400);
            res.send();
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

        res.send(updatedGame ?? void 0);

        if (otherPlayerUserId) {
            console.log();
            sendWebsocketMessage(
                otherPlayerUserId,
                JSON.stringify({
                    eventType: "gameUpdate",
                    data: updatedGame,
                } as GameWebsocketUpdateModel),
            );
        }
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
        const currentGame = await gamesDbApi.get(gameId, userId);

        if (!currentGame) {
            res.status(404).send();
            return;
        }

        const dbResponse = await gamesDbApi.update(
            userId,
            gameId,
            null,
            null,
            null,
            false,
            null,
        );
        res.send(dbResponse ?? void 0);
    },
);

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

export default gamesApi;
