import express from "express";
import tokenHandler from "./token_handler";
import gamesApi from "./api/games";

const app = express();

app.disable("x-powered-by");
app.use(express.json());
app.use(tokenHandler);
app.use("/api/games", gamesApi);

app.get("/", (req, res) => {
    // intro page, start game, list in-progress
    const response = `Your user id is ${res.locals.userId}! Your token is ${res.locals.token}!`;
    res.send(response);
});

export default app;
