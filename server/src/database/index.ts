import {
    Document,
    Filter,
    MongoClient,
    MongoClientOptions,
    ServerApiVersion,
    UpdateFilter,
} from "mongodb";
import generateId from "../utils/id_generator";
import { type UserModel } from "../../../shared/models/UserModels";
import {
    type GameDbModel,
    type GameResponseModel,
} from "../../../shared/models/GameModels";

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

        const result = await users.findOneAndUpdate(filter, updatedUser, {
            returnDocument: "after",
        });

        return result.value;
    }
}

class GamesDbApi {
    async get(
        gameId: string,
        userId: string,
    ): Promise<GameResponseModel | undefined> {
        const matches = await this.getMatches(gameId, userId, false);
        return matches[0];
    }

    async getAll(userId: string): Promise<GameResponseModel[]> {
        return await this.getMatches(null, userId, false);
    }

    async create(playerOneUserId: string, playerTwoUserId: string | null) {
        const db = await dbConnect();
        const games = db.collection<GameDbModel>("games");
        const newGameId = generateId();
        const newGame: GameDbModel = {
            _id: newGameId,
            playerOneUserId: playerOneUserId,
            playerTwoUserId: playerTwoUserId,
            playerOneTurns: [],
            playerTwoTurns: [],
            isGameComplete: false,
            needToInvitePlayer: !playerTwoUserId,
            lastUpdate: new Date().toISOString(),
        };

        await games.insertOne(newGame);
        return this.get(newGameId, playerOneUserId);
    }

    async update(
        userId: string,
        gameId: string,
        playerTwoUserId: string | null,
        playerOneTurn: string | null,
        playerTwoTurn: string | null,
        needToInvitePlayer: boolean | null,
        isGameComplete: boolean | null,
    ) {
        const db = await dbConnect();
        const games = db.collection<GameDbModel>("games");
        const filter: Filter<GameDbModel> = {
            _id: gameId,
            $or: getPlayerFilterExpression(userId, Boolean(playerTwoUserId)),
        };

        interface SetModel {
            playerTwoUserId?: string;
            isGameComplete?: boolean;
            needToInvitePlayer?: boolean;
            lastUpdate: string;
        }

        const gameUpdates: UpdateFilter<GameDbModel> = {};
        const $set: SetModel = {
            lastUpdate: new Date().toISOString(),
        };

        if (needToInvitePlayer === false) {
            $set.needToInvitePlayer = false;
        }

        if (playerTwoUserId) {
            $set.playerTwoUserId = playerTwoUserId;
            $set.needToInvitePlayer = false;
            filter.playerTwoUserId = {
                $eq: null,
            };
        }

        if (playerOneTurn) {
            gameUpdates.$push = {
                playerOneTurns: playerOneTurn,
            };
        } else if (playerTwoTurn) {
            gameUpdates.$push = {
                playerTwoTurns: playerTwoTurn,
            };

            $set.isGameComplete = Boolean(isGameComplete);
        }

        gameUpdates.$set = {
            ...$set,
        };

        await games.updateOne(filter, gameUpdates);

        return await this.get(gameId, userId);
    }

    private async getMatches(
        gameId: string | null,
        userId: string,
        isPlayerTwoJoining: boolean | null,
    ) {
        const db = await dbConnect();
        const games = db.collection<GameDbModel>("games");
        const matchAggregation: Document = {
            $or: getPlayerFilterExpression(userId, isPlayerTwoJoining),
        };

        if (gameId) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            matchAggregation._id = gameId;
        }
        return (await games
            .aggregate([
                {
                    $match: matchAggregation,
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "playerOneUserId",
                        foreignField: "_id",
                        as: "playerOneArr",
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "playerTwoUserId",
                        foreignField: "_id",
                        as: "playerTwoArr",
                    },
                },
                {
                    $addFields: {
                        playerOne: {
                            $arrayElemAt: ["$playerOneArr", 0],
                        },
                        playerTwo: {
                            $arrayElemAt: ["$playerTwoArr", 0],
                        },
                    },
                },
                {
                    $unset: [
                        "playerOneUserId",
                        "playerTwoUserId",
                        "playerOneArr",
                        "playerTwoArr",
                    ],
                },
                {
                    $sort: {
                        lastUpdate: -1,
                    },
                },
            ])
            .toArray()) as GameResponseModel[];
    }
}

function getPlayerFilterExpression(
    userId: string,
    isPlayerTwoJoining: boolean | null,
) {
    return [
        {
            playerOneUserId: userId,
        },
        {
            playerTwoUserId: isPlayerTwoJoining ? null : userId,
        },
    ];
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
