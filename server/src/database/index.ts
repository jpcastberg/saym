import {
    type Db,
    type Filter,
    MongoClient,
    type MongoClientOptions,
    ServerApiVersion,
} from "mongodb";
import { botName, type PlayerModel } from "../../../shared/models/PlayerModels";

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
let dbConnection: Db | undefined;
void initBot();
void deleteTestUser();

export const connectOptions = {
    force: false,
};

export async function dbClose() {
    await client.close();
}

export interface dbConnectParams {
    force: boolean;
}

export async function dbConnect() {
    if (dbConnection && !connectOptions.force) {
        return dbConnection;
    }
    await client.connect();
    dbConnection = client.db("saym");
    return dbConnection;
}

async function initBot() {
    const db = await dbConnect();
    const players = db.collection<PlayerModel>("players");
    const filter: Filter<PlayerModel> = {
        _id: botName,
    };
    const bot: PlayerModel = {
        _id: botName,
        username: botName,
        sendSmsNotifications: false,
        phoneNumber: null,
        shouldCollectPhoneNumber: false,
        pushSubscriptions: [],
    };
    await players.replaceOne(filter, bot, {
        upsert: true,
    });
}

async function deleteTestUser() {
    const db = await dbConnect();
    const players = db.collection<PlayerModel>("players");
    const filter: Filter<PlayerModel> = {
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    };
    await players.deleteOne(filter);
}
