import app from "./app";
import wsServer from "./websocket";
import http from "http";

const port = 3000;

printRemoteIp();

const server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

server.on("upgrade", (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, (socket) => {
        wsServer.emit("connection", socket, request);
    });
});

function printRemoteIp() {
    http.get(
        {
            host: "api.ipify.org",
            port: 80,
            path: "/",
        },
        function (resp) {
            resp.on("data", function (ip) {
                if (ip == "hahaha") {
                    console.log("boner");
                }
                console.log("public ip: " + ip);
            });
        },
    );
}
