import { Filter, MongoClient, UpdateFilter } from "mongodb";
import crypto from "crypto";

const mongoUri: string = "mongodb+srv://" +
    process.env.DB_USERNAME + ":" + process.env.DB_PASSWORD +
    "@cluster0.icqn3.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(mongoUri);

export interface Token {
    user_id: string;
    token: string;
}

export interface User {
    user_id: string;
    username: string;
}

class TokenModel {
    async get(token: string) {
        const db = await connect();
        const tokens = db.collection<Token>("tokens");
        return await tokens.findOne({
            token
        });
    }

    async create(token: string, userId: string) {
        const db = await connect();
        const tokens = db.collection<Token>("tokens");
        const newToken: Token = {
            user_id: userId,
            token
        };

        await tokens.insertOne(newToken);
        return await this.get(token);
    }
}

class UserModel {
    async get(userId: string) {
        const db = await connect();
        const users = db.collection<User>("users");
        return await users.findOne({
            user_id: userId
        });
    }

    async create(username: string) {
        const db = await connect();
        const users = db.collection<User>("users");
        const newUserId = createId();
        const newUser: User = {
            user_id: newUserId,
            username
        };

        await users.insertOne(newUser);

        return await this.get(newUserId);
    }

    async update(userId: string, username: string) {
        const db = await connect();
        const users = db.collection<User>("users");
        const updatedUser: UpdateFilter<User> = {
            username
        };
        const filter: Filter<User> = {
            user_id: userId
        };

        const result = await users.findOneAndUpdate(filter, updatedUser);

        return result.value;
    }
}

export const tokenModel = new TokenModel();
export const userModel = new UserModel();

async function connect() {
    console.log(`connecting to db w/ credentials: un: ${process.env.DB_USERNAME}, pw: ${process.env.DB_PASSWORD}`);
    await client.connect();
    console.log("db connected!");
    return client.db("saym");
}

function createId() {
    return crypto.randomBytes(4).toString("hex");
}
