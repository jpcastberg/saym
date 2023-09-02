import {
    type UpdateFilter,
    type Filter,
    type Document,
    type UpdateOptions,
} from "mongodb";
import {
    type GameResponseModel,
    type MessageModel,
} from "../../../shared/models/GameModels";
import generateId from "../utils/idGenerator";
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
    messages: MessageModel[];
    lastUpdate: string;
}

class GamesDbApi {
    async get(
        playerId: string,
        gameId: string,
    ): Promise<GameResponseModel | undefined> {
        const matches = await this.getMatches(playerId, gameId, false);
        return matches[0];
    }

    async getAll(playerId: string): Promise<GameResponseModel[]> {
        return await this.getMatches(playerId, null, false);
    }

    async create(playerId: string, playerTwoId: string | null) {
        const db = await dbConnect();
        const games = db.collection<GameDbModel>("games");
        const newGameId = generateId();
        const newGame: GameDbModel = {
            _id: newGameId,
            playerOneId: playerId,
            playerTwoId,
            playerOneTurns: [],
            playerTwoTurns: [],
            isGameComplete: false,
            needToInvitePlayer: !playerTwoId,
            nudgeWasSent: false,
            messages: [],
            lastUpdate: new Date().toISOString(),
        };

        await games.insertOne(newGame);
        return this.get(playerId, newGameId);
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

        return await this.get(playerId, gameId);
    }

    async createMessage(playerId: string, gameId: string, text: string) {
        const db = await dbConnect();
        const games = db.collection<GameDbModel>("games");

        const newMessage: MessageModel = {
            _id: generateId(),
            playerId,
            text,
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
        return this.get(playerId, gameId);
    }

    async updateMessage(
        playerId: string,
        gameId: string,
        messageId: string,
        readByOtherPlayer: boolean,
    ) {
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
        return await this.get(playerId, gameId);
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
