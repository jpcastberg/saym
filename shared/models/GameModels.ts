export interface GameModel {
    _id: string;
    playerOneUserId: string;
    playerTwoUserId: string | null;
    playerOneTurns: string[];
    playerTwoTurns: string[];
    isGameComplete: boolean;
    lastUpdate: string;
}

export interface GameRequestModel {
    playerOneUserId?: string;
    playerTwoUserId?: string | null;
    playerOneTurns?: string[];
    playerTwoTurns?: string[];
}

export interface TurnRequestModel {
    turn: string;
}
