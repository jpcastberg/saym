import crypto from "crypto";

export default function generateId() {
    return crypto.randomBytes(4).toString("hex");
}
