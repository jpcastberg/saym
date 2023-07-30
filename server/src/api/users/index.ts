import express from "express";
import { WithId } from "mongodb";
import { UserModel, usersDbApi } from "../../database";

const usersApi = express.Router();

usersApi.get("/me", async (req, res) => {
    console.log("GET /api/users/me");
    const { "locals": { userId } } = res;
    const dbResponse = await usersDbApi.get(userId);
    res.send(dbResponse);
});

usersApi.put("/me", async (req, res) => {
    const { "locals": { userId } } = res;
    const { "body": { username } } = req;
    console.log("PUT /api/users/me, username = " + username);
    await usersDbApi.update(userId, username);
    const dbResponse = await usersDbApi.get(userId);
    res.send(dbResponse);
});

// usersApi.get("/:userId", async (req, res) => {
//     const { "locals": { userId } } = res;
//     const dbResponse = await gamesDbApi.getAll(userId);
//     res.send(dbResponse);
// });

export default usersApi;
