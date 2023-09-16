<script setup lang="ts">
import { ref, type Ref } from "vue";
import MazPhoneNumberInput from "maz-ui/components/MazPhoneNumberInput";
import { useRouter } from "vue-router";
import { useAppStore } from "../stores/app";
import { usePlayerStore } from "../stores/player";
const appStore = useAppStore();
const playerStore = usePlayerStore();
const router = useRouter();
const isOnGamePage = router.currentRoute.value.name === "games";
const phoneNumberInput = ref("");
const oneTimeCodeForm = ref<HTMLFormElement | null>(null);
const oneTimeCodeInput = ref<HTMLInputElement | null>(null);
const oneTimeCodeInputValue = ref("");
const showPhoneValidationDialog = ref(false);
const otpFieldErrors: Ref<string[]> = ref([]);

async function setPhoneNumber(event: SubmitEvent) {
    const submitPhoneNumber = event.submitter?.id === "submit-phone-number";
    if (submitPhoneNumber) {
        await playerStore.requestPhoneVerification(phoneNumberInput.value);
        showPhoneValidationDialog.value = true;
        if ("OTPCredential" in window) {
            await autoSubmitOtp();
        }
    } else {
        appStore.playerTriggeredPhoneNumberChange = false;
        await playerStore.setPhoneNumberCollectPreference(false);
    }
}

async function submitOneTimeCode(event: SubmitEvent) {
    event.preventDefault();
    const response = await playerStore.verifyPhone(oneTimeCodeInputValue.value);
    if (response.success) {
        appStore.playerTriggeredPhoneNumberChange = false;
    } else {
        otpFieldErrors.value.push("Incorrect code");
    }
}

async function autoSubmitOtp() {
    const ac = new AbortController();
    const form = oneTimeCodeForm.value;
    const input = oneTimeCodeInput.value;
    form?.addEventListener("submit", () => {
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
            form?.submit();
        })
        .catch((err) => {
            console.error(err);
        });
}
</script>

<template>
    <v-card v-if="showPhoneValidationDialog">
        <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center">
            <span class="text-h5">Enter Your One Time Code</span>
        </v-card-title>
        <v-form ref="oneTimeCodeForm" class="pa-5 d-flex flex-column align-center" @submit.prevent="submitOneTimeCode">
            <v-card-text class="w-100">
                <v-text-field ref="oneTimeCodeInput" v-model="oneTimeCodeInputValue" :error-messages="otpFieldErrors"
                    autocomplete="one-time-code" maxlength="6" placeholder="012345" />
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
    <v-card v-else>
        <v-card-item>
            <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center">
                <span class="text-h5">Welcome to Saym!</span>
            </v-card-title>
            <v-card-subtitle class="text-center">
                Enter your phone number to
                <br>
                sign up or sign in.
            </v-card-subtitle>
        </v-card-item>
        <v-form class="px-5 pb-5 d-flex flex-column align-center" @submit.prevent="setPhoneNumber">
            <v-card-text class="w-100 pb-4">
                <!-- eslint-disable-next-line vue/attribute-hyphenation -->
                <maz-phone-number-input v-model="phoneNumberInput" :no-country-selector="true" />
            </v-card-text>
            <v-card-text v-if="isOnGamePage">
                Note: If you have already signed up, you must submit your phone number to add this game to your profile.
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
</template>

<style scoped>
.v-card-subtitle {
    white-space: unset;
    font-size: 1rem;
}
</style>
