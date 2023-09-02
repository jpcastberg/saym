import {
    type GameWebsocketUpdateModel,
    type GameResponseModel,
} from "../../../shared/models/GameModels";

let socket = createWebSocketConnection();
const eventNames = new Set<string>(["gameUpdate"]); // todo: proper enum

socket.onmessage = (event: MessageEvent) => {
    const parsedEvent: GameWebsocketUpdateModel = JSON.parse(
        event.data as string,
    ) as GameWebsocketUpdateModel;

    if (eventNames.has(parsedEvent.eventType)) {
        for (const eventListener of eventListeners[parsedEvent.eventType]) {
            eventListener(parsedEvent.data);
        }
    }
};

document.addEventListener("visibilitychange", function () {
    ensureWebsocketConnected();
});

function createWebSocketConnection() {
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
    let connectionStatus = "";
    switch (socket.readyState) {
        case WebSocket.OPEN:
            connectionStatus = "OPEN"
            break;
        case WebSocket.CONNECTING:
            connectionStatus = "CONNECTING"
            break;
        case WebSocket.CLOSING:
            connectionStatus = "CLOSING"
            break;
        case WebSocket.CLOSED:
            connectionStatus = "CLOSED"
            break;
        default:
            break;
    }

    console.log("socket.readyState:", connectionStatus)
    if (socket.readyState !== WebSocket.OPEN && socket.readyState !== WebSocket.CONNECTING) {
        console.log("recreating websocket connection")
        socket = createWebSocketConnection();
    }
}
