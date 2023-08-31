import generateId from "../utils/idGenerator";
import { dbConnect } from ".";

export interface TokenModel {
    _id: string;
    player_id: string;
    token: string;
}

class TokensDbApi {
    async get(token: string) {
        const db = await dbConnect();
        const tokens = db.collection<TokenModel>("tokens");
        return await tokens.findOne({
            token,
        });
    }

    async create(token: string, playerId: string) {
        const db = await dbConnect();
        const tokens = db.collection<TokenModel>("tokens");
        const newToken: TokenModel = {
            _id: generateId(),
            player_id: playerId,
            token,
        };

        return await tokens.insertOne(newToken);
    }
}

const tokensDbApi = new TokensDbApi();

export default tokensDbApi;
