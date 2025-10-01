import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import ScoreRecord, { IScoreRecord } from '../../../../server/models/score-record.ts';
import Group, { IGroup } from '../../../../server/models/group.ts'; // グループモデルをインポート
import { isValidMongoId } from '../../../../lib/utils.ts'; // MongoDB IDバリデーション関数をインポート（仮定）

interface OverallPlayerDetail {
    playerName: string;
    totalPlays: number;
    averageScore: number;
    highestScore: number; 
    lowestScore: number; 
    ranks: { first: number; second: number; third: number };
    totalFirstPlaces: number; 
}

interface GamePlayerDetail extends OverallPlayerDetail {}

interface SelectedGameStats {
    gameTitle: string;
    totalPlays: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    ranks: { first: number; second: number; third: number };
    playerDetails: GamePlayerDetail[];
}


interface GroupStats {
  groupName: string;
  totalPlays: number;
  availableGames: string[];
  mostPlayedGame: { title: string; plays: number };
  totalGroupRankings: { first: number; second: number; third: number };
  playerDetails: OverallPlayerDetail[];
  selectedGameStats?: SelectedGameStats | null; 
}

// プレーヤーごとの統計を保持する型
interface PlayerStats {
    totalPlays: number;
    totalScore: number;
    highestScore: number;
    lowestScore: number;
    firstPlaces: number;
    secondPlaces: number;
    thirdPlaces: number;
    scores: number[];
}

interface GameDetailStats {
    plays: number;
    firstPlaces: number;
    secondPlaces: number;
    thirdPlaces: number;
    allScores: number[];
}

/**
 * 特定のグループの統計情報を取得する
 * URL: /api/stats/group/[groupId]?gameTitle=...
 */
export async function GET(
    request: Request,
    { params }: { params: { groupId: string } }
) {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    try {
    const groupId = params.groupId;
    const { searchParams } = new URL(request.url);
    const selectedGameTitle = searchParams.get('gameTitle');

    // 1. グループIDのバリデーション
    if (!isValidMongoId(groupId)) {
        return NextResponse.json({ message: 'Invalid Group ID format' }, { status: 400 });
    }

  // 2. グループの認証と取得 (メンバーチェック)
        const group: IGroup | null = await Group.findOne({ _id: groupId, userId: userId })
        if (!group) {
            return NextResponse.json({ message: 'Group not found' }, { status: 404 });
        }


    // const playerStats: Record<string, { first: number; second: number; third: number; totalPlays: number }> = {};
    // const gameStats: Record<string, any> = {};

    
        // 3. グループの全スコア記録を取得
        const allRecords: IScoreRecord[] = await ScoreRecord.find({ groupId: groupId });

        if (allRecords.length === 0) {
            const availableGames: string[] = [];
            return NextResponse.json({ 
                groupName: group.groupName, 
                totalPlays: 0, 
                availableGames, 
                mostPlayedGame: { title: 'N/A', plays: 0 }, 
                totalGroupRankings: { first: 0, second: 0, third: 0 },
                playerDetails: [] 
            }, { status: 200 });
        }


        // 3. 統計計算の初期化
        const availableGames = [...new Set(allRecords.map(r => r.gameTitle))];

        // Total number of games
        // const totalPlays = allRecords.length;

         //reset total rankings across all games
        let totalGroupFirstPlaces = 0;
        let totalGroupSecondPlaces = 0;
        let totalGroupThirdPlaces = 0;

        // { プレイヤー名: PlayerStats }
        const overallPlayerStatsMap: Record<string, PlayerStats> = {}; // All games
        const selectedGamePlayerStatsMap: Record<string, PlayerStats> = {}; //selected Game
        // ゲーム別統計マップ (mostPlayedGameやselectedGameStatsの概要に使用)
         const gameRankingsMap: Record<string, GameDetailStats> = {};
        
        // group.members (プレイヤー名) に基づいて全メンバーの統計を初期化
        group.members?.forEach(playerName => {
            // プレイ記録がないメンバーにも、初期値（0回、スコアInfinity/-Infinity）を設定する
           const initialStats = { 
                totalPlays: 0, totalScore: 0, 
                highestScore: -Infinity, lowestScore: Infinity, 
                firstPlaces: 0, secondPlaces: 0, thirdPlaces: 0, scores: [] 
            };
            overallPlayerStatsMap[playerName] = { ...initialStats };
            selectedGamePlayerStatsMap[playerName] = { ...initialStats };
    });


        // 5. 全レコードをループして集計
        allRecords.forEach(record => {
            const gameTitle = record.gameTitle;
            
            // プレーヤーごとの総合スコアを計算
            const allPlayerTotalScores = record.playerNames.map((name, i) => {
        let total = 0;
        for (let j = 0; j < record.numScoreItems; j++) {
          total += record.scores[j]?.[i] || 0;
        }
        return { name, score: total };
      });

      // ランキング
      const sortedScores = [...allPlayerTotalScores].sort((a, b) => b.score - a.score);
      const rankMap = new Map(sortedScores.map((s, idx) => [s.name, idx + 1]));

      // ゲーム別ランキングの初期化/更新
      if (!gameRankingsMap[gameTitle]) {
        gameRankingsMap[gameTitle] = { plays: 0, firstPlaces: 0, secondPlaces: 0, thirdPlaces: 0, allScores: [] };
      }
      gameRankingsMap[gameTitle].plays++;


            // プレーヤー統計と総合ランキングの更新
            allPlayerTotalScores.forEach(({ name, score }) => {

          // ---------------------------------------------
            // A. 総合(全ゲーム)統計の更新 (常に実行)
            // ---------------------------------------------
          
              const overallStats = overallPlayerStatsMap[name];
              overallStats.totalPlays++;
              overallStats.totalScore += score;
              overallStats.highestScore = Math.max(overallStats.highestScore, score);
              overallStats.lowestScore = Math.min(overallStats.lowestScore, score);
              overallStats.scores.push(score);

          // ---------------------------------------------
          // B. ゲーム別統計の更新 (選択されたゲームのみ)
          // ---------------------------------------------

          if (selectedGameTitle && gameTitle === selectedGameTitle) {
              const gameStats = selectedGamePlayerStatsMap[name];
        gameStats.totalPlays++;
                    gameStats.totalScore += score;
                    gameStats.highestScore = Math.max(gameStats.highestScore, score);
                    gameStats.lowestScore = Math.min(gameStats.lowestScore, score);
                    gameStats.scores.push(score);
                }

          // ---------------------------------------------
                // C. ランキングの更新
                // ---------------------------------------------
                gameRankingsMap[gameTitle].allScores.push(score);
                const rank = rankMap.get(name);

                if (rank === 1) {
                    overallStats.firstPlaces++;
                    gameRankingsMap[gameTitle].firstPlaces++;
                    totalGroupFirstPlaces++;
                    if (selectedGameTitle && gameTitle === selectedGameTitle) selectedGamePlayerStatsMap[name].firstPlaces++;
                } else if (rank === 2) {
                    overallStats.secondPlaces++;
                    gameRankingsMap[gameTitle].secondPlaces++;
                    totalGroupSecondPlaces++;
                    if (selectedGameTitle && gameTitle === selectedGameTitle) selectedGamePlayerStatsMap[name].secondPlaces++;
                } else if (rank === 3) {
                    overallStats.thirdPlaces++;
                    gameRankingsMap[gameTitle].thirdPlaces++;
                    totalGroupThirdPlaces++;
                    if (selectedGameTitle && gameTitle === selectedGameTitle) selectedGamePlayerStatsMap[name].thirdPlaces++;
                }
            });
        });
        

// 5. 最もプレイされたゲームの特定 (総合統計から計算)
        let mostPlayedGame = 'N/A';
        let maxPlays = 0;
        for (const title in gameRankingsMap) {
            if (gameRankingsMap[title].plays > maxPlays) {
                maxPlays = gameRankingsMap[title].plays;
                mostPlayedGame = title;
            }
        }

        // 6. 最終的な統計オブジェクトの構築
        
        // 6.1. 総合 Player Details の整形
        const playerDetails: OverallPlayerDetail[] = Object.entries(overallPlayerStatsMap)
            .map(([playerName, stats]) => ({
                playerName,
                totalPlays: stats.totalPlays,
                averageScore: stats.totalPlays > 0 ? stats.totalScore / stats.totalPlays : 0,
                highestScore: stats.totalPlays > 0 ? (stats.highestScore === -Infinity ? 0 : stats.highestScore) : 0, 
                lowestScore: stats.totalPlays > 0 ? (stats.lowestScore === Infinity ? 0 : stats.lowestScore) : 0,
                ranks: {
                    first: stats.firstPlaces,
                    second: stats.secondPlaces,
                    third: stats.thirdPlaces,
                },
                totalFirstPlaces: stats.firstPlaces,
            }))
            .filter(p => p.totalPlays > 0); // プレイ記録があるメンバーのみを返す

        // 6.2. 選択されたゲームの詳細を構築
        let selectedGameStats: GroupStats['selectedGameStats'] = null;
        if (selectedGameTitle && gameRankingsMap[selectedGameTitle]) {
            const stats = gameRankingsMap[selectedGameTitle];
            const scores = stats.allScores;
            const totalScore = scores.reduce((sum, score) => sum + score, 0);

            // 選択ゲームのプレーヤー詳細を整形
            const gamePlayerDetails: GamePlayerDetail[] = Object.entries(selectedGamePlayerStatsMap)
                .map(([playerName, pStats]) => ({
                    playerName,
                    totalPlays: pStats.totalPlays,
                    averageScore: pStats.totalPlays > 0 ? pStats.totalScore / pStats.totalPlays : 0,
                    highestScore: pStats.totalPlays > 0 ? (pStats.highestScore === -Infinity ? 0 : pStats.highestScore) : 0,
                    lowestScore: pStats.totalPlays > 0 ? (pStats.lowestScore === Infinity ? 0 : pStats.lowestScore) : 0,
                    ranks: {
                        first: pStats.firstPlaces,
                        second: pStats.secondPlaces,
                        third: pStats.thirdPlaces,
                    },
                    totalFirstPlaces: stats.firstPlaces,
                }))
                .filter(p => p.totalPlays > 0); // そのゲームをプレイしたメンバーのみを返す

            selectedGameStats = {
                gameTitle: selectedGameTitle,
                totalPlays: stats.plays,
                averageScore: stats.plays > 0 ? totalScore / stats.plays : 0,
                highestScore: scores.length > 0 ? Math.max(...scores) : 0,
                lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
                ranks: {
                    first: stats.firstPlaces,
                    second: stats.secondPlaces,
                    third: stats.thirdPlaces,
                },
                playerDetails: gamePlayerDetails, 
            };
        }

        // 6.3. 最終レスポンス
        const finalStats: GroupStats = {
            groupName: group.groupName,
            totalPlays: allRecords.length,
            availableGames,
            mostPlayedGame: { title: mostPlayedGame, plays: maxPlays },
            totalGroupRankings: {
                first: totalGroupFirstPlaces,
                second: totalGroupSecondPlaces,
                third: totalGroupThirdPlaces,
            },
            playerDetails, // 総合統計
            selectedGameStats,
        };

        return NextResponse.json(finalStats, { status: 200 });

    } catch (error) {
        console.error('Error fetching group stats:', error);
        return NextResponse.json({ message: 'An unexpected server error occurred.' }, { status: 500 });
    }
}