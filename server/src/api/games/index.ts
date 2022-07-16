import express from "express";
import { WithId } from "mongodb";
import { GameModel, gamesDbApi } from "../../database";

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
    const { "params": { gameId }, "body": { turn } } = req;
    const { "locals": { userId } } = res;
    const currentGame = await gamesDbApi.get(gameId, userId);
    let playerOneTurn: string | null = null;
    let playerTwoTurn: string | null = null;
    let isGameComplete: boolean | null = null;

    if (!turn) {
        // 400
        return;
    } else if (!currentGame) {
        // 404
        return;
    }

    if (currentGame.player_one_turns.length ===
        currentGame.player_two_turns.length &&
        currentGame.player_one_user_id === userId) {
        playerOneTurn = turn;
    } else if (currentGame.player_one_turns.length ===
        currentGame.player_two_turns.length + 1 &&
        currentGame.player_two_user_id === userId)  {
        playerTwoTurn = turn;

        if (currentGame.player_one_turns[currentGame.player_one_turns.length - 1]
            .toLowerCase() === turn.toLowerCase()) {
            isGameComplete = true;
        }
    }

    gamesDbApi.update(userId, gameId, null,
        playerOneTurn, playerTwoTurn, isGameComplete);
    const game = gamesDbApi.get(gameId, userId);
    res.send(game);
});

gamesApi.post("/:gameId/complete", async (req, res) => {
    const { "params": { gameId } } = req;
    const { "locals": { userId } } = res;
    const currentGame = await gamesDbApi.get(gameId, userId);
    let dbResponse: WithId<GameModel> | null = null;

    if (!currentGame) {
        // 404
        return;
    }

    if (currentGame.player_one_turns.length === currentGame.player_two_turns.length) {
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

export default gamesApi;
