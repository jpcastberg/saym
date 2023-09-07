import { type Server } from "http";
import { type AddressInfo } from "net";
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import request, { type Response } from "supertest";
// import twilio from "twilio";
import app from "../src/app";
import { dbClose, connectOptions } from "../src/database";
import {
    // type AllGamesResponseModel,
    type GameResponseModel,
} from "../../shared/models/GameModels";
import {
    PlayerModel,
    PlayerUpdateModel,
} from "../../shared/models/PlayerModels";
// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const from = process.env.TWILIO_PHONE_NUMBER;

// const client = twilio(accountSid, authToken);

const playerOneUsername = "player one";
const playerTwoUsername = "player two";

interface TestPlayer extends PlayerModel {
    token: string;
}

interface ApiResponse extends Response {
    header: Record<string, string>;
}

interface PlayerResponse extends ApiResponse {
    body: PlayerModel;
}

// interface AllGamesResponse extends ApiResponse {
//     body: AllGamesResponseModel;
// }

interface GameResponse extends ApiResponse {
    body: GameResponseModel;
}

let runningApp: Server;

beforeEach(() => {
    runningApp = app.listen(0, function () {
        // @ts-expect-error - type of address will always be AddressInfo in this case
        const address: AddressInfo = runningApp.address();
        console.log(`App is listening on port ${address.port}`);
        connectOptions.force = true;
    });
});

afterEach(async () => {
    runningApp.close();
    await dbClose();
});

describe("Test the root path", () => {
    test("It should respond to the GET method", async () => {
        const response = await apiRequest("get", "/", null);
        expect(response.statusCode).toBe(200);
    });
});

describe("Access Tokens", () => {
    test("It should provide a new access token if one is not passed", async () => {
        const response = await apiRequest("get", "/", null);
        const cookieHeader = getCookieHeader(response);
        expect(cookieHeader).toMatch(
            /token=[A-Z\d]+; Path=\/; Expires=[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} [0-9]{2}:[0-9]{2}:[0-9]{2} GMT; HttpOnly; Secure; SameSite=Strict/,
        );
    });

    test("It should return the same access token if one is passed", async () => {
        const newToken = await createToken();
        const response = (await apiRequest(
            "get",
            "/",
            newToken,
        )) as ApiResponse;
        const parsedToken = getToken(getCookieHeader(response));
        expect(parsedToken).toBe(newToken);
    });
});

describe("Games", () => {
    // test("It should return the player's games, separated by current and finished", async () => {
    //     void request(runningApp)
    //         .get("/api/games")
    //         .then((response: AllGamesResponse) => {
    //             expect(response.body.currentGames).toHaveLength(0);
    //             expect(response.body.finishedGames).toHaveLength(0);
    //         });
    // });

    test("It should allow a player to create a new game", async () => {
        const token = await createToken();
        const newGame = await createGame(token);

        expect(typeof newGame._id).toBe("string");
        expect(newGame._id).toBeTruthy();

        expect(newGame).toHaveProperty("playerOne");
        expect(newGame.playerOne).toHaveProperty("_id");
        expect(newGame.playerOne).toHaveProperty("username");
        expect(newGame.playerTwo).toBe(undefined);

        expect(Array.isArray(newGame.playerOneTurns)).toBe(true);
        expect(newGame.playerOneTurns).toHaveLength(0);

        expect(Array.isArray(newGame.playerTwoTurns)).toBe(true);
        expect(newGame.playerTwoTurns).toHaveLength(0);

        expect(newGame.isGameComplete).toBe(false);
    });

    test("It should allow a player to join an existing game", async () => {
        const playerOne = await createNewPlayer(playerOneUsername, false);
        const playerTwo = await createNewPlayer(playerTwoUsername, false);
        let game = await createGame(playerOne.token);
        game = await joinGame(game._id, playerTwo.token);

        expect(game.playerOne?._id).toBe(playerOne._id);
        expect(game.playerOne?.username).toBe(playerOne.username);

        expect(game.playerTwo?._id).toBe(playerTwo._id);
        expect(game.playerTwo?.username).toBe(playerTwo.username);

        expect(game.playerOne?._id).not.toEqual(game.playerTwo?._id);

        expect(Array.isArray(game.playerOneTurns)).toBe(true);
        expect(game.playerOneTurns).toHaveLength(0);

        expect(Array.isArray(game.playerTwoTurns)).toBe(true);
        expect(game.playerTwoTurns).toHaveLength(0);

        expect(game.isGameComplete).toBe(false);
    });

    test("It should allow a players to take turns until they match words", async () => {
        const playerOne = await createNewPlayer(playerOneUsername, false);
        const playerTwo = await createNewPlayer(playerTwoUsername, false);
        let game = await createGame(playerOne.token);
        game = await joinGame(game._id, playerTwo.token);
        game = await takeTurn(game._id, playerOne.token, "turn 1");

        expect(game.playerOneTurns).toEqual(["turn 1"]);
        expect(game.isGameComplete).toBe(false);

        game = await takeTurn(game._id, playerTwo.token, "turn 2");

        expect(game.playerTwoTurns).toEqual(["turn 2"]);
        expect(game.isGameComplete).toBe(false);

        game = await takeTurn(game._id, playerOne.token, "matching turn");

        expect(game.playerOneTurns).toEqual(["turn 1", "matching turn"]);
        expect(game.isGameComplete).toBe(false);

        game = await takeTurn(game._id, playerTwo.token, "matching turn");

        expect(game.playerOneTurns).toEqual(["turn 1", "matching turn"]);
        expect(game.playerTwoTurns).toEqual(["turn 2", "matching turn"]);
        expect(game.isGameComplete).toBe(true);
    });
});

async function createToken() {
    const response = (await request(runningApp).get("/")) as ApiResponse;
    const createdToken = getToken(getCookieHeader(response))!;
    return createdToken;
}

async function createNewPlayer(
    username: string,
    sendNotifications: boolean,
): Promise<TestPlayer> {
    const playerUpdates: PlayerUpdateModel = {
        username,
        sendNotifications,
    };
    const playerResponse = (await apiRequest(
        "put",
        "/api/players/me",
        null,
    ).send(playerUpdates)) as PlayerResponse;

    const token = getToken(getCookieHeader(playerResponse))!;

    return {
        token,
        ...playerResponse.body,
    };
}

async function createGame(token: string): Promise<GameResponseModel> {
    const gameResponse = (await apiRequest(
        "post",
        "/api/games",
        token,
    )) as GameResponse;
    return gameResponse.body;
}

async function joinGame(
    gameId: string,
    token: string,
): Promise<GameResponseModel> {
    const gameResponse = (await apiRequest(
        "post",
        `/api/games/${gameId}/join`,
        token,
    )) as GameResponse;
    return gameResponse.body;
}

async function takeTurn(
    gameId: string,
    token: string,
    turn: string,
): Promise<GameResponseModel> {
    const gameResponse = (await apiRequest(
        "post",
        `/api/games/${gameId}/turns`,
        token,
    ).send({ turn })) as GameResponse;
    return gameResponse.body;
}

function apiRequest(
    method: "get" | "post" | "put" | "delete",
    path: string,
    token: string | null,
) {
    let req = request(runningApp)[method](path);

    if (token) {
        req = req.set("Cookie", `token=${token}`);
    }

    return req;
}

function getCookieHeader(response: ApiResponse): string {
    const {
        header: {
            "set-cookie": [cookieHeader],
        },
    } = response;
    return cookieHeader;
}

function getToken(cookieHeader: string): string | undefined {
    return cookieHeader.match(/^token=([A-Z\d]+);/)?.[1];
}
