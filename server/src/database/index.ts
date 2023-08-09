import {
    Filter,
    MongoClient,
    MongoClientOptions,
    ServerApiVersion,
    UpdateFilter,
} from "mongodb";
import generateId from "../utils/id_generator";
import { type UserModel } from "../../../shared/models/UserModels";
import { type GameModel } from "../../../shared/models/GameModels";

const mongoUri: string =
    "mongodb+srv://" +
    process.env.DB_USERNAME +
    ":" +
    process.env.DB_PASSWORD +
    "@cluster0.icqn3.mongodb.net/?retryWrites=true&w=majority";
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
};
const client = new MongoClient(mongoUri, options as MongoClientOptions);

export interface TokenModel {
    _id: string;
    user_id: string;
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

    async create(token: string, userId: string) {
        const db = await dbConnect();
        const tokens = db.collection<TokenModel>("tokens");
        const newToken: TokenModel = {
            _id: generateId(),
            user_id: userId,
            token,
        };

        return await tokens.insertOne(newToken);
    }
}

class UsersDbApi {
    async get(userId: string) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        return users.findOne({
            _id: userId,
        });
    }

    async create(username: string) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        const newUser: UserModel = {
            _id: generateId(),
            username,
        };

        return await users.insertOne(newUser);
    }

    async update(userId: string, username: string) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        const updatedUser: UpdateFilter<UserModel> = {
            $set: {
                username,
            },
        };
        const filter: Filter<UserModel> = {
            _id: userId,
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
            _id: gameId,
            $or: this.getPlayerFilterExpression(userId, false),
        });
    }

    async getAll(userId: string) {
        const db = await dbConnect();
        const games = db.collection<GameModel>("games");
        return games
            .find(
                {
                    $or: this.getPlayerFilterExpression(userId, false),
                },
                {
                    sort: {
                        lastUpdated: 1,
                    },
                },
            )
            .toArray();
    }

    async create(playerOneUserId: string, playerTwoUserId: string) {
        const db = await dbConnect();
        const games = db.collection<GameModel>("games");
        const newGame: GameModel = {
            _id: generateId(),
            playerOneUserId: playerOneUserId,
            playerTwoUserId: playerTwoUserId,
            playerOneTurns: [],
            playerTwoTurns: [],
            isGameComplete: false,
            lastUpdate: new Date().toISOString(),
        };

        return await games.insertOne(newGame);
    }

    async update(
        userId: string,
        gameId: string,
        playerTwoUserId: string | null,
        playerOneTurn: string | null,
        playerTwoTurn: string | null,
        isGameComplete: boolean | null,
    ) {
        const db = await dbConnect();
        const games = db.collection<GameModel>("games");
        const filter: Filter<GameModel> = {
            _id: gameId,
            $or: this.getPlayerFilterExpression(
                userId,
                Boolean(playerTwoUserId),
            ),
        };
        interface GameUpdateFilterSet {
            playerTwoUserId?: string;
            isGameComplete?: boolean;
            lastUpdate?: string;
        }
        const gameUpdates: UpdateFilter<GameModel> = {};
        const $set: GameUpdateFilterSet = {};

        if (playerTwoUserId) {
            $set.playerTwoUserId = playerTwoUserId;
            filter.playerTwoUserId = {
                $eq: null,
            };
            console.log("set player 2 user id");
        }

        if (playerOneTurn) {
            gameUpdates.$push = {
                playerOneTurns: playerOneTurn,
            };
        } else if (playerTwoTurn) {
            gameUpdates.$push = {
                playerTwoTurns: playerTwoTurn,
            };

            if (isGameComplete) {
                $set.isGameComplete = isGameComplete;
            }
        }

        $set.lastUpdate = new Date().toISOString();
        gameUpdates.$set = {};
        const result = await games.findOneAndUpdate(filter, gameUpdates);

        return result.value;
    }

    private getPlayerFilterExpression = function (
        userId: string,
        isNewPlayer: boolean,
    ) {
        return [
            {
                playerOneUserId: userId,
            },
            {
                playerTwoUserId: isNewPlayer ? null : userId,
            },
        ];
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
