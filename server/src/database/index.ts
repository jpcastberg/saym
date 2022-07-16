import { Filter, MongoClient, MongoClientOptions, ServerApiVersion, UpdateFilter } from "mongodb";
import generateId from "../utils/id_generator";

const mongoUri: string = "mongodb+srv://" +
    process.env.DB_USERNAME + ":" + process.env.DB_PASSWORD +
    "@cluster0.icqn3.mongodb.net/?retryWrites=true&w=majority";
const options = { "useNewUrlParser": true, "useUnifiedTopology": true, "serverApi": ServerApiVersion.v1 };
const client = new MongoClient(mongoUri, options as MongoClientOptions);

export interface TokenModel {
    _id: string;
    user_id: string;
    token: string;
}

export interface UserModel {
    _id: string;
    username: string;
}

export interface GameModel {
    _id: string;
    player_one_user_id: string;
    player_two_user_id: string | null;
    player_one_turns: string[];
    player_two_turns: string[];
    is_game_complete: boolean;
}

class TokensDbApi {
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
            "_id": generateId(),
            "user_id": userId,
            token
        };

        return await tokens.insertOne(newToken);
    }
}

class UsersDbApi {
    async get(userId: string) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        return users.findOne({
            "_id": userId
        });
    }

    async create(username: string) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        const newUser: UserModel = {
            "_id": generateId(),
            username
        };

        return await users.insertOne(newUser);
    }

    async update(userId: string, username: string) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        const updatedUser: UpdateFilter<UserModel> = {
            username
        };
        const filter: Filter<UserModel> = {
            "_id": userId
        };

        const result = await users.findOneAndUpdate(filter, updatedUser);

        return result.value;
    }
}

class GamesDbApi {
    async get(gameId: string, userId: string) {
        const db = await dbConnect();
        const games = db.collection<GameModel>("games");
        return await games.findOne({
            "_id": gameId,
            "$or": this.getPlayerFilterExpression(userId, false)
        });
    }

    async getAll(userId: string) {
        const db = await dbConnect();
        const games = db.collection<GameModel>("games");
        return games.find({
            "$or": this.getPlayerFilterExpression(userId, false)
        }).toArray();
    }

    async create(playerOneUserId: string, playerTwoUserId: string) {
        const db = await dbConnect();
        const games = db.collection<GameModel>("games");
        const newGame: GameModel = {
            "_id": generateId(),
            "player_one_user_id": playerOneUserId,
            "player_two_user_id": playerTwoUserId,
            "player_one_turns": [],
            "player_two_turns": [],
            "is_game_complete": false
        };

        return await games.insertOne(newGame);
    }

    async update(
        userId: string,
        gameId: string,
        playerTwoUserId: string | null,
        playerOneTurn: string | null,
        playerTwoTurn: string | null,
        isGameComplete: boolean | null
    ) {
        const db = await dbConnect();
        const games = db.collection<GameModel>("games");
        const filter: Filter<GameModel> = {
            "_id": gameId,
            "$or": this.getPlayerFilterExpression(userId, Boolean(playerTwoUserId))
        };
        const gameUpdates: UpdateFilter<GameModel> = {};
        const $set: Record<string, string | boolean> = {};

        if (playerTwoUserId) {
            $set.player_two_user_id = playerTwoUserId;
        }

        if (playerOneTurn) {
            gameUpdates.$push = {
                "player_one_turns": playerOneTurn
            };
        } else if (playerTwoTurn) {
            gameUpdates.$push = {
                "player_two_turns": playerTwoTurn
            };

            if (isGameComplete) {
                $set.is_game_complete = isGameComplete;
            }
        }

        gameUpdates.$set = $set;
        const result = await games.findOneAndUpdate(filter, gameUpdates);

        return result.value;
    }

    private getPlayerFilterExpression = function (userId: string, isNewPlayer: boolean) {
        return [{
            "player_one_user_id": userId,
        }, {
            "player_two_user_id": isNewPlayer ? null : userId
        }];
    };
}

export const tokensDbApi = new TokensDbApi();
export const usersDbApi = new UsersDbApi();
export const gamesDbApi = new GamesDbApi();


export async function dbClose() {
    await client.close();
}

export async function dbConnect() {
    await client.connect();
    console.log("db connected!");
    return client.db("saym");
}
