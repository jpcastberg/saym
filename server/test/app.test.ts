import { Server } from "http";
import { AddressInfo } from "net";
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import request, { Response } from "supertest";
// import WebSocket from "ws";
import app from "../src/app";
import { dbClose } from "../src/database";
import { GameResponseModel } from "../../shared/models/GameModels";

interface ApiResponse extends Response {
    header: Record<string, string>;
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
    });
});

afterEach(async () => {
    runningApp.close();
    await dbClose();
});

describe("Test the root path", () => {
    test("It should respond to the GET method", (done) => {
        void request(runningApp)
            .get("/")
            .then((response) => {
                expect(response.statusCode).toBe(200);
                done();
            });
    });
});

describe("Access Tokens", () => {
    test("It should provide a new access token if one is not passed", (done) => {
        void request(runningApp)
            .get("/")
            .then((response) => {
                const cookieHeader = getCookieHeader(response);
                expect(cookieHeader).toMatch(
                    /token=[A-Z\d]+; Path=\/; HttpOnly; SameSite=Strict/,
                );
                done();
            });
    });

    test("It should return the same access token if one is passed", (done) => {
        let expectedHeader: string;

        void request(runningApp)
            .get("/")
            .then((response) => {
                const cookieHeader = getCookieHeader(response);
                expectedHeader = cookieHeader;
                return request(runningApp)
                    .get("/")
                    .set("Cookie", `token=${getToken(cookieHeader)}`);
            })
            .then((response) => {
                expect(getCookieHeader(response)).toBe(expectedHeader);
                done();
            });
    });
});

describe("Games", () => {
    test("It should allow a player to create a new game", (done) => {
        void request(runningApp)
            .post("/api/games")
            .then((response: GameResponse) => {
                const { body: newGame } = response;

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

                done();
            });
    });

    test("It should allow a player to join an existing game", (done) => {
        void request(runningApp)
            .post("/api/games")
            .then((response: GameResponse) => {
                const { body: newGame } = response;

                void request(runningApp)
                    .post(`/api/games/${newGame._id}/join`)
                    .then((response: GameResponse) => {
                        const { body: existingGame } = response;

                        expect(existingGame).toHaveProperty("playerOne");
                        expect(existingGame.playerOne).toHaveProperty("_id");
                        expect(existingGame.playerOne).toHaveProperty(
                            "username",
                        );

                        expect(existingGame).toHaveProperty("playerTwo");
                        expect(existingGame.playerTwo).toHaveProperty("_id");
                        expect(existingGame.playerTwo).toHaveProperty(
                            "username",
                        );

                        expect(existingGame.playerTwo?._id).not.toEqual(
                            existingGame.playerOne?._id,
                        );

                        expect(Array.isArray(existingGame.playerOneTurns)).toBe(
                            true,
                        );
                        expect(existingGame.playerOneTurns).toHaveLength(0);

                        expect(Array.isArray(existingGame.playerTwoTurns)).toBe(
                            true,
                        );
                        expect(existingGame.playerTwoTurns).toHaveLength(0);

                        expect(existingGame.isGameComplete).toBe(false);

                        done();
                    });
            });
    });

    test("It should allow a players to take turns until they match words", (done) => {
        let playerOneToken: string | undefined;
        let playerTwoToken: string | undefined;
        let gameId: string;
        let game: GameResponseModel;

        void request(runningApp)
            .post("/api/games")
            .then((response: GameResponse) => {
                const { body } = response;
                playerOneToken = getToken(getCookieHeader(response));
                game = body;
                gameId = game._id;
            })
            .then(async () => {
                const response: GameResponse = await request(runningApp).post(
                    `/api/games/${game._id}/join`,
                );
                game = response.body;
                playerTwoToken = getToken(getCookieHeader(response));
            })
            .then(async () => {
                const turn = "turn 1";
                const response: GameResponse = await request(runningApp)
                    .post(`/api/games/${gameId}/turns`)
                    .set("Cookie", `token=${playerOneToken}`)
                    .send({ turn });
                game = response.body;
                expect(game.playerOneTurns).toEqual(["turn 1"]);
                expect(game.isGameComplete).toBe(false);
            })
            .then(async () => {
                const turn = "turn 2";
                const response: GameResponse = await request(runningApp)
                    .post(`/api/games/${gameId}/turns`)
                    .set("Cookie", `token=${playerTwoToken}`)
                    .send({ turn });
                game = response.body;
                expect(game.playerTwoTurns).toEqual(["turn 2"]);
                expect(game.isGameComplete).toBe(false);
            })
            .then(async () => {
                const turn = "matching turn";
                const response: GameResponse = await request(runningApp)
                    .post(`/api/games/${gameId}/turns`)
                    .set("Cookie", `token=${playerOneToken}`)
                    .send({ turn });
                game = response.body;
                expect(game.playerOneTurns).toEqual([
                    "turn 1",
                    "matching turn",
                ]);
                expect(game.isGameComplete).toBe(false);
            })
            .then(async () => {
                const turn = "matching turn";
                const response: GameResponse = await request(runningApp)
                    .post(`/api/games/${gameId}/turns`)
                    .set("Cookie", `token=${playerTwoToken}`)
                    .send({ turn });
                game = response.body;
                expect(game.playerTwoTurns).toEqual([
                    "turn 2",
                    "matching turn",
                ]);
                expect(game.isGameComplete).toBe(true);
                done();
            });
    });
});

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
