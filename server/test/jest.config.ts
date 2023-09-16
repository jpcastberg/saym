import { type JestConfigWithTsJest } from "ts-jest";

// Sync object
const config: JestConfigWithTsJest = {
    preset: "ts-jest",
    testEnvironment: "node",
    setupFiles: ["dotenv/config"],
    verbose: true,
    openHandlesTimeout: 0, // ignore open handles - caused by the websocket cleanup job
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                tsconfig: "tsconfig.node.json",
            },
        ],
    },
};
export default config;
