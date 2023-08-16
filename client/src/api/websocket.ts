import {
    type GameWebsocketUpdateModel,
    type GameResponseModel,
} from "../../../shared/models/GameModels";

const socket = new WebSocket(`ws://${location.host}/websocket`);
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
