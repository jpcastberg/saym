import express, { type Request, type Response } from "express";
import { type WithId } from "mongodb";
import usersDbApi from "../database/users";
import {
    type UserUpdateModel,
    type UserModel,
    PhoneValidationRequestModel,
    PhoneValidationResponseModel,
} from "../../../shared/models/UserModels";
import { type ResponseLocals } from "../models";
import getRandomIntInclusive from "../utils/getRandomIntInclusive";
import sendSms from "../utils/sendSms";

const phoneNumberValidationCodes = new Map<string, string>();
const usersApi = express.Router();

usersApi.get(
    "/me",
    async (req, res: Response<WithId<UserModel>, ResponseLocals>) => {
        const {
            locals: { userId },
        } = res;
        const dbResponse = await usersDbApi.get(userId);
        if (dbResponse) {
            res.send(dbResponse);
        } else {
            res.status(404).send();
        }
    },
);

usersApi.put(
    "/me",
    async (
        req: Request<
            Record<string, string>,
            WithId<UserModel>,
            UserUpdateModel
        >,
        res: Response<WithId<UserModel>, ResponseLocals>,
    ) => {
        const {
            locals: { userId },
        } = res;
        const userUpdateBody: UserUpdateModel = req.body;
        const phoneNumber = userUpdateBody.phoneNumber
            ? `+1${userUpdateBody.phoneNumber}`
            : null;
        const dbResponse = await usersDbApi.update(
            userId,
            userUpdateBody.username ?? null,
            userUpdateBody.sendNotifications ?? null,
            phoneNumber,
            userUpdateBody.phoneNumber ? false : null,
            userUpdateBody.pushSubscription ?? null,
        );

        if (phoneNumber) {
            console.log(`WE HAVE A PHONE NUMBER: ${phoneNumber}`);
            sendPhoneNumberValidationCode(userId, phoneNumber);
        }

        if (dbResponse) {
            res.send(dbResponse);
        } else {
            res.status(404).send();
        }
    },
);

usersApi.post(
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
            locals: { userId },
        } = res;
        const {
            body: { code },
        } = req;

        if (code === phoneNumberValidationCodes.get(userId)) {
            const dbResponse = await usersDbApi.update(
                userId,
                null,
                null,
                null,
                true,
                null,
            );

            res.send({
                success: true,
                user: dbResponse,
            });
        } else {
            res.status(400).send({
                success: false,
                user: null,
            });
        }
    },
);

function sendPhoneNumberValidationCode(userId: string, phoneNumber: string) {
    let validationCode = "";

    while (validationCode.length < 6) {
        validationCode += getRandomIntInclusive(9); // 0-9
    }

    phoneNumberValidationCodes.set(userId, validationCode);
    setTimeout(() => {
        phoneNumberValidationCodes.delete(userId);
    }, 120000); // valid for two minutes

    void sendSms(
        phoneNumber,
        `Your verification code for Saym is ${validationCode}. This code will be valid for two minutes.

@${process.env.SAYM_DOMAIN} #${validationCode}`,
    );
}

export default usersApi;
