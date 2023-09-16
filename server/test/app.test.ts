import { type Server } from "http";
import { type AddressInfo } from "net";
import {
    MessageInstance,
    type MessageListInstanceEachOptions,
} from "twilio/lib/rest/api/v2010/account/message";
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import request, { type Response } from "supertest";
import twilio from "twilio";
import app from "../src/app";
import { dbClose, connectOptions } from "../src/database";
import {
    type AllGamesResponseModel,
    type GameResponseModel,
} from "../../shared/models/GameModels";
import {
    PlayerModel,
    PlayerUpdateModel,
    VerifyPhoneResponseModel,
    botName,
} from "../../shared/models/PlayerModels";
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

interface TestPlayer extends PlayerModel {
    token: string;
}

interface ApiResponse extends Response {
    header: Record<string, string>;
}

interface PlayerResponse extends ApiResponse {
    body: PlayerModel;
}

interface TestVerifyPhoneResponseModel extends VerifyPhoneResponseModel {
    player: TestPlayer;
}

interface AllGamesResponse extends ApiResponse {
    body: AllGamesResponseModel;
}

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

describe("test the root path", () => {
    it("should respond to the GET method", async () => {
        const response = await apiRequest("get", "/", null);
        expect(response.statusCode).toBe(200);
    });
});

describe("access tokens", () => {
    it("should provide a new access token if one is not passed", async () => {
        const response = await apiRequest("get", "/", null);
        const cookieHeader = getCookieHeader(response);
        expect(cookieHeader).toMatch(
            /token=[A-Z\d]+; Path=\/; Expires=[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} [0-9]{2}:[0-9]{2}:[0-9]{2} GMT; HttpOnly; Secure; SameSite=Strict/,
        );
    });

    it("should return the same access token if one is passed", async () => {
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

describe("games", () => {
    it("should return the player's games, separated by current and finished", async () => {
        const playerOne = await createNewPlayer("player one", false);

        let allGamesResponse = await getAllGames(playerOne.token);
        expect(allGamesResponse.currentGames).toHaveLength(0);
        expect(allGamesResponse.finishedGames).toHaveLength(0);

        let game = await createGame(playerOne.token);

        allGamesResponse = (
            await apiRequest("get", "/api/games", playerOne.token)
        ).body as AllGamesResponseModel;
        expect(allGamesResponse.currentGames).toHaveLength(1);
        expect(allGamesResponse.currentGames[0]._id).toBe(game._id);

        game = (
            await apiRequest(
                "put",
                `/api/games/${game._id}`,
                playerOne.token,
            ).send({
                isGameComplete: true,
            })
        ).body as GameResponseModel;
        allGamesResponse = (
            await apiRequest("get", "/api/games", playerOne.token)
        ).body as AllGamesResponseModel;
        expect(allGamesResponse.currentGames).toHaveLength(0);
        expect(allGamesResponse.finishedGames).toHaveLength(1);
        expect(allGamesResponse.finishedGames[0]._id).toBe(game._id);
    });

    it("should allow a player to create a new game", async () => {
        const playerOne = await createNewPlayer("player one", false);
        const newGame = await createGame(playerOne.token);

        expect(typeof newGame._id).toBe("string");
        expect(newGame._id).toBeTruthy();

        expect(newGame).toHaveProperty("playerOne");
        expect(newGame.playerOne._id).toBe(playerOne._id);
        expect(newGame.playerOne.username).toBe(playerOne.username);
        expect(newGame.playerTwo).toBeUndefined();

        expect(Array.isArray(newGame.playerOneTurns)).toBe(true);
        expect(newGame.playerOneTurns).toHaveLength(0);

        expect(Array.isArray(newGame.playerTwoTurns)).toBe(true);
        expect(newGame.playerTwoTurns).toHaveLength(0);

        expect(newGame.isGameComplete).toBe(false);
    });

    it("should allow a player to get a game by id", async () => {
        const playerOne = await createNewPlayer("player one", false);
        const newGame = await createGame(playerOne.token);

        const gameResponse = (
            await apiRequest(
                "get",
                `/api/games/${newGame._id}`,
                playerOne.token,
            )
        ).body as GameResponseModel;

        expect(gameResponse).toStrictEqual(newGame);
    });

    it("should allow a player to join an existing game", async () => {
        const playerOne = await createNewPlayer("player one", false);
        const playerTwo = await createNewPlayer("player two", false);
        let game = await createGame(playerOne.token);
        console.log("created game", game);
        game = await joinGame(game._id, playerTwo.token, playerTwo._id);
        console.log("joined game", game);

        expect(game.playerOne._id).toBe(playerOne._id);
        expect(game.playerOne.username).toBe(playerOne.username);

        expect(game.playerTwo?._id).toBe(playerTwo._id);
        expect(game.playerTwo?.username).toBe(playerTwo.username);

        expect(game.playerOne._id).not.toStrictEqual(game.playerTwo?._id);

        expect(Array.isArray(game.playerOneTurns)).toBe(true);
        expect(game.playerOneTurns).toHaveLength(0);

        expect(Array.isArray(game.playerTwoTurns)).toBe(true);
        expect(game.playerTwoTurns).toHaveLength(0);

        expect(game.isGameComplete).toBe(false);
    });

    it("should not allow a player to join a game that already has two players", async () => {
        const playerOne = await createNewPlayer("player one", false);
        const playerTwo = await createNewPlayer("player two", false);
        const playerThree = await createNewPlayer("player three", false);
        const game = await createGame(playerOne.token);
        await joinGame(game._id, playerTwo.token, playerTwo._id);

        const response = await apiRequest(
            "put",
            `/api/games/${game._id}`,
            playerThree.token,
        ).send({
            playerTwoId: playerThree._id,
        });

        expect(response.status).toBe(404);
    });

    it("should allow players to take turns until they match words", async () => {
        const playerOne = await createNewPlayer("player one", false);
        const playerTwo = await createNewPlayer("player two", false);
        let game = await createGame(playerOne.token);
        game = await joinGame(game._id, playerTwo.token, playerTwo._id);
        game = await takeTurn(game._id, playerOne.token, "turn 1");

        expect(game.playerOneTurns).toHaveLength(1);
        expect(game.playerOneTurns[0].text).toBe("turn 1");
        expect(game.isGameComplete).toBe(false);

        game = await takeTurn(game._id, playerTwo.token, "turn 2");

        expect(game.playerTwoTurns).toHaveLength(1);
        expect(game.playerTwoTurns[0].text).toBe("turn 2");
        expect(game.isGameComplete).toBe(false);

        game = await takeTurn(game._id, playerOne.token, "matching turn");

        expect(game.playerOneTurns).toHaveLength(2);
        expect(game.playerOneTurns[1].text).toBe("matching turn");
        expect(game.isGameComplete).toBe(false);

        game = await takeTurn(game._id, playerTwo.token, "matching turn");

        expect(game.playerTwoTurns).toHaveLength(2);
        expect(game.playerTwoTurns[1].text).toBe("matching turn");
        expect(game.isGameComplete).toBe(true);
    });

    it("should allow players to send messages to one another", async () => {
        const playerOne = await createNewPlayer("player one", false);
        const playerTwo = await createNewPlayer("player two", false);
        const someMessage = "some message";
        const anotherMessage = "another message";
        let game = await createGame(playerOne.token);
        game = await joinGame(game._id, playerTwo.token, playerTwo._id);

        expect(game.messages).toHaveLength(0);

        game = await sendMessage(game._id, playerOne.token, someMessage);

        expect(game.messages).toHaveLength(1);
        expect(game.messages[0].playerId).toBe(playerOne._id);
        expect(game.messages[0].text).toBe(someMessage);
        expect(game.messages[0].readByOtherPlayer).toBe(false);

        game = await sendMessage(game._id, playerTwo.token, anotherMessage);
        expect(game.messages).toHaveLength(2);
        expect(game.messages[0].playerId).toBe(playerOne._id);
        expect(game.messages[0].text).toBe(someMessage);
        expect(game.messages[0].readByOtherPlayer).toBe(false);
        expect(game.messages[1].playerId).toBe(playerTwo._id);
        expect(game.messages[1].text).toBe(anotherMessage);
        expect(game.messages[1].readByOtherPlayer).toBe(false);

        game = await markMessageRead(
            game._id,
            game.messages[1]._id,
            playerOne.token,
        );
        expect(game.messages[1].readByOtherPlayer).toBe(true);
    });

    it("should allow for tracking if an invite has been sent for a game", async () => {
        const playerOne = await createNewPlayer("player one", false);
        let game = await createGame(playerOne.token);
        expect(game.needToInvitePlayer).toBe(true);
        game = (
            await apiRequest(
                "put",
                `/api/games/${game._id}`,
                playerOne.token,
            ).send({
                needToInvitePlayer: false,
            })
        ).body as GameResponseModel;
        expect(game.needToInvitePlayer).toBe(false);
    });

    it("should allow playing a game against a bot", async () => {
        const playerOne = await createNewPlayer("player one", false);
        let game = await createGame(playerOne.token);
        game = (
            await apiRequest(
                "put",
                `/api/games/${game._id}`,
                playerOne.token,
            ).send({
                playerTwoId: botName,
            })
        ).body as GameResponseModel;
        expect(game.playerTwo?._id).toBe(botName);
        expect(game.playerTwo?.username).toBe(botName);

        await waitForMs(2000); // shorter length, first turn is randomly chosen instead of bot generated
        game = await getGame(game._id, playerOne.token);
        expect(game.playerTwoTurns).toHaveLength(1);
        expect(game.playerTwoTurns[0].text.length).toBeGreaterThan(0);

        await takeTurn(game._id, playerOne.token, "some turn");
        await waitForMs(3000);
        game = await getGame(game._id, playerOne.token);
        expect(game.playerOneTurns).toHaveLength(1);
        expect(game.playerTwoTurns).toHaveLength(2);
        expect(game.playerTwoTurns[1].text.length).toBeGreaterThan(0);
    }, 8000);
});

describe("players", () => {
    it("allows a player to log in with phone number", async () => {
        const playerOne = await createNewPlayer("player one", false);
        expect(playerOne.phoneNumber).toBeNull();
        const verificationResponse = await verifyPhoneNumber(playerOne.token);
        expect(verificationResponse.didMerge).toBe(false);
        expect(verificationResponse.player._id).toBe(playerOne._id);
    }, 10000);

    it("merges an un-logged in profile with a logged in one when login occurs", async () => {
        let playerOne = await createNewPlayer("player one", false);
        let verificationResponse = await verifyPhoneNumber(playerOne.token);
        playerOne = verificationResponse.player!;
        let playerOneGame = await createGame(playerOne.token);

        let playerTwo = await createNewPlayer("player two", false);
        let playerThree = await createNewPlayer("player three", false);
        let playerTwoGame = await createGame(playerTwo.token);
        playerTwoGame = await joinGame(
            playerTwoGame._id,
            playerThree.token,
            playerThree._id,
        );
        const message = "hi this is my message";
        playerTwoGame = await sendMessage(
            playerTwoGame._id,
            playerTwo.token,
            message,
        );
        playerTwoGame = await sendMessage(
            playerTwoGame._id,
            playerThree.token,
            "hi this is my response!!",
        );
        verificationResponse = await verifyPhoneNumber(playerTwo.token);
        playerTwo = verificationResponse.player!;
        expect(verificationResponse.didMerge).toBe(true);
        expect(playerTwo._id).toBe(playerOne._id);
        expect(playerTwo.phoneNumber).toBe(playerOne.phoneNumber);

        const allPlayerOneGames = await getAllGames(playerOne.token);
        expect(allPlayerOneGames.currentGames).toHaveLength(2);
        const foundPlayerOneGame = allPlayerOneGames.currentGames.find(
            (game) => game._id === playerOneGame._id,
        );
        const foundPlayerTwoGame = allPlayerOneGames.currentGames.find(
            (game) => game._id === playerTwoGame._id,
        );
        const playerTwoGameMessages = foundPlayerTwoGame?.messages.filter(
            (message) => message.playerId === playerOne._id,
        );
        expect(foundPlayerOneGame?.playerOne._id).toBe(playerOne._id);
        expect(foundPlayerTwoGame?.playerOne._id).toBe(playerOne._id);
        expect(playerTwoGameMessages).toHaveLength(1);
        expect(playerTwoGameMessages![0].text).toBe(message);
    }, 7000);
});

async function createToken() {
    const response = (await request(runningApp).get("/")) as ApiResponse;
    const createdToken = getToken(getCookieHeader(response))!;
    return createdToken;
}

async function createNewPlayer(
    username: "player one" | "player two" | "player three",
    sendSmsNotifications: boolean,
): Promise<TestPlayer> {
    const playerUpdates: PlayerUpdateModel = {
        username,
        sendSmsNotifications,
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

async function getAllGames(token: string) {
    const allGamesResponse = (await apiRequest(
        "get",
        "/api/games",
        token,
    )) as AllGamesResponse;

    return allGamesResponse.body;
}

async function createGame(token: string): Promise<GameResponseModel> {
    const gameResponse = (await apiRequest(
        "post",
        "/api/games",
        token,
    )) as GameResponse;
    return gameResponse.body;
}

async function getGame(
    gameId: string,
    token: string,
): Promise<GameResponseModel> {
    const gameResponse = (await apiRequest(
        "get",
        `/api/games/${gameId}`,
        token,
    )) as GameResponse;
    return gameResponse.body;
}

async function joinGame(
    gameId: string,
    token: string,
    playerId: string,
): Promise<GameResponseModel> {
    const gameResponse = (await apiRequest(
        "put",
        `/api/games/${gameId}`,
        token,
    ).send({
        playerTwoId: playerId,
    })) as GameResponse;
    return gameResponse.body;
}

async function takeTurn(
    gameId: string,
    token: string,
    text: string,
): Promise<GameResponseModel> {
    const gameResponse = (await apiRequest(
        "post",
        `/api/games/${gameId}/turns`,
        token,
    ).send({ text })) as GameResponse;
    return gameResponse.body;
}

async function sendMessage(
    gameId: string,
    token: string,
    text: string,
): Promise<GameResponseModel> {
    const gameResponse = (await apiRequest(
        "post",
        `/api/games/${gameId}/messages`,
        token,
    ).send({ text })) as GameResponse;
    return gameResponse.body;
}

async function markMessageRead(
    gameId: string,
    messageId: string,
    token: string,
): Promise<GameResponseModel> {
    const gameResponse = (await apiRequest(
        "put",
        `/api/games/${gameId}/messages/${messageId}`,
        token,
    ).send({ readByOtherPlayer: true })) as GameResponse;
    return gameResponse.body;
}

async function verifyPhoneNumber(
    token: string,
): Promise<TestVerifyPhoneResponseModel> {
    const now = new Date(new Date().getTime() - 1000); // a bit more forgiving for the date filter
    await apiRequest(
        "post",
        "/api/players/me/request-phone-verification",
        token,
    ).send({ phoneNumber: twilioPhoneNumber });
    const sms = await getLatestSms(now);
    expect(sms).not.toBeNull();
    const code = getCodeFromMessage(sms!.body);
    expect(code).toHaveLength(6);
    const apiResponse = await apiRequest(
        "post",
        "/api/players/me/verify-phone",
        token,
    ).send({
        code,
    });

    const responseBody = apiResponse.body as VerifyPhoneResponseModel;

    const responseToken = getToken(getCookieHeader(apiResponse));

    expect(responseBody.player).not.toBeNull();
    expect(responseBody.player?.phoneNumber).toBe(twilioPhoneNumber);
    expect(responseBody.success).toBe(true);

    return {
        ...responseBody,
        player: {
            ...responseBody.player!,
            token: responseToken!,
        },
    };
}

async function getLatestSms(dateSentAfter: Date | null) {
    const options: MessageListInstanceEachOptions = {
        to: twilioPhoneNumber,
        from: twilioPhoneNumber,
        limit: 1,
    };

    if (dateSentAfter) {
        options.dateSentAfter = dateSentAfter;
    }

    const foundMessage = await waitUntil<MessageInstance>(() => {
        return new Promise((resolve) => {
            client.messages.each(options, (message) => {
                console.log("resolving message:", message);
                if (
                    (dateSentAfter &&
                        new Date(message.dateSent) >= dateSentAfter) ??
                    !dateSentAfter
                ) {
                    resolve(message);
                }
            });
        });
    });

    return foundMessage;
}

function getCodeFromMessage(messageBody: string) {
    return messageBody.match(/#(\d{6})/)?.[1];
}

async function waitUntil<T>(
    predicate: () => Promise<T | null>,
    timeout = 10000,
    interval = 1000,
): Promise<T | null> {
    const start = new Date();
    let now = new Date();

    while (now.getTime() - start.getTime() < timeout) {
        let value;

        try {
            value = await new Promise<T | null>((resolve, reject) => {
                void predicate().then(resolve);
                setTimeout(reject, interval);
            });
        } catch (error) {
            now = new Date();
            continue; // we already waited for the interval
        }

        if (value) {
            return value;
        }

        await waitForMs(interval);
        now = new Date();
    }

    return null;
}

async function waitForMs(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
