import { type UserModel } from "./UserModels";

export interface GameDbModel {
    _id: string;
    playerOneUserId: string;
    playerTwoUserId: string | null;
    playerOneTurns: string[];
    playerTwoTurns: string[];
    isGameComplete: boolean;
    needToInvitePlayer: boolean;
    lastUpdate: string;
}

export interface GameResponseModel {
    _id: string;
    playerOne: UserModel | null;
    playerTwo: UserModel | null;
    playerOneTurns: string[];
    playerTwoTurns: string[];
    isGameComplete: boolean;
    needToInvitePlayer: boolean;
    lastUpdate: string;
}

export interface AllGamesResponseModel {
    currentGames: GameResponseModel[];
    finishedGames: GameResponseModel[];
}

export interface GameUpdateModel {
    playerOneUserId?: string;
    playerTwoUserId?: string | null;
    playerOneTurns?: string[];
    playerTwoTurns?: string[];
}

export interface TurnCreateModel {
    turn: string;
}

export interface GameWebsocketUpdateModel {
    eventType: "gameUpdate";
    data: GameResponseModel;
}
