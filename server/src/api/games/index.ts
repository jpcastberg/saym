import express from "express";
import { WithId } from "mongodb";
import { gamesDbApi } from "../../database";
import { GameModel } from "../../../../shared/models/GameModels";

const gamesApi = express.Router();

gamesApi.get("/", async (req, res) => {
    const { "locals": { userId } } = res;
    const dbResponse = await gamesDbApi.getAll(userId);
    res.send(dbResponse);
});

gamesApi.post("/", async (req, res) => {
    const { "locals": { userId } } = res;
    const { "body": { playerOneUserId, playerTwoUserId } } = req;
    const newGameResponse = await gamesDbApi.create(playerOneUserId || userId, playerTwoUserId);
    const game = await gamesDbApi.get(newGameResponse.insertedId.toString(), userId);
    res.send(game);
});

gamesApi.get("/:gameId", async (req, res) => {
    const { "params": { gameId } } = req;
    const { "locals": { userId } } = res;
    const dbResponse = await gamesDbApi.get(gameId, userId);
    console.log(`found game with id: ${gameId} associated w user ${userId}: ${JSON.stringify(dbResponse)}`);
    res.send(dbResponse);
});

gamesApi.post("/:gameId/join", async (req, res) => {
    const { "params": { gameId } } = req;
    const { "locals": { userId } } = res;
    gamesDbApi.update(userId, gameId, userId, null, null, null);
    const game = await gamesDbApi.get(gameId, userId);
    res.send(game);
});

gamesApi.post("/:gameId/turns", async (req, res) => {
    console.log("called /turns");
    const { "params": { gameId }, "body": { turn } } = req;
    const { "locals": { userId } } = res;
    const currentGame = await gamesDbApi.get(gameId, userId);
    const sanitizedTurn = sanitize(turn);
    let playerOneTurn: string | null = null;
    let playerTwoTurn: string | null = null;
    let isGameComplete: boolean | null = null;

    if (!currentGame) {
        res.status(404);
        res.send();
        return;
    } else if (!sanitizedTurn || currentGame.isGameComplete) {
        res.status(400);
        res.send();
        return;
    }

    if (currentGame.playerOneUserId === userId) {
        playerOneTurn = sanitizedTurn;
    } else if (currentGame.playerTwoUserId === userId) {
        playerTwoTurn = sanitizedTurn;
    }

    if ((playerOneTurn && !isValidTurn(playerOneTurn, currentGame.playerOneTurns, currentGame.playerTwoTurns)) ||
        (playerTwoTurn && !isValidTurn(playerTwoTurn, currentGame.playerTwoTurns, currentGame.playerOneTurns))) {
        res.status(400);
        res.send();
    }

    if (playerOneTurn && isWinningTurn(playerOneTurn, currentGame.playerOneTurns, currentGame.playerTwoTurns) ||
        playerTwoTurn && isWinningTurn(playerTwoTurn, currentGame.playerTwoTurns, currentGame.playerOneTurns)) {
        isGameComplete = true;
    }

    await gamesDbApi.update(userId, gameId, null,
        playerOneTurn, playerTwoTurn, isGameComplete);
    const game = await gamesDbApi.get(gameId, userId);
    res.send(game);
});

gamesApi.post("/:gameId/complete", async (req, res) => { // manually mark game as complete
    const { "params": { gameId } } = req;
    const { "locals": { userId } } = res;
    const currentGame = await gamesDbApi.get(gameId, userId);
    let dbResponse: WithId<GameModel> | null = null;

    if (!currentGame) {
        // 404
        return;
    }

    if (currentGame.playerOneTurns.length === currentGame.playerTwoTurns.length) {
        dbResponse = await gamesDbApi.update(userId, gameId, null, null, null, true);
    } else {
        // 400
    }

    res.send(dbResponse);
});

gamesApi.post("/:gameId/notifications", (req, res) => {
    // post word
    res.send("Hello World!");
});

function sanitize(turn: string): string {
    return turn.replace(/\s+/, " ").replace(/[^0-9a-z\s]/gi, "");
}

function isValidTurn(turn: string, currentPlayerTurns: string[], otherPlayerTurns: string[]): boolean {
    // todo: regex validation?
    return Boolean(turn) && (currentPlayerTurns.length === otherPlayerTurns.length || currentPlayerTurns.length === otherPlayerTurns.length - 1);
}

function isWinningTurn(turn: string, currentPlayerTurns: string[], otherPlayerTurns: string[]): boolean {
    return currentPlayerTurns.length === otherPlayerTurns.length - 1 &&
        turn.trim().toLowerCase() === otherPlayerTurns[otherPlayerTurns.length - 1].trim().toLowerCase();
}

export default gamesApi;
