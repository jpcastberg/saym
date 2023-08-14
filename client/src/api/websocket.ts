import {
    type GameWebsocketUpdateModel,
    type GameResponseModel,
} from "../../../shared/models/GameModels";

const socket = new WebSocket(`ws://${location.host}/websocket`);
const eventNames = new Set<string>(["gameUpdate"]); // todo: proper enum

socket.onopen = () => {
    console.log("Connected to server");
};

socket.onmessage = (event: MessageEvent) => {
    const parsedEvent: GameWebsocketUpdateModel = JSON.parse(
        event.data as string,
    ) as GameWebsocketUpdateModel;
    console.log("parsedEvent:", parsedEvent);

    if (eventNames.has(parsedEvent.eventType)) {
        console.log(
            "eventNames has",
            parsedEvent.eventType,
            "all event listeners:",
            eventListeners,
        );
        for (const eventListener of eventListeners[parsedEvent.eventType]) {
            console.log("calling event listener");
            eventListener(parsedEvent.data);
        }
    }
};

socket.onclose = () => {
    console.log("Connection closed");
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
