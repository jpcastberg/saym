function getPlayerFilterExpression(
    playerId: string,
    isPlayerTwoJoining: boolean | null,
) {
    return [
        {
            playerOneId: playerId,
        },
        {
            playerTwoId: isPlayerTwoJoining ? void 0 : playerId,
        },
    ];
}

export default getPlayerFilterExpression;
