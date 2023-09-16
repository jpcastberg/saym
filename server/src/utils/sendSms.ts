import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_PHONE_NUMBER;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

const client = twilio(accountSid, authToken);

async function sendSms(to: string, body: string) {
    console.log("sending sms to:", to, "from:", from, "body:", body);
    await client.messages.create({
        body,
        to,
        messagingServiceSid,
    });
}

export default sendSms;
