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
    const providedToken =
        cookie.parse(req.headers.cookie ?? "").token ||
        parseBearerToken(req.headers.authorization ?? "");
    if (providedToken) {
        const existingToken: TokenModel | null = await tokensDbApi.get(
            providedToken,
        );

        if (existingToken) {
            res.locals.token = existingToken.token;
            res.locals.playerId = existingToken.player_id;
        }
    } else {
        const playerCreateResponse: InsertOneResult<PlayerModel> =
            await playersDbApi.create();
        const playerId = playerCreateResponse.insertedId;

        res.locals.playerId = playerId;
        const newAccessToken = createToken();
        await tokensDbApi.create(newAccessToken, playerId);
        console.log(
            `set new access token: ${newAccessToken}, for player: ${playerId}`,
        );
        res.locals.token = newAccessToken;
    }

    res.cookie("token", res.locals.token, {
        path: "/",
        sameSite: "strict",
        httpOnly: true,
    });

    next();
};

function createToken() {
    return crypto.randomBytes(13).toString("hex").toUpperCase();
}

function parseBearerToken(token: string): string {
    return token ? token.replace(/bearer /i, "") : "";
}
