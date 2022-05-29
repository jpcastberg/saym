import app from "./app";
import http from "http";

const port = 3000;

printRemoteIp();

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

function printRemoteIp() {
    http.get({
        "host": "api.ipify.org",
        "port": 80,
        "path": "/"
    }, function(resp) {
        resp.on("data", function(ip) {
            console.log("public ip: " + ip);
        });
    });
}
