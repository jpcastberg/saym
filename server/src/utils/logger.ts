import winston from "winston";
import LokiTransport from "winston-loki";

const lokiTransportBaseOptions = {
    host: process.env.GRAFANA_HOST!,
    labels: { app: "saym" },
    json: true,
    basicAuth: `${process.env.GRAFANA_USER_ID}:${process.env.GRAFANA_PASSWORD}`,
    format: winston.format.json(),
    replaceTimestamp: true,
    onConnectionError: (err: Error) => {
        console.error(err);
    },
};

export const clientLogger = winston.createLogger({
    level: "debug",
    transports: [
        new LokiTransport({
            ...lokiTransportBaseOptions,
            labels: {
                ...lokiTransportBaseOptions.labels,
                type: "client",
            },
        }),
        new winston.transports.Console({}),
    ],
});

export const serverLogger = winston.createLogger({
    level: "debug",
    transports: [
        new LokiTransport({
            ...lokiTransportBaseOptions,
            labels: {
                ...lokiTransportBaseOptions.labels,
                type: "server",
            },
        }),
        new winston.transports.Console({}),
    ],
});

export const apiRequestLogger = winston.createLogger({
    level: "debug",
    transports: [
        new LokiTransport({
            ...lokiTransportBaseOptions,
            labels: {
                ...lokiTransportBaseOptions.labels,
                type: "apiRequest",
            },
        }),
    ],
});
