import { type UpdateFilter, type Filter, type Document } from "mongodb";
import { type GameResponseModel } from "../../../shared/models/GameModels";
import generateId from "../utils/idGenerator";
import getPlayerFilterExpression from "../utils/getPlayerFilterExpression";
import { dbConnect } from ".";

export interface GameDbModel {
    _id: string;
    playerOneId: string;
    playerTwoId: string | null;
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
        playerId: string,
    ): Promise<GameResponseModel | undefined> {
        const matches = await this.getMatches(gameId, playerId, false);
        return matches[0];
    }

    async getAll(playerId: string): Promise<GameResponseModel[]> {
        return await this.getMatches(null, playerId, false);
    }

    async create(playerOneId: string, playerTwoId: string | null) {
        const db = await dbConnect();
        const games = db.collection<GameDbModel>("games");
        const newGameId = generateId();
        const newGame: GameDbModel = {
            _id: newGameId,
            playerOneId: playerOneId,
            playerTwoId: playerTwoId,
            playerOneTurns: [],
            playerTwoTurns: [],
            isGameComplete: false,
            needToInvitePlayer: !playerTwoId,
            nudgeWasSent: false,
            lastUpdate: new Date().toISOString(),
        };

        await games.insertOne(newGame);
        return this.get(newGameId, playerOneId);
    }

    async update(
        playerId: string,
        gameId: string,
        playerTwoId: string | null,
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
            $or: getPlayerFilterExpression(playerId, Boolean(playerTwoId)),
        };

        interface SetModel {
            playerTwoId?: string;
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

        if (playerTwoId) {
            $set.playerTwoId = playerTwoId;
            $set.needToInvitePlayer = false;
            filter.playerTwoId = {
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

        return await this.get(gameId, playerId);
    }

    private async getMatches(
        gameId: string | null,
        playerId: string,
        isPlayerTwoJoining: boolean | null,
    ) {
        const db = await dbConnect();
        const games = db.collection<GameDbModel>("games");
        const matchAggregation: Document = {
            $or: getPlayerFilterExpression(playerId, isPlayerTwoJoining),
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
                        from: "players",
                        localField: "playerOneId",
                        foreignField: "_id",
                        as: "playerOneArr",
                    },
                },
                {
                    $lookup: {
                        from: "players",
                        localField: "playerTwoId",
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
                        "playerOneId",
                        "playerTwoId",
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

const gamesDbApi = new GamesDbApi();

export default gamesDbApi;
