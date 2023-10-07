import { Filter, UpdateFilter } from "mongodb";
import generateId from "../utils/idGenerator";
import { dbConnect } from ".";

export interface TokenModel {
    _id: string;
    playerId: string;
    value: string;
}

class TokensDbApi {
    async get({ tokenValue }: { tokenValue: string }) {
        const db = await dbConnect();
        const tokens = db.collection<TokenModel>("tokens");
        return await tokens.findOne({
            value: tokenValue,
        });
    }

    async getByPlayerId({ playerId }: { playerId: string }) {
        const db = await dbConnect();
        const tokens = db.collection<TokenModel>("tokens");
        return await tokens.findOne({
            playerId,
        });
    }

    async create({
        playerId,
        tokenValue,
    }: {
        tokenValue: string;
        playerId: string;
    }) {
        const db = await dbConnect();
        const tokens = db.collection<TokenModel>("tokens");
        const newToken: TokenModel = {
            _id: generateId(),
            playerId,
            value: tokenValue,
        };

        return await tokens.insertOne(newToken);
    }

    async update({
        playerId,
        tokenValue,
    }: {
        tokenValue: string;
        playerId: string;
    }) {
        const db = await dbConnect();
        const tokens = db.collection<TokenModel>("tokens");
        const filter: Filter<TokenModel> = {
            value: tokenValue,
        };
        const update: UpdateFilter<TokenModel> = {
            $set: {
                playerId,
            },
        };

        return await tokens.findOneAndUpdate(filter, update);
    }
}

const tokensDbApi = new TokensDbApi();

export default tokensDbApi;
