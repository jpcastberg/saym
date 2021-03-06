import express from "express";
import cookie from "cookie";
import crypto from "crypto";
import { tokensDbApi, usersDbApi, TokenModel, UserModel } from "./database";
import { InsertOneResult } from "mongodb";

export default async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const providedToken = cookie.parse(req.headers.cookie || "").token ||
        parseBearerToken(req.headers.authorization || "");

    if (providedToken) {
        console.log("token provided: " + providedToken);
        const existingToken: TokenModel | null = await tokensDbApi.get(providedToken);

        if (existingToken) {
            console.log("provided token exists: " + JSON.stringify(existingToken));
            res.locals.token = existingToken.token;
            const existingUser = await usersDbApi.get(existingToken.user_id);

            if (existingUser) {
                console.log("existing user id: " + existingUser._id);
                res.locals.userId = existingUser._id;
            }
        }
    } else {
        const userCreateResponse: InsertOneResult<UserModel> = await usersDbApi.create("");
        const userId = userCreateResponse.insertedId;

        if (userCreateResponse) {
            res.locals.userId = userId;
            const newAccessToken = createToken();
            await tokensDbApi.create(newAccessToken, userId);
            console.log(`set new access token: ${newAccessToken}, for user: ${userId}`);
            res.locals.token = newAccessToken;
        }
    }

    res.cookie("token", res.locals.token, {
        "path": "/",
        "sameSite": "strict",
        "httpOnly": true
    });

    next();
};

function createToken() {
    return crypto.randomBytes(13)
        .toString("hex").toUpperCase();
}

function parseBearerToken(token: string): string {
    return token ? token.replace(/bearer /i, "") : "";
}
