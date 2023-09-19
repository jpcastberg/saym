export interface ErrorResponse {
    status: number;
    message: string;
    data?: Record<string, string>;
}

export interface LogRequestBody {
    level: "debug" | "info" | "warn" | "error";
    message: string;
    data: object;
}
