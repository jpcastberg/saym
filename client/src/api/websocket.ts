import {
    type GameWebsocketUpdateModel,
    type GameResponseModel,
} from "../../../shared/models/GameModels";
import logger from "./logger";

let websocketCheckInterval: NodeJS.Timeout;
let pingPongInterval: NodeJS.Timeout;
let websocket: WebSocket;
type EventCallback = (event: GameResponseModel) => void;
type EventListeners = Record<string, EventCallback[]>;
export const eventNames = new Set<string>(["gameUpdate"]); // todo: proper enum

createWebSocketConnection();

document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
        ensureWebsocketConnected();
    }
});

function createWebSocketConnection() {
    clearInterval(websocketCheckInterval);
    websocketCheckInterval = setInterval(ensureWebsocketConnected, 5000);
    websocket = new WebSocket(`wss://${location.host}/websocket`);
    websocket.addEventListener("message", handleIncomingWebsocketMessage);
    websocket.addEventListener("open", initPingPong);
}

const eventListeners: EventListeners = [...eventNames.values()].reduce(
    (acc: EventListeners, eventName) => {
        acc[eventName] = [];
        return acc;
    },
    {},
);

function handleIncomingWebsocketMessage(event: MessageEvent) {
    const message = event.data as string;
    if (message === "ping") {
        websocket.send("pong");
        return;
    } else if (message === "pong") {
        return;
    }

    const parsedEvent: GameWebsocketUpdateModel = JSON.parse(
        message,
    ) as GameWebsocketUpdateModel;

    logger.debug("client_websocket_message_received", parsedEvent);

    if (eventNames.has(parsedEvent.eventType)) {
        for (const eventListener of eventListeners[parsedEvent.eventType]) {
            eventListener(parsedEvent.data);
        }
    }
}

export function listenForWebsocketEvent(
    eventName: string,
    callback: EventCallback,
) {
    if (eventNames.has(eventName)) {
        eventListeners[eventName].push(callback);
    }
}

export function ensureWebsocketConnected() {
    if (
        websocket.readyState !== WebSocket.OPEN &&
        websocket.readyState !== WebSocket.CONNECTING
    ) {
        logger.debug("recreating_websocket_connection", null);
        createWebSocketConnection();
    }
}

function initPingPong() {
    logger.debug("websocket_connection_open", null);
    clearInterval(pingPongInterval);
    websocket.send("ping");
    pingPongInterval = setInterval(() => {
        websocket.send("ping");
    }, 30000);
}
