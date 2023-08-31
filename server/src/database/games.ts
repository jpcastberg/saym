import { type UpdateFilter, type Filter, type Document } from "mongodb";
import { type GameResponseModel } from "../../../shared/models/GameModels";
import generateId from "../utils/idGenerator";
import { dbConnect } from ".";

export interface GameDbModel {
    _id: string;
    playerOneUserId: string;
    playerTwoUserId: string | null;
    playerOneTurns: string[];
    playerTwoTurns: string[];
    isGameComplete: boolean;
    needToInvitePlayer: boolean;
    nudgeWasSent: boolean;
    lastUpdate: string;
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
            nudgeWasSent: false,
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
        nudgeWasSent: boolean | null,
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
            nudgeWasSent?: boolean;
            lastUpdate: string;
        }

        const gameUpdates: UpdateFilter<GameDbModel> = {};
        const $set: SetModel = {
            lastUpdate: new Date().toISOString(),
        };

        if (needToInvitePlayer === false) {
            $set.needToInvitePlayer = false;
        }

        if (nudgeWasSent !== null) {
            $set.nudgeWasSent = nudgeWasSent;
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
        }

        if (isGameComplete) {
            $set.isGameComplete = isGameComplete;
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
                        "playerOne.phoneNumber",
                        "playerOne.isPhoneNumberValidated",
                        "playerOne.pushSubscription",
                        "playerTwo.phoneNumber",
                        "playerTwo.isPhoneNumberValidated",
                        "playerTwo.pushSubscription",
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

const gamesDbApi = new GamesDbApi();

export default gamesDbApi;
