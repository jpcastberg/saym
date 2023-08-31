import { type UpdateFilter, type Filter } from "mongodb";
import { type UserModel } from "../../../shared/models/UserModels";
import generateId from "../utils/idGenerator";
import { dbConnect } from ".";

class UsersDbApi {
    async get(userId: string) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        return users.findOne({
            _id: userId,
        });
    }

    async create() {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");
        const newUser: UserModel = {
            _id: generateId(),
            username: null,
            sendNotifications: null,
            phoneNumber: null,
            isPhoneNumberValidated: false,
            pushSubscription: null,
        };

        return await users.insertOne(newUser);
    }

    async update(
        userId: string,
        username: string | null,
        sendNotifications: boolean | null,
        phoneNumber: string | null,
        isPhoneNumberValidated: boolean | null,
        pushSubscription: PushSubscriptionJSON | null,
    ) {
        const db = await dbConnect();
        const users = db.collection<UserModel>("users");

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
        const updatedUser: UpdateFilter<UserModel> = {
            $set: {
                ...$set,
            },
        };
        const filter: Filter<UserModel> = {
            _id: userId,
        };

        await users.updateOne(filter, updatedUser);
        return this.get(userId);
    }
}

const usersDbApi = new UsersDbApi();

export default usersDbApi;
