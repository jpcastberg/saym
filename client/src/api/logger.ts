import { usePlayerStore } from "../stores/player";
import { type LogRequestBody } from "../../../shared/models/ApiModels";

const logger = {
    debug(message: string, data: object | null) {
        log("debug", message, data);
    },
    info(message: string, data: object | null) {
        log("info", message, data);
    },
    warn(message: string, data: object | null) {
        log("warn", message, data);
    },
    error(message: string, data: object | null) {
        log("error", message, data);
    },
};

window.onerror = (event: string | Event) => {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    logger.error(`uncaught_exception: ${event.toString()}`, null);
};

function log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data: object | null,
) {
    const playerStore = usePlayerStore();
    data = data ?? {};
    const reqBody: LogRequestBody = {
        level,
        message,
        data: {
            meta: {
                playerId: String(playerStore.player?._id),
                username: String(playerStore.player?.username),
                userAgent: navigator.userAgent,
            },
            ...data,
        },
    };

    void fetch("/api/logs", {
        method: "post",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(reqBody),
    });
}

export default logger;
