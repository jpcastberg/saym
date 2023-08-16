import { Configuration, OpenAIApi } from "openai";
import { type GameResponseModel } from "../../../shared/models/GameModels";
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const prompt =
    "You will be given a comma separated list of words. " +
    "Based on the content of each item in the list, " +
    "generate a single word that matches the theme. " +
    "Favor words toward the end of the list. If you are given the message '<empty list>', " +
    "respond with a random but common word.";
export async function generateTurn(game: GameResponseModel): Promise<string> {
    const wordList =
        game.playerTwoTurns.reduce((acc, turn, idx) => {
            acc += `${game.playerOneTurns[idx]},${turn}${
                idx < game.playerTwoTurns.length - 1 ? "," : ""
            }`;

            return acc;
        }, "") || "<empty list>";

    console.log("passing word list to bot:", wordList);

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

    console.log(JSON.stringify(response.data));
    return response.data.choices[0].message?.content ?? "Spaghetti";
}
