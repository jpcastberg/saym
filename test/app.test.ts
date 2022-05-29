import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import supertest from "supertest";
import app from "../server/app";
import { dbConnect, dbClose } from "../server/database";

beforeEach(async () => {
    return await dbConnect();
});

afterEach(async () => {
    return await dbClose();
});

describe("Test the root path", () => {
    test("It should response the GET method", done => {
        supertest(app)
            .get("/")
            .then(response => {
                expect(response.statusCode).toBe(200);
                done();
            });
    });
});
