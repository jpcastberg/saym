import ws from "ws";
import cookie from "cookie";
import { tokensDbApi, usersDbApi, TokenModel } from "./database";

const connections = new Map<string, ws>();
const wsServer = new ws.Server({ noServer: true }); // noServer delegates the connection upgrade to express

wsServer.on("connection", async (socket, req) => {
    const providedToken = cookie.parse(req.headers.cookie ?? "").token;
    const existingToken: TokenModel | null = await tokensDbApi.get(
        providedToken,
    );

    if (existingToken) {
        const existingUser = await usersDbApi.get(existingToken.user_id);

        if (existingUser) {
            console.log(
                `existing user with username ${existingUser.username} and id ${existingUser._id} connected!`,
            );
            connections.set(existingUser._id, socket);

            socket.on("close", () => {
                connections.delete(existingUser._id);
            });
        }
    }
});

export function sendWebsocketMessage(userId: string, message: string) {
    const recipientConnection: ws | undefined = connections.get(userId);

    if (recipientConnection) {
        recipientConnection.send(message);
    }
}

export default wsServer;
