import {
    type GameWebsocketUpdateModel,
    type GameResponseModel,
} from "../../../shared/models/GameModels";

let websocketCheckInterval: NodeJS.Timer;
let websocket = createWebSocketConnection();
const eventNames = new Set<string>(["gameUpdate"]); // todo: proper enum

document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
        ensureWebsocketConnected();
    }
});

function createWebSocketConnection() {
    clearInterval(websocketCheckInterval);
    websocketCheckInterval = setInterval(ensureWebsocketConnected, 5000);
    const websocket = new WebSocket(`wss://${location.host}/websocket`);
    websocket.addEventListener("message", handleIncomingWebsocketMessage);
    return websocket;
}

type EventCallback = (event: GameResponseModel) => void;
type EventListeners = Record<string, EventCallback[]>;

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

    if (eventNames.has(parsedEvent.eventType)) {
        for (const eventListener of eventListeners[parsedEvent.eventType]) {
            eventListener(parsedEvent.data);
        }
    }
}

export { eventNames };

export function listenForEvent(eventName: string, callback: EventCallback) {
    if (eventNames.has(eventName)) {
        eventListeners[eventName].push(callback);
    }
}

export function ensureWebsocketConnected() {
    console.log("socket.readyState:", getSocketReadyState());
    if (websocket.readyState === WebSocket.OPEN) {
        websocket.send("ping");
    } else if (websocket.readyState !== WebSocket.CONNECTING) {
        console.log("recreating websocket connection");
        websocket = createWebSocketConnection();
    }
}

function getSocketReadyState() {
    switch (websocket.readyState) {
        case WebSocket.OPEN:
            return "OPEN";
        case WebSocket.CONNECTING:
            return "CONNECTING";
        case WebSocket.CLOSING:
            return "CLOSING";
        case WebSocket.CLOSED:
            return "CLOSED";
        default:
            return null;
    }
}
