import ws from "ws";
import cookie from "cookie";
import playersDbApi from "./database/players";
import tokensDbApi, { type TokenModel } from "./database/token";

const connections = new Map<string, ws>();
const wsServer = new ws.Server({ noServer: true }); // noServer delegates the connection upgrade to express

wsServer.on("connection", async (socket, req) => {
    const providedToken = cookie.parse(req.headers.cookie ?? "").token;
    const existingToken: TokenModel | null = await tokensDbApi.get(
        providedToken,
    );

    if (existingToken) {
        const existingPlayer = await playersDbApi.get(existingToken.playerId);

        if (existingPlayer) {
            connections.set(existingPlayer._id, socket);

            socket.on("close", () => {
                connections.delete(existingPlayer._id);
            });
        }
    }
});

export function sendWebsocketMessage(playerId: string, message: string) {
    const recipientConnection: ws | undefined = connections.get(playerId);

    if (recipientConnection) {
        recipientConnection.send(message);
    }
}

export default wsServer;
