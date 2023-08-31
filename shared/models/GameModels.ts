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

export interface GameWebsocketUpdateModel {
    eventType: "gameUpdate";
    data: GameResponseModel;
}
