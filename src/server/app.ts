import express from "express";
import tokenHandler from "./token_handler";

const app = express();

app.use(tokenHandler);

app.get("/", (req, res) => {
    // intro page, start game, list in-progress
    const response = `Your user id is ${res.locals.user.user_id}! Your token is ${res.locals.token}!`;
    res.send(response);
});

app.get("/games", (req, res) => {
    // get in-progress games
    res.send("Hello World!");
});

app.post("/games", (req, res) => {
    // create new game, invite player two, respond with game id
    res.send("Hello World!");
});

app.get("/games/:gameId", (req, res) => {
    // game page
    res.send("Hello World!");
});

app.post("/games/:gameId/turn", (req, res) => {
    // post word, send sms message
    res.send("Hello World!");
});

export default app;
