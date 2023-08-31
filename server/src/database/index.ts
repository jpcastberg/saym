import {
    type Db,
    type Filter,
    MongoClient,
    type MongoClientOptions,
    ServerApiVersion,
} from "mongodb";
import { type PlayerModel } from "../../../shared/models/PlayerModels";

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
    const players = db.collection<PlayerModel>("players");
    const filter: Filter<PlayerModel> = {
        _id: botName,
    };
    const bot: PlayerModel = {
        _id: botName,
        username: botName,
        sendNotifications: false,
        phoneNumber: null,
        isPhoneNumberValidated: false,
        pushSubscription: null,
    };
    void players.replaceOne(filter, bot, {
        upsert: true,
    });
}
