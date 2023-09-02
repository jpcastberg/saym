<script setup lang="ts">
import { ref } from "vue";
import { usePlayerStore } from "../stores/player";
import validateUsername from "../utils/validateUsername";
const playerStore = usePlayerStore();
const usernameInput = ref("");
const phoneNumberInput = ref("");
const oneTimeCodeForm = ref<HTMLFormElement | null>(null);
const oneTimeCodeInput = ref<HTMLInputElement | null>(null);
const oneTimeCodeInputValue = ref("");

async function setUsername() {
    await playerStore.updateUsername(usernameInput.value);
}

async function setNotificationPreference(event: SubmitEvent) {
    const sendNotifications = event.submitter?.id === "notification-preference-true";
    await playerStore.setNotificationPreference(sendNotifications);
}

async function setPhoneNumber(event: SubmitEvent) {
    const submitPhoneNumber = event.submitter?.id === "submit-phone-number";
    if (submitPhoneNumber) {
        await playerStore.updatePhoneNumber(phoneNumberInput.value);
        if ("OTPCredential" in window) {
            await autoSubmitOtp();
        }
    } else {
        await playerStore.setNotificationPreference(false);
    }
}

async function submitOneTimeCode(event: SubmitEvent) {
    event.preventDefault();
    await playerStore.verifyPhoneNumber(oneTimeCodeInputValue.value);
}

async function autoSubmitOtp() {
    const ac = new AbortController();
    const form = oneTimeCodeForm.value!;
    const input = oneTimeCodeInput.value!;
    form.addEventListener("submit", () => {
        ac.abort();
    });

    await navigator.credentials
        .get({
            // @ts-expect-error otp is not yet a recognized param in typescript CredentialRequestOptions
            otp: { transport: ["sms"] },
            signal: ac.signal,
        })
        .then((otp) => {
            // When the OTP is received by the app client, enter it into the form
            // input and submit the form automatically
            // @ts-expect-error see above
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            input.value = otp!.code;
            form.submit();
        })
        .catch((err) => {
            console.error(err);
        });
}
</script>

<template>
    <v-dialog v-model="playerStore.playerNeedsInitialization">
        <v-card v-if="playerStore.needsUsername">
            <v-card-title class="pt-5 px-5 pb-3 d-flex justify-center">
                <span class="text-h5">Welcome to Saym!</span>
            </v-card-title>
            <v-form class="pt-0 px-5 pb-5 d-flex flex-column align-center" @submit.prevent="setUsername">
                <v-text-field v-model="usernameInput" class="w-100" :rules="[validateUsername]"
                    label="What should we call you?" required />
                <v-card-text class="w-100 pt-0 px-0 text-center">
                    Choose a name your friends will recognize.
                </v-card-text>
                <v-card-actions class="py-0">
                    <v-btn size="large" type="submit" color="teal-darken-1" variant="elevated">
                        Let's Go!
                    </v-btn>
                </v-card-actions>
            </v-form>
        </v-card>
        <v-card v-else-if="playerStore.needsToSetNotifications">
            <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center">
                <span class="text-h5">Receive Notifications?</span>
            </v-card-title>
            <v-card-text class="w-100 px-2 py-0 text-center">
                Notifications relate only to games you are in.
            </v-card-text>
            <v-form class="pt-2 px-5 pb-5 d-flex flex-column align-center" @submit.prevent="setNotificationPreference">
                <v-card-actions class="py-0">
                    <v-btn size="large" type="submit" color="grey-lighten-1" variant="elevated">
                        Not Now
                    </v-btn>
                    <v-btn id="notification-preference-true" size="large" type="submit" color="teal-darken-1"
                        variant="elevated">
                        Yes
                    </v-btn>
                </v-card-actions>
            </v-form>
        </v-card>
        <v-card v-else-if="playerStore.needsPhoneNumber">
            <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center">
                <span class="text-h5">Enter Your Phone Number</span>
            </v-card-title>
            <v-form class="pa-5 d-flex flex-column align-center" @submit.prevent="setPhoneNumber">
                <v-card-text class="w-100">
                    <v-text-field v-model="phoneNumberInput" type="tel" maxlength="10" placeholder="1234567890" />
                </v-card-text>
                <v-card-actions class="py-0">
                    <v-btn size="large" type="submit" color="grey-lighten-1" variant="elevated">
                        Not Now
                    </v-btn>
                    <v-btn id="submit-phone-number" size="large" type="submit" color="teal-darken-1" variant="elevated">
                        Submit
                    </v-btn>
                </v-card-actions>
            </v-form>
        </v-card>
        <v-card v-else-if="playerStore.needsPhoneNumberValidation">
            <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center">
                <span class="text-h5">Enter Your One Time Code</span>
            </v-card-title>
            <v-form ref="oneTimeCodeForm" class="pa-5 d-flex flex-column align-center" @submit.prevent="submitOneTimeCode">
                <v-card-text class="w-100">
                    <v-text-field ref="oneTimeCodeInput" v-model="oneTimeCodeInputValue" autocomplete="one-time-password"
                        maxlength="6" placeholder="012345" />
                </v-card-text>
                <v-card-actions class="py-0">
                    <v-btn size="large" type="submit" color="grey-lighten-1" variant="elevated">
                        Not Now
                    </v-btn>
                    <v-btn id="submit-phone-number" size="large" type="submit" color="teal-darken-1" variant="elevated">
                        Submit
                    </v-btn>
                </v-card-actions>
            </v-form>
        </v-card>
    </v-dialog>
</template>
