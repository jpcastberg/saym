import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { type GameResponseModel } from "../../../shared/models/GameModels";
import getRandomIntInclusive from "./getRandomIntInclusive";
import { serverLogger } from "./logger";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
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

    let content: string | undefined;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-5-nano",
            reasoning_effort: "minimal",
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
            max_completion_tokens: 256,
        });
        content = response.choices[0].message.content?.trim();
    } catch (error) {
        serverLogger.error("saymbot_openai_failed", {
            error: String(error),
        });
    }

    const saymbotGuess = content?.length ? content : getRandomWord();
    serverLogger.debug("saymbot_move", {
        move: saymbotGuess,
        game,
    });

    return saymbotGuess;
}
