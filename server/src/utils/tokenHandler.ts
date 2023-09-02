import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import cookie from "cookie";
import { InsertOneResult } from "mongodb";
import tokensDbApi, { type TokenModel } from "../database/token";
import playersDbApi from "../database/players";
import { type PlayerModel } from "../../../shared/models/PlayerModels";
import { ResponseLocals } from "../models";

export default async (
    req: Request,
    res: Response<Record<string, never>, ResponseLocals>,
    next: NextFunction,
) => {
    const providedToken = cookie.parse(req.headers.cookie ?? "").token;

    console.log("provided token:", providedToken);

    let token: TokenModel;

    if (providedToken) {
        const existingToken: TokenModel | null = await tokensDbApi.get(
            providedToken,
        );

        token = (existingToken ? existingToken : await createNewToken())!;
    } else {
        token = (await createNewToken())!;
    }

    res.locals.playerId = token.playerId;
    res.locals.token = token.value;

    const expires = new Date();
    expires.setDate(expires.getDate() + 400); // max cookie lifetime https://developer.chrome.com/blog/cookie-max-age-expires/

    res.cookie("token", res.locals.token, {
        path: "/",
        sameSite: "strict",
        httpOnly: true,
        secure: true,
        expires,
    });

    next();
};

async function createNewToken() {
    const playerCreateResponse: InsertOneResult<PlayerModel> =
        await playersDbApi.create();
    const playerId = playerCreateResponse.insertedId;

    const newAccessToken = createToken();
    await tokensDbApi.create(newAccessToken, playerId);
    console.log(
        `set new access token: ${newAccessToken}, for player: ${playerId}`,
    );

    return await tokensDbApi.get(newAccessToken);
}

function createToken() {
    return crypto.randomBytes(13).toString("hex").toUpperCase();
}
