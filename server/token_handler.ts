import express from "express";
import cookie from "cookie";
import crypto from "crypto";
import { tokenModel, userModel, Token, User } from "./database";

export default async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log("token handler started");
    const providedToken = cookie.parse(req.headers.cookie || "").token;

    if (providedToken) {
        const existingToken: Token | null = await tokenModel.get(providedToken);

        if (existingToken) {
            res.locals.token = existingToken.token;
            const existingUser = await userModel.get(existingToken.user_id);

            if (existingUser) {
                res.locals.user = existingUser;
            }
        }
    } else {

        const newUser: User | null = await userModel.create("");

        if (newUser) {
            res.locals.user = newUser;
            const newToken: Token | null = await tokenModel.create(createToken(), newUser.user_id);

            if (newToken) {
                res.locals.token = newToken.token;
            }
        }
    }

    next();
};

function createToken() {
    return crypto.randomBytes(13)
        .toString("hex").toUpperCase();
}
