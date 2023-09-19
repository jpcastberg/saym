import fs from "fs";
import path from "path";
import { Configuration, OpenAIApi } from "openai";
import { type GameResponseModel } from "../../../shared/models/GameModels";
import getRandomIntInclusive from "./getRandomIntInclusive";
import { serverLogger } from "./logger";
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const prompt = "Complete the list with a single word.";
const randomWordList = fs
    .readFileSync(path.resolve(__dirname, "randomWords.txt"))
    .toString("utf-8")
    .trim()
    .split("\n");

function getRandomWord() {
    return randomWordList[getRandomIntInclusive(randomWordList.length - 1)];
}

export async function generateTurnText(
    game: GameResponseModel,
): Promise<string> {
    if (!game.playerTwoTurns.length) {
        return getRandomWord();
    }

    const wordList = game.playerTwoTurns.reduce((acc, turn, idx) => {
        acc += `${turn.text},${game.playerOneTurns[idx].text}${
            idx < game.playerTwoTurns.length - 1 ? "," : ""
        }`;

        return acc;
    }, "");

    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: prompt,
            },
            {
                role: "user",
                content: wordList,
            },
        ],
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });

    const saymbotGuess =
        response.data.choices[0].message?.content ?? getRandomWord();
    serverLogger.debug("saymbot_move", {
        move: saymbotGuess,
        game,
    });

    return saymbotGuess;
}
