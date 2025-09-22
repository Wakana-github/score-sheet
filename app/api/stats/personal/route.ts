import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import ScoreRecord, { IScoreRecord } from '../../../server/models/score-record.ts';

// Function to handle GET requests
export async function GET(request: Request) {
  const { userId } = await auth();

  // Authentication check
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const allRecords: IScoreRecord[] = await ScoreRecord.find({ userId });

    // Total number of plays
    const totalPlays = allRecords.length;

    // Calculate statistics for each game
    const gamesStats: Record<string, { plays: number; scores: number[] }> = {};
    const gameRankings: Record<string, { first: number; second: number; third: number }> = {};
    const gameScores: Record<string, number[]> = {};

    //Total rankings across all games
    let totalFirstPlaces = 0;
    let totalSecondPlaces = 0;
    let totalThirdPlaces = 0;

    allRecords.forEach(record => {
      const gameTitle = record.gameTitle;
      if (!gamesStats[gameTitle]) {
        gamesStats[gameTitle] = { plays: 0, scores: [] };
        gameRankings[gameTitle] = { first: 0, second: 0, third: 0 };
        gameScores[gameTitle] = [];
      }
      gamesStats[gameTitle].plays++;


    // Calculate Player 1's total score
      const player1TotalScore = record.scores.reduce((sum, scoreItem) => {
          return sum + (scoreItem[0] || 0); // Sum scores for Player 1 (index 0)
      }, 0);

      // Calculate the total scores for all players
      const allPlayerTotalScores: number[] = [];
      for (let i = 0; i < record.numPlayers; i++) {
        let total = 0;
        for (let j = 0; j < record.numScoreItems; j++) {
            total += record.scores[j]?.[i] || 0;
        }
        allPlayerTotalScores.push(total);
      }

      // Push only Player 1's total score to gameScores
      gameScores[gameTitle].push(player1TotalScore);

      // Calculate Player 1's rank
      const sortedTotalScores = [...allPlayerTotalScores].sort((a, b) => b - a);
      const rank = sortedTotalScores.findIndex(score => score === player1TotalScore) + 1;

       if (rank === 1) {
        gameRankings[gameTitle].first++;
        totalFirstPlaces++;
      }
      if (rank === 2) {
        gameRankings[gameTitle].second++;
        totalSecondPlaces++;
      }
      if (rank === 3) {
        gameRankings[gameTitle].third++;
        totalThirdPlaces++;
      }
    });

    // Most played game
    let mostPlayedGame = 'N/A';
    let maxPlays = 0;
    for (const gameTitle in gamesStats) {
      if (gamesStats[gameTitle].plays > maxPlays) {
        maxPlays = gamesStats[gameTitle].plays;
        mostPlayedGame = gameTitle;
      }
    }

    // Build the final stats object
    const finalStats = {
      totalPlays,
      mostPlayedGame,
      totalRankings: {
        first: totalFirstPlaces,
        second: totalSecondPlaces,
        third: totalThirdPlaces,
      },
      gameDetails: Object.entries(gameScores).map(([gameTitle, scores]) => {
        const totalScore = scores.reduce((sum, s) => sum + s, 0);
        const averageScore = scores.length > 0 ? totalScore / scores.length : 0;
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

        return {
          gameTitle,
          plays: gamesStats[gameTitle].plays,
          averageScore,
          highestScore,
          lowestScore,
          ranks: gameRankings[gameTitle],
        };
      }),
    };

    return NextResponse.json(finalStats, { status: 200 });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ message: 'Failed to fetch stats' }, { status: 500 });
  }
}