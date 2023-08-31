import { type UpdateFilter, type Filter } from "mongodb";
import { type PlayerModel } from "../../../shared/models/PlayerModels";
import generateId from "../utils/idGenerator";
import { dbConnect } from ".";

class PlayersDbApi {
    async get(playerId: string) {
        const db = await dbConnect();
        const players = db.collection<PlayerModel>("players");
        return players.findOne({
            _id: playerId,
        });
    }

    async create() {
        const db = await dbConnect();
        const players = db.collection<PlayerModel>("players");
        const newPlayer: PlayerModel = {
            _id: generateId(),
            username: null,
            sendNotifications: null,
            phoneNumber: null,
            isPhoneNumberValidated: false,
            pushSubscription: null,
        };

        return await players.insertOne(newPlayer);
    }

    async update(
        playerId: string,
        username: string | null,
        sendNotifications: boolean | null,
        phoneNumber: string | null,
        isPhoneNumberValidated: boolean | null,
        pushSubscription: PushSubscriptionJSON | null,
    ) {
        const db = await dbConnect();
        const players = db.collection<PlayerModel>("players");

        interface SetModel {
            username?: string;
            sendNotifications?: boolean;
            phoneNumber?: string;
            isPhoneNumberValidated?: boolean;
            pushSubscription?: PushSubscriptionJSON;
        }

        const $set: SetModel = {};

        if (username) {
            $set.username = username;
        }

        if (sendNotifications !== null) {
            $set.sendNotifications = sendNotifications;
        }

        if (phoneNumber) {
            $set.phoneNumber = phoneNumber;
        }

        if (isPhoneNumberValidated !== null) {
            $set.isPhoneNumberValidated = isPhoneNumberValidated;
        }

        if (pushSubscription) {
            $set.pushSubscription = pushSubscription;
        }
        const updatedPlayer: UpdateFilter<PlayerModel> = {
            $set: {
                ...$set,
            },
        };
        const filter: Filter<PlayerModel> = {
            _id: playerId,
        };

        await players.updateOne(filter, updatedPlayer);
        return this.get(playerId);
    }
}

const playersDbApi = new PlayersDbApi();

export default playersDbApi;
