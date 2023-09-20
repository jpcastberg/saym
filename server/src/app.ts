import path from "path";
import express, { NextFunction, Request, Response } from "express";
import { type ErrorResponse } from "../../shared/models/ApiModels";
import tokenHandler from "./utils/tokenHandler";
import morganLogging from "./utils/morganLogging";
import gamesApi from "./api/games";
import playersApi from "./api/players";
import logsApi from "./api/logs";
import { type ResponseLocals } from "./models";
import { serverLogger } from "./utils/logger";

const app = express();

app.disable("x-powered-by");
app.use(express.json());
app.use(morganLogging);
app.use(tokenHandler);
app.use("/api/games", gamesApi);
app.use("/api/players", playersApi);
app.use("/api/logs", logsApi);
app.use(express.static(path.resolve(__dirname, "../../client/dist")));
app.use(handleError);

app.get("/api/healthcheck", (req, res) => {
    res.json({
        healthy: true,
    });
});

app.get("/**", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../../client/dist/index.html"));
});

function handleError(
    err: Error,
    req: Request<Record<string, string>, ErrorResponse, object>,
    res: Response<ErrorResponse, ResponseLocals>,
    next: NextFunction,
) {
    if (res.headersSent) {
        next(err);
        return;
    }

    const {
        locals: { playerId, token },
    } = res;

    serverLogger.error("uncaught_server_error", {
        cause: err.cause,
        message: err.message,
        name: err.name,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        headers: req.headers,
        params: req.params,
        query: req.query,
        body: req.body,
        playerId,
        token,
    });
}

export default app;
