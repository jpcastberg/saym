import express, { Request, Response } from "express";
import { WithId } from "mongodb";
import { usersDbApi } from "../database";
import { UserUpdateModel, UserModel } from "../../../shared/models/UserModels";
import { ResponseLocals } from "../models/models";

const usersApi = express.Router();

usersApi.get(
    "/me",
    async (req, res: Response<WithId<UserModel>, ResponseLocals>) => {
        console.log("GET /api/users/me");
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
        req: Request<Record<string, never>, WithId<UserModel>, UserUpdateModel>,
        res: Response<WithId<UserModel>, ResponseLocals>,
    ) => {
        const {
            locals: { userId },
        } = res;
        const userUpdateBody: UserUpdateModel = req.body;
        const username: string = userUpdateBody.username;
        await usersDbApi.update(userId, username);
        const dbResponse = await usersDbApi.get(userId);

        if (dbResponse) {
            res.send(dbResponse);
        } else {
            res.status(404).send();
        }
    },
);

// usersApi.get("/:userId", async (req, res) => {
//     const { "locals": { userId } } = res;
//     const dbResponse = await gamesDbApi.getAll(userId);
//     res.send(dbResponse);
// });

export default usersApi;
