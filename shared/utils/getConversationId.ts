function getConversationId(playerId1: string, playerId2: string) {
    const [firstPlayerId, secondPlayerId] = [playerId1, playerId2].sort();

    return `${firstPlayerId}.${secondPlayerId}`;
}

export default getConversationId;
