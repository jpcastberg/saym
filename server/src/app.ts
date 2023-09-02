import path from "path";
import express from "express";
import tokenHandler from "./utils/tokenHandler";
import gamesApi from "./api/games";
import playersApi from "./api/players";

const app = express();

app.disable("x-powered-by");
app.use(express.json());
app.use(tokenHandler);
app.use("/api/games", gamesApi);
app.use("/api/players", playersApi);
app.use(express.static(path.resolve(__dirname, "../../client/dist")));

app.get("/**", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../../client/dist/index.html"));
});

export default app;
