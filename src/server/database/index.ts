import { Filter, MongoClient, MongoClientOptions, ServerApiVersion, UpdateFilter } from "mongodb";
import generateId from "../utils/id_generator";

const mongoUri: string = "mongodb+srv://" +
    process.env.DB_USERNAME + ":" + process.env.DB_PASSWORD +
    "@cluster0.icqn3.mongodb.net/?retryWrites=true&w=majority";
const options = { "useNewUrlParser": true, "useUnifiedTopology": true, "serverApi": ServerApiVersion.v1 };
const client = new MongoClient(mongoUri, options as MongoClientOptions);

export interface TokenModel {
    user_id: string;
    token: string;
}

export interface UserModel {
    user_id: string;
    username: string;
}

export interface GameModel {
    game_id: string;
    player_one_user_id: string;
    player_two_user_id: string;
    player_one_turns: string;
    player_two_turns: string;
    is_game_complete: boolean;
}

class TokenApi {
    async get(token: string) {
        const db = await dbConnect();
        const tokens = db.collection<TokenModel>("tokens");
        return await tokens.findOne({
            token
        });
    }

    async create(token: string, userId: string) {
        const db = await dbConnect();
        const tokens = db.collection<TokenModel>("tokens");
        const newToken: TokenModel = {
            "user_id": userId,
            token
        };

        await tokens.insertOne(newToken);
        return await this.get(token);
    }
}

class UserApi {
    async get(userId: string) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        return await users.findOne({
            "user_id": userId
        });
    }

    async create(username: string) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        const newUserId = generateId(4);
        const newUser: UserModel = {
            "user_id": newUserId,
            username
        };

        await users.insertOne(newUser);

        return await this.get(newUserId);
    }

    async update(userId: string, username: string) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        const updatedUser: UpdateFilter<UserModel> = {
            username
        };
        const filter: Filter<UserModel> = {
            "user_id": userId
        };

        const result = await users.findOneAndUpdate(filter, updatedUser);

        return result.value;
    }
}

class GameApi {
    private getPlayerFilterExpression;
    constructor () {
        this.getPlayerFilterExpression = function (userId: string) {
            return {
                "$function": {
                    "body": function (playerOneUserId: string, playerTwoUserId: string) {
                        return userId === playerOneUserId ||
                            userId === playerTwoUserId;
                    },
                    "args": [
                        "$player_one_user_id",
                        "$player_two_user_id"
                    ],
                    "lang": "js"
                }
            };
        };
    }

    async get(gameId: string, userId: string) {
        const db = await dbConnect();
        const games = db.collection<UserModel>("games");
        return await games.findOne({
            "game_id": gameId,
            "$expr": this.getPlayerFilterExpression(userId)
        });
    }

    async getAll(userId: string) {
        const db = await dbConnect();
        const games = db.collection<UserModel>("games");
        return await games.find({
            "$expr": this.getPlayerFilterExpression(userId)
        });
    }

    async create(username: string) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        const newUserId = generateId(4);
        const newUser: UserModel = {
            "user_id": newUserId,
            username
        };

        await users.insertOne(newUser);

        // return await this.get(newUserId);
    }

    async update(userId: string, username: string) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        const updatedUser: UpdateFilter<UserModel> = {
            username
        };
        const filter: Filter<UserModel> = {
            "user_id": userId
        };

        const result = await users.findOneAndUpdate(filter, updatedUser);

        return result.value;
    }
}

export const tokenModel = new TokenApi();
export const userModel = new UserApi();

export async function dbClose() {
    await client.close();
}

export async function dbConnect() {
    await client.connect();
    console.log("db connected!");
    return client.db("saym");
}
