import express from "express";
import { WithId } from "mongodb";
import { usersDbApi } from "../../database";
import { type UserUpdateModel, type UserModel } from "../../../../shared/models/UserModels";

const usersApi = express.Router();

usersApi.get("/me", async (req, res) => {
    console.log("GET /api/users/me");
    const { "locals": { userId } } = res;
    const dbResponse = await usersDbApi.get(userId);
    res.send(dbResponse);
});

usersApi.put("/me", async (req, res) => {
    const { "locals": { userId } } = res;
    const userUpdateBody: UserUpdateModel = req.body;
    const username: string = userUpdateBody.username;
    await usersDbApi.update(userId, username);
    const dbResponse: WithId<UserModel> | null = await usersDbApi.get(userId);
    res.send(dbResponse);
});

// usersApi.get("/:userId", async (req, res) => {
//     const { "locals": { userId } } = res;
//     const dbResponse = await gamesDbApi.getAll(userId);
//     res.send(dbResponse);
// });

export default usersApi;
