import {
    type GameWebsocketUpdateModel,
    type GameResponseModel,
} from "../../../shared/models/GameModels";

let websocketCheckInterval: NodeJS.Timer;
let socket = createWebSocketConnection();
const eventNames = new Set<string>(["gameUpdate"]); // todo: proper enum

socket.addEventListener("message", (event: MessageEvent) => {
    const message = event.data as string;
    if (message === "ping") {
        socket.send("pong");
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
});

document.addEventListener("visibilitychange", function () {
    ensureWebsocketConnected();
});

function createWebSocketConnection() {
    clearInterval(websocketCheckInterval);
    websocketCheckInterval = setInterval(ensureWebsocketConnected, 10000);
    return new WebSocket(`wss://${location.host}/websocket`);
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

export { eventNames };

export function listenForEvent(eventName: string, callback: EventCallback) {
    if (eventNames.has(eventName)) {
        eventListeners[eventName].push(callback);
    }
}

export function ensureWebsocketConnected() {
    console.log("socket.readyState:", getSocketReadyState());
    if (socket.readyState === WebSocket.OPEN) {
        socket.send("ping");
    } else if (socket.readyState !== WebSocket.CONNECTING) {
        console.log("recreating websocket connection");
        socket = createWebSocketConnection();
    }
}

function getSocketReadyState() {
    switch (socket.readyState) {
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
