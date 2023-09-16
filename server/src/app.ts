import path from "path";
import express from "express";
import morgan from "morgan";
import tokenHandler from "./utils/tokenHandler";
import gamesApi from "./api/games";
import playersApi from "./api/players";

const app = express();

app.disable("x-powered-by");
app.use(morgan("dev"));
app.use(express.json());
app.use((req, res, next) => {
    req.body && console.log("incoming request body:", req.body);
    next();
});
app.use(tokenHandler);
app.use("/api/games", gamesApi);
app.use("/api/players", playersApi);
app.use(express.static(path.resolve(__dirname, "../../client/dist")));

app.get("/**", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../../client/dist/index.html"));
});

export default app;
