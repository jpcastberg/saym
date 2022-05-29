import crypto from "crypto";

export default function generateId(length: number) {
    return crypto.randomBytes(length).toString("hex");
}
