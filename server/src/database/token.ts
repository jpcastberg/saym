import generateId from "../utils/idGenerator";
import { dbConnect } from ".";

export interface TokenModel {
    _id: string;
    playerId: string;
    value: string;
}

class TokensDbApi {
    async get(tokenValue: string) {
        const db = await dbConnect();
        const tokens = db.collection<TokenModel>("tokens");
        return await tokens.findOne({
            value: tokenValue,
        });
    }

    async create(tokenValue: string, playerId: string) {
        const db = await dbConnect();
        const tokens = db.collection<TokenModel>("tokens");
        const newToken: TokenModel = {
            _id: generateId(),
            playerId: playerId,
            value: tokenValue,
        };

        return await tokens.insertOne(newToken);
    }
}

const tokensDbApi = new TokensDbApi();

export default tokensDbApi;
