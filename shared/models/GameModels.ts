import { type PublicPlayerModel } from "./PlayerModels";

export interface GameResponseModel {
    _id: string;
    playerOne: PublicPlayerModel;
    playerTwo: PublicPlayerModel | null;
    playerOneTurns: TurnModel[];
    playerTwoTurns: TurnModel[];
    isGameComplete: boolean;
    needToInvitePlayer: boolean;
    messages: MessageModel[];
    playerOneSawFinishedGame: boolean;
    playerTwoSawFinishedGame: boolean;
    lastUpdate: string;
}

export interface GameCreateModel {
    playerTwoId?: string;
}

export interface GameUpdateModel {
    playerTwoId?: string;
    isGameComplete?: boolean;
    needToInvitePlayer?: boolean;
    playerOneSawFinishedGame?: boolean;
    playerTwoSawFinishedGame?: boolean;
}

export interface AllGamesResponseModel {
    currentGames: GameResponseModel[];
    finishedGames: GameResponseModel[];
}

export interface TurnModel {
    _id: string;
    text: string;
    timestamp: string;
}

export interface TurnCreateModel {
    text: string;
}

export interface MessageModel {
    _id: string;
    playerId: string;
    text: string;
    readByOtherPlayer: boolean;
    timestamp: string;
}

export interface MessageCreateModel {
    text: string;
}

export interface MessageUpdateModel {
    readByOtherPlayer: boolean;
}

export interface GameWebsocketUpdateModel {
    eventType: "gameUpdate";
    data: GameResponseModel;
}
