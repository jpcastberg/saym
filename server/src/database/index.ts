import {
    type Db,
    type Filter,
    MongoClient,
    type MongoClientOptions,
    ServerApiVersion,
} from "mongodb";
import { type UserModel } from "../../../shared/models/UserModels";

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

export async function dbClose() {
    await client.close();
}

export async function dbConnect() {
    if (dbConnection) {
        return dbConnection;
    }
    await client.connect();
    console.log("db connected!");
    dbConnection = client.db("saym");
    return dbConnection;
}

export const botName = "Saymbot";

async function initBot() {
    const db = await dbConnect();
    const users = db.collection<UserModel>("users");
    const filter: Filter<UserModel> = {
        _id: botName,
    };
    const bot: UserModel = {
        _id: botName,
        username: botName,
        sendNotifications: false,
        phoneNumber: null,
        isPhoneNumberValidated: false,
        pushSubscription: null,
    };
    void users.replaceOne(filter, bot, {
        upsert: true,
    });
}
