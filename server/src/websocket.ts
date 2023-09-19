import ws, { type MessageEvent } from "ws";
import cookie from "cookie";
import playersDbApi from "./database/players";
import tokensDbApi, { type TokenModel } from "./database/token";
import { serverLogger } from "./utils/logger";

interface PlayerSocket {
    playerId: string;
    socket: ws;
    lastUpdate: Date;
}

const playerSocketsMap = new Map<string, PlayerSocket[]>();
const wsServer = new ws.Server({ noServer: true }); // noServer delegates the connection upgrade to express

wsServer.on("connection", async (socket, req) => {
    const providedToken = cookie.parse(req.headers.cookie ?? "").token;
    const existingToken: TokenModel | null = await tokensDbApi.get({
        tokenValue: providedToken,
    });

    if (!existingToken) {
        return;
    }

    const existingPlayer = await playersDbApi.get({
        playerId: existingToken.playerId,
    });

    if (!existingPlayer) {
        return;
    }

    const playerSockets = getOrCreatePlayerSocketsList(existingPlayer._id);

    const newPlayerSocket = {
        playerId: existingPlayer._id,
        socket,
        lastUpdate: new Date(),
    };

    playerSockets.push(newPlayerSocket);

    initPingPong(newPlayerSocket);

    socket.on("close", () => {
        serverLogger.debug("websocket_connection_closed", {
            playerId: existingPlayer._id,
            username: existingPlayer.username,
        });
        removeConnection(existingPlayer._id, newPlayerSocket);
    });
});

setInterval(cleanupConnections, 60 * 1000);

function sendWebsocketMessage(playerId: string, message: string) {
    const playerSockets: PlayerSocket[] | undefined =
        playerSocketsMap.get(playerId);

    if (!playerSockets) {
        return;
    }

    for (const playerSocket of playerSockets) {
        playerSocket.socket.send(message);
    }

    serverLogger.debug("websocket_message_sent", {
        playerId,
        message,
    });
}

function getOrCreatePlayerSocketsList(playerId: string) {
    let playerSockets = playerSocketsMap.get(playerId);

    if (!playerSockets) {
        playerSockets = [];
        playerSocketsMap.set(playerId, playerSockets);
    }

    return playerSockets;
}

function initPingPong(playerSocket: PlayerSocket) {
    const { socket } = playerSocket;

    socket.on("message", (binaryMessage: MessageEvent) => {
        if (!isActiveSocket(playerSocket)) {
            serverLogger.warn("message_from_inactive_websocket", playerSocket);
        }

        playerSocket.lastUpdate = new Date();
        const message = String(binaryMessage);

        if (message === "ping") {
            socket.send("pong");
        }
    });
}

function isActiveSocket(playerSocket: PlayerSocket) {
    const playerSockets = playerSocketsMap.get(playerSocket.playerId);
    return playerSockets?.includes(playerSocket);
}

function cleanupConnections() {
    const currentTime = new Date().getTime();
    for (const [playerId, playerSockets] of playerSocketsMap.entries()) {
        const staleConnections: PlayerSocket[] = [];
        for (const playerSocket of playerSockets) {
            const inactivityThreshold = 5 * 60 * 1000;
            const lastUpdatedTime = playerSocket.lastUpdate.getTime();

            if (currentTime - lastUpdatedTime > inactivityThreshold) {
                staleConnections.push(playerSocket);
            }
        }

        for (const staleConnection of staleConnections) {
            serverLogger.debug("stale_websocket_removal", {
                playerId,
            });
            removeConnection(playerId, staleConnection);
        }
    }
}

function removeConnection(playerId: string, playerSocket: PlayerSocket) {
    const playerSockets = playerSocketsMap.get(playerId);
    if (playerSockets) {
        const index = playerSockets.indexOf(playerSocket);

        if (index === -1) {
            return;
        }

        playerSocket.socket.terminate();
        playerSockets.splice(index, 1);

        if (playerSockets.length === 0) {
            playerSocketsMap.delete(playerId);
        }
    }
}

export { sendWebsocketMessage };
export default wsServer;
