import { type UpdateFilter, type Filter, UpdateOptions } from "mongodb";
import {
    type PushSubscriptionModel,
    type PlayerModel,
} from "../../../shared/models/PlayerModels";
import generateId from "../utils/idGenerator";
import { dbConnect } from ".";

class PlayersDbApi {
    async get({ playerId }: { playerId: string }) {
        const db = await dbConnect();
        const players = db.collection<PlayerModel>("players");
        return players.findOne({
            _id: playerId,
        });
    }

    async getByPhoneNumber({ phoneNumber }: { phoneNumber: string }) {
        const db = await dbConnect();
        const players = db.collection<PlayerModel>("players");
        return players.findOne({
            phoneNumber,
        });
    }

    async create() {
        const db = await dbConnect();
        const players = db.collection<PlayerModel>("players");
        const _id = generateId();
        const newPlayer: PlayerModel = {
            _id,
            username: null,
            sendSmsNotifications: false,
            phoneNumber: null,
            shouldCollectPhoneNumber: true,
            pushSubscriptions: [],
        };

        await players.insertOne(newPlayer);
        return await players.findOne({
            _id,
        });
    }

    async update({
        playerId,
        username,
        sendSmsNotifications,
        phoneNumber,
        pushSubscription,
        shouldCollectPhoneNumber,
    }: {
        playerId: string;
        username?: string;
        sendSmsNotifications?: boolean;
        phoneNumber?: string;
        pushSubscription?: PushSubscriptionModel;
        shouldCollectPhoneNumber?: boolean;
    }) {
        const db = await dbConnect();
        const players = db.collection<PlayerModel>("players");

        interface SetModel {
            username?: string;
            sendSmsNotifications?: boolean;
            phoneNumber?: string;
            shouldCollectPhoneNumber?: boolean;
        }

        const playerUpdates: UpdateFilter<PlayerModel> = {};
        const $set: SetModel = {};

        if (username) {
            $set.username = username;
        }

        if (typeof sendSmsNotifications === "boolean") {
            $set.sendSmsNotifications = sendSmsNotifications;
        }

        if (phoneNumber) {
            $set.phoneNumber = phoneNumber;
        }

        if (pushSubscription) {
            playerUpdates.$push = {
                pushSubscriptions: pushSubscription,
            };
        }

        if (typeof shouldCollectPhoneNumber === "boolean") {
            $set.shouldCollectPhoneNumber = shouldCollectPhoneNumber;
        }

        playerUpdates.$set = {
            ...$set,
        };

        const filter: Filter<PlayerModel> = {
            _id: playerId,
        };

        await players.updateOne(filter, playerUpdates);
        return this.get({ playerId });
    }

    async updatePushSubscription({
        playerId,
        pushSubscriptionId,
        isActive,
    }: {
        playerId: string;
        pushSubscriptionId: string;
        isActive: boolean;
    }) {
        const db = await dbConnect();
        const players = db.collection<PlayerModel>("players");

        const filter: Filter<PlayerModel> = {
            _id: playerId,
        };
        const updatedPushSubscription: UpdateFilter<PlayerModel> = {
            $set: {
                "pushSubscriptions.$[pushSubscription].isActive": isActive,
            },
        };
        const options: UpdateOptions = {
            arrayFilters: [{ "pushSubscription._id": pushSubscriptionId }],
        };

        await players.updateOne(filter, updatedPushSubscription, options);
        const updatedPlayer = await this.get({ playerId });
        return updatedPlayer?.pushSubscriptions.find(
            (subscription) => subscription._id === pushSubscriptionId,
        );
    }

    async delete({ playerId }: { playerId: string }) {
        const db = await dbConnect();
        const players = db.collection<PlayerModel>("players");
        const filter: Filter<PlayerModel> = {
            _id: playerId,
        };

        const deleteResult = await players.deleteOne(filter);
        return deleteResult;
    }
}

const playersDbApi = new PlayersDbApi();

export default playersDbApi;
