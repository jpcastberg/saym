import app from "./app";
import wsServer from "./websocket";

const port = 7296;

const server = app.listen(port, () => {
    console.log(`Saym app listening on port ${port}`);
});

server.on("upgrade", (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, (socket) => {
        wsServer.emit("connection", socket, request);
    });
});
