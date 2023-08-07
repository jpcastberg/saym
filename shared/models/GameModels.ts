export interface GameModel {
    _id: string;
    playerOneUserId: string;
    playerTwoUserId: string | null;
    playerOneTurns: string[];
    playerTwoTurns: string[];
    isGameComplete: boolean;
    lastUpdate: string;
}
