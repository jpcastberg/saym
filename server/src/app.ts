import path from "path";
import express from "express";
import tokenHandler from "./utils/tokenHandler";
import gamesApi from "./api/games";
import playersApi from "./api/players";
import messagesDbApi from "./database/messages";

void (async () => {
    // const response = await messagesDbApi.create("USER_ID_ONE", "USER_ID_TWO");
    // console.log("created message:", response);

    // const response = await messagesDbApi.update(
    //     "USER_ID_ONE.USER_ID_TWO",
    //     "boner!!",
    // );
    // console.log("created message:", response);

    const response = await messagesDbApi.updateMessage(
        "USER_ID_ONE.USER_ID_TWO",
        "29284324",
        false,
    );
    console.log("updated message:", response);
})();

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
