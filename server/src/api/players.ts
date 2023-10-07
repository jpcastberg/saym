import express, { type Request, type Response } from "express";
import { type WithId } from "mongodb";
import playersDbApi from "../database/players";
import {
    type PlayerUpdateModel,
    type PlayerModel,
    type VerifyPhoneRequestModel,
    type VerifyPhoneResponseModel,
    type RequestPhoneVerificationModel,
    type PushSubscriptionModel,
    type PushSubscriptionUpdateModel,
} from "../../../shared/models/PlayerModels";
import { type ResponseLocals } from "../models";
import getRandomIntInclusive from "../utils/getRandomIntInclusive";
import sendSms from "../utils/sendSms";
import tokensDbApi from "../database/token";
import gamesDbApi from "../database/games";
import { setNewTokenOnResponse } from "../utils/tokenHandler";
import calculatePushSubscriptionId from "../../../shared/utils/calculatePushSubscriptionId";
import { ErrorResponse } from "../../../shared/models/ApiModels";
import sendNotification from "../utils/sendNotification";

interface PendingPhoneModel {
    phoneNumber: string;
    code: string;
    timeout: NodeJS.Timeout;
}

const pendingPhoneNumbers = new Map<string, PendingPhoneModel>();
const playersApi = express.Router();

playersApi.get(
    "/me",
    async (req, res: Response<WithId<PlayerModel>, ResponseLocals>) => {
        const {
            locals: { playerId },
        } = res;
        const player = await playersDbApi.get({ playerId });
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
        res: Response<WithId<PlayerModel> | ErrorResponse, ResponseLocals>,
    ) => {
        const {
            locals: { playerId },
        } = res;
        const { body: playerUpdateBody } = req;

        const updatedPlayer = await playersDbApi.update({
            ...playerUpdateBody,
            playerId,
            username: playerUpdateBody.username?.slice(0, 25) ?? undefined,
        });

        if (updatedPlayer) {
            res.send(updatedPlayer);
        } else {
            res.status(404).send();
        }
    },
);

playersApi.post(
    "/me/push-subscriptions",
    async (
        req: Request<PushSubscriptionModel, null, PushSubscriptionJSON>,
        res: Response<PushSubscriptionModel, ResponseLocals>,
    ) => {
        const {
            locals: { playerId, token },
        } = res;
        const pushSubscriptionId = calculatePushSubscriptionId(req.body);

        if (!pushSubscriptionId) {
            res.status(400).send();
        }

        const currentPlayer = await playersDbApi.get({ playerId });
        const matchingExistingSubscription =
            currentPlayer?.pushSubscriptions.find(
                (subscription) => subscription._id === pushSubscriptionId,
            );

        let pushSubscription: PushSubscriptionModel | undefined;

        if (matchingExistingSubscription) {
            const response = await playersDbApi.updatePushSubscription({
                playerId,
                pushSubscriptionId: pushSubscriptionId!,
                isActive: true,
            });

            if (response) {
                pushSubscription = response;
            }
        } else {
            pushSubscription = {
                _id: pushSubscriptionId!,
                isActive: true,
                subscription: req.body,
            };

            await playersDbApi.update({
                playerId,
                pushSubscription,
            });
        }

        if (pushSubscription) {
            res.send(pushSubscription);
            await sendExamplePushNotification(playerId, token);
        } else {
            res.status(500).send();
        }
    },
);

playersApi.put(
    "/me/push-subscriptions/:pushSubscriptionId",
    async (
        req: Request<Record<string, string>, null, PushSubscriptionUpdateModel>,
        res: Response<PushSubscriptionModel, ResponseLocals>,
    ) => {
        const {
            params: { pushSubscriptionId },
        } = req;
        const {
            locals: { playerId },
        } = res;
        const {
            body: { isActive },
        } = req;

        const updatedPushSubscription =
            await playersDbApi.updatePushSubscription({
                playerId,
                pushSubscriptionId,
                isActive,
            });

        if (updatedPushSubscription) {
            res.send(updatedPushSubscription);
        } else {
            res.status(500).send();
        }
    },
);

playersApi.post(
    "/me/logout",
    async (
        req: Request<Record<string, string>, null, null>,
        res: Response<Record<string, never>, ResponseLocals>,
    ) => {
        await setNewTokenOnResponse(res);
        res.send();
    },
);

playersApi.post(
    "/me/request-phone-verification",
    (
        req: Request<
            Record<string, string>,
            null,
            RequestPhoneVerificationModel
        >,
        res: Response<null, ResponseLocals>,
    ) => {
        const {
            body: { phoneNumber },
        } = req;
        const {
            locals: { token },
        } = res;

        sendPhoneNumberValidationCode(token, phoneNumber);

        res.status(200).send();
    },
);

playersApi.post(
    "/me/verify-phone",
    async (
        req: Request<
            Record<string, string>,
            VerifyPhoneResponseModel,
            VerifyPhoneRequestModel
        >,
        res: Response<VerifyPhoneResponseModel, ResponseLocals>,
    ) => {
        const {
            locals: { playerId, token },
        } = res;
        const {
            body: { code },
        } = req;

        const pendingPhoneNumber = pendingPhoneNumbers.get(token);
        let didMerge = false;

        if (code === pendingPhoneNumber?.code) {
            clearTimeout(pendingPhoneNumber.timeout);
            pendingPhoneNumbers.delete(token);
            let player = await playersDbApi.getByPhoneNumber({
                phoneNumber: pendingPhoneNumber.phoneNumber,
            });

            if (player) {
                await gamesDbApi.mergeGames({
                    fromPlayerId: playerId,
                    toPlayerId: player._id,
                });
                await playersDbApi.delete({ playerId });
                await tokensDbApi.update({
                    playerId: player._id,
                    tokenValue: token,
                });
                didMerge = true;
            } else {
                player = await playersDbApi.update({
                    playerId: playerId,
                    phoneNumber: pendingPhoneNumber.phoneNumber,
                    shouldCollectPhoneNumber: false,
                });
            }

            res.send({
                success: true,
                didMerge,
                player,
            });
        } else {
            res.status(400).send({
                success: false,
                didMerge,
                player: null,
            });
        }
    },
);

async function sendExamplePushNotification(playerId: string, token: string) {
    await sendNotification({
        playerId,
        token,
        url: null,
        title: "Example Notification",
        message: "This is how Saym notifications will appear",
    });
}

function sendPhoneNumberValidationCode(token: string, phoneNumber: string) {
    let code = "";

    while (code.length < 6) {
        code += getRandomIntInclusive(9); // 0-9
    }

    pendingPhoneNumbers.set(token, {
        phoneNumber,
        code,
        timeout: setTimeout(() => {
            pendingPhoneNumbers.delete(token);
        }, 120000), // valid for two minutes
    });

    void sendSms(
        phoneNumber,
        `Your verification code for Saym is ${code}. This code will be valid for two minutes.${"\n\n"}@${
            process.env.SAYM_DOMAIN
        } #${code}`,
    );
}

export default playersApi;
