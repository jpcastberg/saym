import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import request from "supertest";
import app from "../src/app";
import { dbConnect, dbClose } from "../src/database";

beforeEach(async () => {
    return await dbConnect();
});

afterEach(async () => {
    return await dbClose();
});

describe("Test the root path", () => {
    test("It should respond to the GET method", done => {
        request(app)
            .get("/")
            .then(response => {
                console.log("response: " + JSON.stringify(response));
                expect(response.statusCode).toBe(200);
                done();
            });
    });
});

describe("Access Tokens", () => {
    test("It should provide a new access token if one is not passed", done => {
        request(app)
            .get("/")
            .then(response => {
                const { "header": { "set-cookie": [cookieHeader] } } = response;
                expect(cookieHeader)
                    .toMatch(/token=[A-Z\d]+; Path=\/; HttpOnly; SameSite=Strict/);
                done();
            });

    });

    test("It should return the same access token if one is passed", done => {
        let expectedHeader: string;

        request(app)
            .get("/")
            .then(response => {
                const cookieHeader = getCookieHeader(response);
                expectedHeader = cookieHeader;
                return request(app)
                    .get("/")
                    .set("Cookie", `token=${getToken(cookieHeader)}`);
            })
            .then(response => {
                expect(getCookieHeader(response)).toBe(expectedHeader);
                done();
            });
    });
});

describe("Games", () => {
    test("It should allow a user to create a new game", done => {
        request(app)
            .post("/api/games")
            .then(response => {
                const { body } = response;

                expect(typeof body._id).toBe("string");
                expect(body._id).toBeTruthy();

                expect(typeof body.playerOneUserId).toBe("string");
                expect(body.playerOneUserId).toBeTruthy();

                expect(body.playerTwoUserId).toBeNull();

                expect(Array.isArray(body.playerOneTurns)).toBe(true);
                expect(body.playerOneTurns).toHaveLength(0);

                expect(Array.isArray(body.playerTwoTurns)).toBe(true);
                expect(body.playerTwoTurns).toHaveLength(0);

                expect(body.isGameComplete).toBe(false);

                done();
            });
    });

    test("It should allow a user to join an existing game", done => {
        request(app)
            .post("/api/games")
            .then(response => {
                const { "body": newGame } = response;

                request(app)
                    .post(`/api/games/${newGame._id}/join`)
                    .then(response => {
                        const { "body": existingGame } = response;

                        expect(typeof existingGame.playerOneUserId).toBe("string");
                        expect(existingGame.playerOneUserId).toBeTruthy();

                        expect(typeof existingGame.playerTwoUserId).toBe("string");
                        expect(existingGame.playerTwoUserId).toBeTruthy();
                        expect(existingGame.playerTwoUserId).not.toEqual(existingGame.playerOneUserId);

                        expect(Array.isArray(existingGame.playerOneTurns)).toBe(true);
                        expect(existingGame.playerOneTurns).toHaveLength(0);

                        expect(Array.isArray(existingGame.playerTwoTurns)).toBe(true);
                        expect(existingGame.playerTwoTurns).toHaveLength(0);

                        expect(existingGame.isGameComplete).toBe(false);

                        done();
                    });
            });
    });

    test("It should allow a players to take turns until they match words", done => {
        let playerOneToken: string | undefined;
        let playerTwoToken: string | undefined;
        let gameId: string;
        let game;

        request(app)
            .post("/api/games")
            .then(response => {
                const { body } = response;
                playerOneToken = getToken(getCookieHeader(response));
                game = body;
            })
            .then(async () => {
                const response = await request(app)
                    .post(`/api/games/${game._id}/join`);
                game = response.body;
                playerTwoToken = getToken(getCookieHeader(response));
            })
            .then(() => {
                return request(app)
                    .post(`/api/games/${gameId}/turns`)
                    .set("Cookie", `token=${playerOneToken}`)
                    .send({ "turn": "turn 1" });
            })
            .then(() => {
                return request(app)
                    .post(`/api/games/${gameId}/turns`)
                    .set("Cookie", `token=${playerTwoToken}`)
                    .send({ "turn": "turn 2" });
            });
    });
});

function getCookieHeader(response): string {
    const { "header": { "set-cookie": [cookieHeader] } } = response;
    return cookieHeader;
}

function getToken(cookieHeader: string): string | undefined {
    return cookieHeader.match(/^token=([A-Z\d]+);/)?.[1];
}
