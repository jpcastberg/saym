import { type PlayerModel } from "./PlayerModels";

export interface GameResponseModel {
    _id: string;
    playerOne: PlayerModel | null;
    playerTwo: PlayerModel | null;
    playerOneTurns: string[];
    playerTwoTurns: string[];
    isGameComplete: boolean;
    needToInvitePlayer: boolean;
    nudgeWasSent: boolean;
    messages: MessageModel[];
    lastUpdate: string;
}

export interface AllGamesResponseModel {
    currentGames: GameResponseModel[];
    finishedGames: GameResponseModel[];
}

export interface GameUpdateModel {
    playerOneId?: string;
    playerTwoId?: string | null;
    playerOneTurns?: string[];
    playerTwoTurns?: string[];
}

export interface TurnCreateModel {
    turn: string;
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
