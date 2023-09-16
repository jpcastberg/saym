import crypto from "crypto";
import { type Request, type Response, type NextFunction } from "express";
import cookie from "cookie";
import { type WithId } from "mongodb";
import tokensDbApi, { type TokenModel } from "../database/token";
import playersDbApi from "../database/players";
import { type PlayerModel } from "../../../shared/models/PlayerModels";
import { ResponseLocals } from "../models";

async function tokenHandler(
    req: Request,
    res: Response<Record<string, never>, ResponseLocals>,
    next: NextFunction,
) {
    const providedToken = cookie.parse(req.headers.cookie ?? "").token;
    let existingToken: TokenModel | null = null;

    if (providedToken) {
        existingToken = await tokensDbApi.get({ tokenValue: providedToken });
    }

    if (existingToken) {
        setTokenOnResponse(existingToken, res);
    } else {
        await setNewTokenOnResponse(res);
    }

    next();
}

export async function setNewTokenOnResponse(
    res: Response<Record<string, never>, ResponseLocals>,
) {
    const token = await createNewToken();
    if (token) {
        setTokenOnResponse(token, res);
    }
}

function setTokenOnResponse(
    token: TokenModel,
    res: Response<Record<string, never>, ResponseLocals>,
) {
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
}

async function createNewToken() {
    const newPlayer: WithId<PlayerModel> = (await playersDbApi.create())!;
    const playerId = newPlayer._id;
    const newAccessToken = createToken();

    await tokensDbApi.create({ playerId, tokenValue: newAccessToken });
    console.log(
        `set new access token: ${newAccessToken}, for player: ${playerId}`,
    );

    return await tokensDbApi.get({ tokenValue: newAccessToken });
}

function createToken() {
    return crypto.randomBytes(13).toString("hex").toUpperCase();
}

export default tokenHandler;
