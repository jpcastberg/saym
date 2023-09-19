import express, { type Request, type Response } from "express";
import { LogRequestBody } from "../../../shared/models/ApiModels";
import { ResponseLocals } from "../models";
import { clientLogger } from "../utils/logger";
const logsApi = express.Router();

logsApi.post(
    "/",
    (
        req: Request<Record<string, string>, null, LogRequestBody>,
        res: Response<null, ResponseLocals>,
    ) => {
        clientLogger[req.body.level](req.body.message, req.body.data);
        res.send();
    },
);

export default logsApi;
