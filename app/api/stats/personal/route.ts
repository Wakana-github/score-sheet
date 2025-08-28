import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import ScoreRecord, { IScoreRecord } from '../../../server/models/score-record.ts';

// GETリクエストを処理する関数
export async function GET(request: Request) {
  const { userId } = await auth();

  // 認証チェック
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const allRecords: IScoreRecord[] = await ScoreRecord.find({ userId });

    // 総プレイ数
    const totalPlays = allRecords.length;

    // ゲームごとの統計情報を計算
    const gamesStats: Record<string, { plays: number; scores: number[] }> = {};
    const gameRankings: Record<string, { first: number; second: number; third: number }> = {};
    const gameScores: Record<string, number[]> = {};

    allRecords.forEach(record => {
      const gameTitle = record.gameTitle;
      if (!gamesStats[gameTitle]) {
        gamesStats[gameTitle] = { plays: 0, scores: [] };
        gameRankings[gameTitle] = { first: 0, second: 0, third: 0 };
        gameScores[gameTitle] = [];
      }
      gamesStats[gameTitle].plays++;

      // 順位を計算
      const allPlayerScoresInRecord = record.scores.flatMap(s => s);
      const sortedScores = [...allPlayerScoresInRecord].sort((a, b) => b - a);

      // 各プレイヤーの順位を記録
      record.scores.forEach(scoreItem => {
        scoreItem.forEach((score, index) => {
          gameScores[gameTitle].push(score);

          const rank = sortedScores.findIndex(s => s === score) + 1;
          if (rank === 1) gameRankings[gameTitle].first++;
          if (rank === 2) gameRankings[gameTitle].second++;
          if (rank === 3) gameRankings[gameTitle].third++;
        });
      });
    });

    // 最もプレイされたゲーム
    let mostPlayedGame = 'N/A';
    let maxPlays = 0;
    for (const gameTitle in gamesStats) {
      if (gamesStats[gameTitle].plays > maxPlays) {
        maxPlays = gamesStats[gameTitle].plays;
        mostPlayedGame = gameTitle;
      }
    }

    // 統計情報の最終的なオブジェクトを構築
    const finalStats = {
      totalPlays,
      mostPlayedGame,
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