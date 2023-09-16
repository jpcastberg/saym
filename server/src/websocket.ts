import ws, { type MessageEvent } from "ws";
import cookie from "cookie";
import playersDbApi from "./database/players";
import tokensDbApi, { type TokenModel } from "./database/token";

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
        console.log("connection closed, removing", existingPlayer._id);
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
            console.log(
                "received message from allegedly inactive socket",
                playerSocket,
            );
        }

        playerSocket.lastUpdate = new Date();
        const message = String(binaryMessage);

        if (message === "ping") {
            socket.send("pong");
        } else if (message === "pong") {
            setTimeout(() => {
                socket.send("ping");
            }, 30000);
        }
    });

    socket.send("ping");
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
            console.log("removing stale connection from player:", playerId);
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
