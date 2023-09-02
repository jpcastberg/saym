import express, { type Request, type Response } from "express";
import { botName } from "../../../shared/models/PlayerModels";
import gamesDbApi from "../database/games";
import {
    type AllGamesResponseModel,
    type GameResponseModel,
    type GameUpdateModel,
    type GameWebsocketUpdateModel,
    type TurnCreateModel,
    type MessageUpdateModel,
    type MessageCreateModel,
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
            locals: { playerId },
        } = res;
        const allGames = await gamesDbApi.getAll(playerId);
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
            locals: { playerId },
        } = res;
        const {
            body: { playerOneId, playerTwoId },
        } = req;
        const newGameResponse = await gamesDbApi.create(
            playerOneId ?? playerId,
            playerTwoId ?? null,
        );

        if (playerTwoId === botName) {
            await invite(newGameResponse!._id, playerId, true);
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
        const foundGame = await gamesDbApi.get(playerId, gameId);
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
            locals: { playerId },
        } = res;

        const joinedGame = await gamesDbApi.update(
            playerId,
            gameId,
            playerId,
            null,
            null,
            null,
            null,
            null,
        );

        if (joinedGame) {
            res.send(joinedGame);
            sendWebsocketGameUpdate(playerId, joinedGame);
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
            locals: { playerId },
        } = res;

        const updatedGame = await addTurnToGame(turn, playerId, gameId);
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

        const gameResponse = await gamesDbApi.createMessage(
            playerId,
            gameId,
            text,
        );

        if (gameResponse) {
            res.send(gameResponse);
            sendWebsocketGameUpdate(playerId, gameResponse);
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

        console.log("received update message request", req.body);

        const updatedGame = await gamesDbApi.updateMessage(
            playerId,
            gameId,
            messageId,
            readByOtherPlayer,
        );

        if (updatedGame) {
            res.send(updatedGame);
            sendWebsocketGameUpdate(playerId, updatedGame);
        } else {
            res.status(404).send();
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
            locals: { playerId },
        } = res;
        const currentGame = await gamesDbApi.get(playerId, gameId);

        if (!currentGame) {
            res.status(404).send();
            return;
        }

        const completedGame = await gamesDbApi.update(
            playerId,
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
            sendWebsocketGameUpdate(playerId, completedGame);
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
            locals: { playerId },
        } = res;

        const updatedGame = await invite(gameId, playerId, false);

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
            locals: { playerId },
        } = res;

        const updatedGame = await invite(gameId, playerId, true);
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
            locals: { playerId },
        } = res;

        const game = await gamesDbApi.get(playerId, gameId);

        if (game) {
            const [currentPlayer, otherPlayer] = isPlayerOne(playerId, game)
                ? [game.playerOne, game.playerTwo]
                : [game.playerTwo, game.playerOne];

            const currentPlayerUsername =
                currentPlayer?.username ?? "Your friend";

            if (otherPlayer && !game.nudgeWasSent) {
                await sendNotification(otherPlayer._id, {
                    gameId,
                    pushTitle: "It's your move!",
                    pushMessage: `${currentPlayerUsername} sent you a nudge - tap here to make a move in your game`,
                    smsMessage: `${currentPlayerUsername} sent you a nudge - make a move in your game: https://saym.castberg.media/games/${gameId}`,
                });

                await gamesDbApi.update(
                    playerId,
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
    playerId: string,
    inviteBot: boolean,
): Promise<GameResponseModel> {
    return new Promise(async (resolve, reject) => {
        const currentGame = await gamesDbApi.get(playerId, gameId);

        if (!currentGame) {
            reject(404);
            return;
        }

        const updatedGame = await gamesDbApi.update(
            playerId,
            gameId,
            inviteBot ? botName : null,
            null,
            null,
            false,
            null,
            null,
        );

        if (updatedGame) {
            resolve(updatedGame);
        }
    });
}

async function addTurnToGame(
    turn: string,
    playerId: string,
    gameId: string,
): Promise<GameResponseModel> {
    return new Promise(async (resolve, reject) => {
        const currentGame = await gamesDbApi.get(playerId, gameId);
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
        ] = isPlayerOne(playerId, currentGame)
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
            playerId,
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
        : updatedGame.playerOne?._id;
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
    return game.playerOne?._id === playerId;
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
