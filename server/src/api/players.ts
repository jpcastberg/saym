import express, { type Request, type Response } from "express";
import { type WithId } from "mongodb";
import playersDbApi from "../database/players";
import {
    type PlayerUpdateModel,
    type PlayerModel,
    PhoneValidationRequestModel,
    PhoneValidationResponseModel,
} from "../../../shared/models/PlayerModels";
import { type ResponseLocals } from "../models";
import getRandomIntInclusive from "../utils/getRandomIntInclusive";
import sendSms from "../utils/sendSms";

const phoneNumberValidationCodes = new Map<string, string>();
const playersApi = express.Router();

playersApi.get(
    "/me",
    async (req, res: Response<WithId<PlayerModel>, ResponseLocals>) => {
        const {
            locals: { playerId },
        } = res;
        const player = await playersDbApi.get(playerId);
        if (player) {
            res.send(player);
        } else {
            res.status(404).send();
        }
    },
);

playersApi.put(
    "/me",
    async (
        req: Request<
            Record<string, string>,
            WithId<PlayerModel>,
            PlayerUpdateModel
        >,
        res: Response<WithId<PlayerModel>, ResponseLocals>,
    ) => {
        const {
            locals: { playerId },
        } = res;
        const playerUpdateBody: PlayerUpdateModel = req.body;
        const phoneNumber = playerUpdateBody.phoneNumber
            ? `+1${playerUpdateBody.phoneNumber}`
            : null;
        const updatedPlayer = await playersDbApi.update(
            playerId,
            playerUpdateBody.username?.slice(0, 25) ?? null,
            playerUpdateBody.sendNotifications ?? null,
            phoneNumber,
            playerUpdateBody.phoneNumber ? false : null,
            playerUpdateBody.pushSubscription ?? null,
        );

        if (phoneNumber) {
            console.log(`WE HAVE A PHONE NUMBER: ${phoneNumber}`);
            sendPhoneNumberValidationCode(playerId, phoneNumber);
        }

        if (updatedPlayer) {
            res.send(updatedPlayer);
        } else {
            res.status(404).send();
        }
    },
);

playersApi.post(
    "/me/validate-phone",
    async (
        req: Request<
            Record<string, string>,
            PhoneValidationResponseModel,
            PhoneValidationRequestModel
        >,
        res: Response<PhoneValidationResponseModel, ResponseLocals>,
    ) => {
        const {
            locals: { playerId },
        } = res;
        const {
            body: { code },
        } = req;

        if (code === phoneNumberValidationCodes.get(playerId)) {
            const dbResponse = await playersDbApi.update(
                playerId,
                null,
                null,
                null,
                true,
                null,
            );

            res.send({
                success: true,
                player: dbResponse,
            });
        } else {
            res.status(400).send({
                success: false,
                player: null,
            });
        }
    },
);

function sendPhoneNumberValidationCode(playerId: string, phoneNumber: string) {
    let validationCode = "";

    while (validationCode.length < 6) {
        validationCode += getRandomIntInclusive(9); // 0-9
    }

    phoneNumberValidationCodes.set(playerId, validationCode);
    setTimeout(() => {
        phoneNumberValidationCodes.delete(playerId);
    }, 120000); // valid for two minutes

    void sendSms(
        phoneNumber,
        `Your verification code for Saym is ${validationCode}. This code will be valid for two minutes.

@${process.env.SAYM_DOMAIN} #${validationCode}`,
    );
}

export default playersApi;
