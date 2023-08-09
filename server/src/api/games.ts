import express, { Request, Response } from "express";
import { WithId } from "mongodb";
import { gamesDbApi } from "../database";
import {
    GameModel,
    GameRequestModel,
    TurnRequestModel,
} from "../../../shared/models/GameModels";
import { ResponseLocals } from "../models/models";
import { sendWebsocketMessage } from "../websocket";

const gamesApi = express.Router();

gamesApi.get(
    "/",
    async (req, res: Response<WithId<GameModel>[], ResponseLocals>) => {
        const {
            locals: { userId },
        } = res;
        const allGames = await gamesDbApi.getAll(userId);
        res.send(allGames);
    },
);

gamesApi.post(
    "/",
    async (
        req: Request<
            Record<string, never>,
            WithId<GameModel>,
            GameRequestModel
        >,
        res: Response<WithId<GameModel>, ResponseLocals>,
    ) => {
        const {
            locals: { userId },
        } = res;
        const {
            body: { playerOneUserId, playerTwoUserId },
        } = req;
        const newGameResponse = await gamesDbApi.create(
            playerOneUserId ?? userId,
            playerTwoUserId ?? "",
        );
        const game = await gamesDbApi.get(
            newGameResponse.insertedId.toString(),
            userId,
        );

        if (game) {
            res.send(game);
        } else {
            res.status(500);
        }
    },
);

gamesApi.get(
    "/:gameId",
    async (req, res: Response<WithId<GameModel>, ResponseLocals>) => {
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
    async (req, res: Response<WithId<GameModel>, ResponseLocals>) => {
        const {
            params: { gameId },
        } = req;
        const {
            locals: { userId },
        } = res;

        await gamesDbApi.update(userId, gameId, userId, null, null, null);
        const joinedGame = await gamesDbApi.get(gameId, userId);

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
            Record<string, never>,
            WithId<GameModel>,
            TurnRequestModel
        >,
        res: Response<WithId<GameModel>, ResponseLocals>,
    ) => {
        console.log(`called /turns`);
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

        if (currentGame.playerOneUserId === userId) {
            playerOneTurn = sanitizedTurn;
            otherPlayerUserId = currentGame.playerTwoUserId;
        } else if (currentGame.playerTwoUserId === userId) {
            playerTwoTurn = sanitizedTurn;
            otherPlayerUserId = currentGame.playerOneUserId;
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

        await gamesDbApi.update(
            userId,
            gameId,
            null,
            playerOneTurn,
            playerTwoTurn,
            isGameComplete,
        );

        const game = await gamesDbApi.get(gameId, userId);
        res.send(game ?? void 0);

        if (otherPlayerUserId) {
            sendWebsocketMessage(otherPlayerUserId, JSON.stringify(game));
        }
    },
);

gamesApi.post("/:gameId/complete", async (req, res: Response<WithId<GameModel>, ResponseLocals>) => {
    const {
        params: { gameId },
    } = req;
    const {
        locals: { userId },
    } = res;
    const currentGame = await gamesDbApi.get(gameId, userId);
    let dbResponse: WithId<GameModel> | null = null;

    if (!currentGame) {
        res.status(404).send();
        return;
    }

    if (
        currentGame.playerOneTurns.length === currentGame.playerTwoTurns.length
    ) {
        dbResponse = await gamesDbApi.update(
            userId,
            gameId,
            null,
            null,
            null,
            true,
        );
        res.send(dbResponse ?? void 0);
    } else {
        res.status(400).send();
    }
});

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
