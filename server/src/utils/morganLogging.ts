import morgan from "morgan";
import colorize from "json-colorizer";
import { apiRequestLogger } from "./logger";

morgan.token("req-body", (req) => {
    // @ts-expect-error body property is added by express.json()
    return JSON.stringify(req.body);
});

interface ApiLogFormat {
    method?: string;
    url?: string;
    reqBody?: string | null;
    status?: string;
    responseTime?: string;
}
export default morgan(
    function (tokens, req, res) {
        const format: ApiLogFormat = {};
        const reqBody = tokens["req-body"](req, res);
        format.method = tokens.method(req, res);
        format.url = tokens.url(req, res);
        reqBody === "{}" ? (format.reqBody = null) : (format.reqBody = reqBody);
        format.status = tokens.status(req, res);
        format.responseTime = `${tokens["response-time"](req, res)} ms`;
        return JSON.stringify(format);
    },
    {
        stream: {
            write: (message) => {
                process.stdout.write(colorize(message));
                apiRequestLogger.debug("api_request", JSON.parse(message));
            },
        },
    },
);
