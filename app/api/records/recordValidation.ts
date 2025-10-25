/** Player structure check: object & non-empty name */
export function checkPlayerNamesStructure(players: any[]) {
    if (!Array.isArray(players)) return { error: "playerNames must be an array" };
    for (const player of players) {
        if (typeof player !== 'object' || player === null) return { error: "Each player must be an object" };
        if (typeof player.name !== 'string' || !player.name.trim()) return { error: "Each player must have a valid name" };
    }
    return { value: true };
}

/** Scores multi-dimensional array check */
export function checkScoresStructure(scores: any[], numScoreItems: number, numPlayers: number) {
    if (!Array.isArray(scores) || scores.length !== numScoreItems) {
        return { error: `Scores must be an array with ${numScoreItems} rows` };
    }
    for (const row of scores) {
        if (!Array.isArray(row) || row.length !== numPlayers) {
            return { error: `Each score row must have ${numPlayers} elements` };
        }
        for (const score of row) {
            if (typeof score !== 'number') return { error: "Each score must be a number" };
        }
    }
    return { value: true };
}