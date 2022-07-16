<script setup lang="ts">
import { useUsernameFormStore } from "@/stores/username-form";
const usernameFormStore = useUsernameFormStore();
function handleSubmit(event: Event) {
    event.preventDefault()
}
</script>

<template>
    <div class="modal">
        <header>
            <h1 class="modal-header">
                Welcome To Saym!
            </h1>
        </header>
        <form class="username-form"
            @submit="handleSubmit">
            <label class="username-label" for="username-input">
                Please Enter A Username
            </label>
            <input id="username-input" type="text"
                @input="event => usernameFormStore.update((event.target as HTMLInputElement).value)">
            <div class="button-container">
                <button>Skip For Now</button>
                <button type="submit">
                    Submit
                </button>
            </div>
        </form>
    </div>
</template>

<style lang="less">
@import '@/assets/base.less';
.modal {
    position: absolute;
    left: 50%;
    top: 200px;
    transform: translateX(-50%);
    padding: 15px;
    display: grid;
    align-items: center;
    justify-items: center;
    // grid-template-rows: 100px 200px;
    border: 1px solid #0b0b0b;
    border-radius: 10px;
    width: 90%;
    height: 320px;

    // .close-button {
    //     position: absolute;
    //     top: 10px;
    //     right: 15px;
    //     cursor: pointer;
    // }

    .modal-header {
        font-weight: bold;
    }

    .username-form {
        display: grid;
        align-items: center;
        justify-items: center;

        .username-label {
            font-size: 25px;
        }

        #username-input {
            margin-top: 20px;
        }

        .button-container {
            padding-top: 25px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);

            button:first-child {
                margin-right: 10px;
                background-color: #cac8c8;
            }
            button:last-child {
                margin-left: 10px;
                background-color: #00bd7e;
            }

            button {
                font-size: 18px;
                padding: 8px;
                border-radius: 10px;
                border: 0;
            }
        }
    }
}
</style>
