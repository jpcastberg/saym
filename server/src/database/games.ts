import {
    type UpdateFilter,
    type Filter,
    type Document,
    type UpdateOptions,
} from "mongodb";
import {
    type GameResponseModel,
    type TurnModel,
    type MessageModel,
} from "../../../shared/models/GameModels";
import generateId from "../utils/idGenerator";
import { dbConnect } from ".";

export interface GameDbModel {
    _id: string;
    playerOneId: string;
    playerTwoId: string | null;
    playerOneTurns: TurnModel[];
    playerTwoTurns: TurnModel[];
    isGameComplete: boolean;
    needToInvitePlayer: boolean;
    playerOneSawFinishedGame: boolean;
    playerTwoSawFinishedGame: boolean;
    messages: MessageModel[];
    lastUpdate: string;
}

class GamesDbApi {
    async get({
        playerId,
        gameId,
    }: {
        playerId: string;
        gameId: string;
    }): Promise<GameResponseModel | undefined> {
        const matches = await this.getMatches(playerId, gameId, false);
        return matches[0];
    }

    async getAll({
        playerId,
    }: {
        playerId: string;
    }): Promise<GameResponseModel[]> {
        return await this.getMatches(playerId, null, false);
    }

    async create({
        playerOneId,
        playerTwoId,
    }: {
        playerOneId: string;
        playerTwoId: string | null;
    }) {
        const db = await dbConnect();
        const games = db.collection<GameDbModel>("games");
        const newGameId = generateId();
        const newGame: GameDbModel = {
            _id: newGameId,
            playerOneId,
            playerTwoId,
            playerOneTurns: [],
            playerTwoTurns: [],
            isGameComplete: false,
            needToInvitePlayer: !playerTwoId,
            messages: [],
            playerOneSawFinishedGame: false,
            playerTwoSawFinishedGame: false,
            lastUpdate: new Date().toISOString(),
        };

        await games.insertOne(newGame);
        return this.get({
            playerId: playerOneId,
            gameId: newGameId,
        });
    }

    async update({
        playerId,
        gameId,
        playerTwoId,
        playerOneTurn,
        playerTwoTurn,
        needToInvitePlayer,
        isGameComplete,
        playerOneSawFinishedGame,
        playerTwoSawFinishedGame,
    }: {
        playerId: string;
        gameId: string;
        playerTwoId?: string;
        playerOneTurn?: string;
        playerTwoTurn?: string;
        needToInvitePlayer?: boolean;
        isGameComplete?: boolean;
        playerOneSawFinishedGame?: boolean;
        playerTwoSawFinishedGame?: boolean;
    }) {
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
            playerOneSawFinishedGame?: boolean;
            playerTwoSawFinishedGame?: boolean;
            lastUpdate: string;
        }

        const gameUpdates: UpdateFilter<GameDbModel> = {};
        const $set: SetModel = {
            lastUpdate: new Date().toISOString(),
        };

        if (needToInvitePlayer === false) {
            $set.needToInvitePlayer = false;
        }

        if (playerTwoId) {
            $set.playerTwoId = playerTwoId;
            $set.needToInvitePlayer = false;
            filter.playerTwoId = {
                $eq: null,
            };
        }

        const timestamp = new Date().toISOString();
        const _id = generateId();

        if (playerOneTurn) {
            gameUpdates.$push = {
                playerOneTurns: {
                    _id,
                    text: playerOneTurn,
                    timestamp,
                },
            };
        } else if (playerTwoTurn) {
            gameUpdates.$push = {
                playerTwoTurns: {
                    _id,
                    text: playerTwoTurn,
                    timestamp,
                },
            };
        }

        if (isGameComplete) {
            $set.isGameComplete = true;
        }

        if (playerOneSawFinishedGame) {
            $set.playerOneSawFinishedGame = true;
        } else if (playerTwoSawFinishedGame) {
            $set.playerTwoSawFinishedGame = true;
        }

        gameUpdates.$set = {
            ...$set,
        };

        await games.updateOne(filter, gameUpdates);

        return await this.get({ playerId, gameId });
    }

    async createMessage({
        playerId,
        gameId,
        text,
    }: {
        playerId: string;
        gameId: string;
        text: string;
    }) {
        const db = await dbConnect();
        const games = db.collection<GameDbModel>("games");

        const newMessage: MessageModel = {
            _id: generateId(),
            playerId,
            text: text.trim(),
            readByOtherPlayer: false,
            timestamp: new Date().toISOString(),
        };
        const updatedThread: UpdateFilter<GameDbModel> = {
            $push: {
                messages: newMessage,
            },
        };
        const filter: Filter<GameDbModel> = {
            _id: gameId,
            $or: getPlayerFilterExpression(playerId, false),
        };

        await games.updateOne(filter, updatedThread);
        return this.get({ playerId, gameId });
    }

    async updateMessage({
        playerId,
        gameId,
        messageId,
        readByOtherPlayer,
    }: {
        playerId: string;
        gameId: string;
        messageId: string;
        readByOtherPlayer: boolean;
    }) {
        const db = await dbConnect();
        const games = db.collection<GameDbModel>("games");

        const filter: Filter<GameDbModel> = {
            _id: gameId,
            $or: getPlayerFilterExpression(playerId, false),
        };
        const updatedThread: UpdateFilter<GameDbModel> = {
            $set: {
                "messages.$[message].readByOtherPlayer": readByOtherPlayer,
            },
        };
        const options: UpdateOptions = {
            arrayFilters: [{ "message._id": messageId }],
        };

        await games.updateOne(filter, updatedThread, options);
        return await this.get({ playerId, gameId });
    }

    async mergeGames({
        fromPlayerId,
        toPlayerId,
    }: {
        fromPlayerId: string;
        toPlayerId: string;
    }) {
        const db = await dbConnect();
        const games = db.collection<GameDbModel>("games");

        await games
            .aggregate([
                {
                    $match: {
                        $or: getPlayerFilterExpression(fromPlayerId, false),
                    },
                },
                {
                    $addFields: {
                        playerOneId: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $eq: ["$playerOneId", fromPlayerId] },
                                        { $ne: ["$playerTwoId", toPlayerId] },
                                    ],
                                },
                                then: toPlayerId,
                                else: "$playerOneId",
                            },
                        },
                        playerTwoId: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $eq: ["$playerTwoId", fromPlayerId] },
                                        { $ne: ["$playerOneId", toPlayerId] },
                                    ],
                                },
                                then: toPlayerId,
                                else: "$playerTwoId",
                            },
                        },
                        messages: {
                            $map: {
                                input: "$messages",
                                as: "message",
                                in: {
                                    _id: "$$message._id",
                                    playerId: {
                                        $cond: {
                                            if: {
                                                $eq: [
                                                    "$$message.playerId",
                                                    fromPlayerId,
                                                ],
                                            },
                                            then: toPlayerId,
                                            else: "$$message.playerId",
                                        },
                                    },
                                    text: "$$message.text",
                                    readByOtherPlayer:
                                        "$$message.readByOtherPlayer",
                                    timestamp: "$$message.timestamp",
                                },
                            },
                        },
                    },
                },
                {
                    $merge: {
                        into: "games",
                    },
                },
            ])
            .toArray();
    }

    private async getMatches(
        playerId: string,
        gameId: string | null,
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
                        as: "playerOneArray",
                    },
                },
                {
                    $lookup: {
                        from: "players",
                        localField: "playerTwoId",
                        foreignField: "_id",
                        as: "playerTwoArray",
                    },
                },
                {
                    $addFields: {
                        playerOne: {
                            $arrayElemAt: ["$playerOneArray", 0],
                        },
                        playerTwo: {
                            $arrayElemAt: ["$playerTwoArray", 0],
                        },
                    },
                },
                {
                    $unset: [
                        "playerOneId",
                        "playerTwoId",
                        "playerOneArray",
                        "playerTwoArray",
                        "playerOne.phoneNumber",
                        "playerOne.shouldCollectPhoneNumber",
                        "playerOne.pushSubscriptions",
                        "playerTwo.phoneNumber",
                        "playerTwo.shouldCollectPhoneNumber",
                        "playerTwo.pushSubscriptions",
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
    playerId: string,
    isPlayerTwoJoining: boolean | null,
) {
    return [
        {
            playerOneId: playerId,
        },
        {
            playerTwoId: isPlayerTwoJoining ? void 0 : playerId,
        },
    ];
}

const gamesDbApi = new GamesDbApi();

export default gamesDbApi;
