import express, { Request, Response } from "express";
import { WithId } from "mongodb";
import { usersDbApi } from "../database";
import { UserUpdateModel, UserModel } from "../../../shared/models/UserModels";
import { ResponseLocals } from "../models/models";

const usersApi = express.Router();

usersApi.get(
    "/me",
    async (req, res: Response<WithId<UserModel>, ResponseLocals>) => {
        const {
            locals: { userId },
        } = res;
        const dbResponse = await usersDbApi.get(userId);
        if (dbResponse) {
            res.send(dbResponse);
        } else {
            res.status(404).send();
        }
    },
);

usersApi.put(
    "/me",
    async (
        req: Request<
            Record<string, string>,
            WithId<UserModel>,
            UserUpdateModel
        >,
        res: Response<WithId<UserModel>, ResponseLocals>,
    ) => {
        const {
            locals: { userId },
        } = res;
        const userUpdateBody: UserUpdateModel = req.body;
        const username: string = userUpdateBody.username;
        const dbResponse = await usersDbApi.update(userId, username);

        if (dbResponse) {
            res.send(dbResponse);
        } else {
            res.status(404).send();
        }
    },
);

export default usersApi;
