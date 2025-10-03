import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import ScoreRecord, { IScoreRecord } from '../../../../server/models/score-record.ts';
import Group, { IGroup } from '../../../../server/models/group.ts'; // Import Group model
import { isValidMongoId } from '../../../../lib/utils.ts'; // Import MongoDB ID validation function

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

// Type to hold stats for each player
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

/* Fetches statistics for a specific group
 * URL: /api/stats/group/[groupId]?gameTitle=...
 */
export async function GET(
    request: Request,
    { params }: { params: { groupId: string } }
) 
{
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    try {
    const groupId = params.groupId;
    const { searchParams } = new URL(request.url);
    const selectedGameTitle = searchParams.get('gameTitle');

    // Group ID validation
    if (!isValidMongoId(groupId)) {
        return NextResponse.json({ message: 'Invalid Group ID format' }, { status: 400 });
    }

    // Group authentication and retrieval (member check)
    const group: IGroup | null = await Group.findOne({ _id: groupId, userId: userId })
    if (!group) {
        return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }

    // Fetch all score records for the group
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


    // Statistics calculation initialization
    const availableGames = [...new Set(allRecords.map(r => r.gameTitle))];

        //reset total rankings across all games
    let totalGroupFirstPlaces = 0;
    let totalGroupSecondPlaces = 0;
    let totalGroupThirdPlaces = 0;

    // { Player Name: PlayerStats }
    const overallPlayerStatsMap: Record<string, PlayerStats> = {}; // All games
    const selectedGamePlayerStatsMap: Record<string, PlayerStats> = {}; //selected Game
    // Game-specific stats map (used for mostPlayedGame and selectedGameStats summary)
        const gameRankingsMap: Record<string, GameDetailStats> = {};
    
    //  Initialize stats for all members based on group.members (player names)
    group.members?.forEach(playerName => {
        // Set initial values (0 plays, score Infinity/-Infinity) for members with no play records
        const initialStats = { 
            totalPlays: 0, totalScore: 0, 
            highestScore: -Infinity, lowestScore: Infinity, 
            firstPlaces: 0, secondPlaces: 0, thirdPlaces: 0, scores: [] 
        };
        overallPlayerStatsMap[playerName] = { ...initialStats };
        selectedGamePlayerStatsMap[playerName] = { ...initialStats };
    });


    // Loop through all records and aggregate
    allRecords.forEach(record => {
        const gameTitle = record.gameTitle;
        
        // Calculate overall score for each player
        const allPlayerTotalScores = record.playerNames.map((name, i) => {
        let total = 0;
        for (let j = 0; j < record.numScoreItems; j++) {
            total += record.scores[j]?.[i] || 0;
        }
        return { name, score: total };
        });

        // Ranking
        const sortedScores = [...allPlayerTotalScores].sort((a, b) => b.score - a.score);
        const rankMap = new Map(sortedScores.map((s, idx) => [s.name, idx + 1]));

        // Initialise/Update game-specific rankings
        if (!gameRankingsMap[gameTitle]) {
        gameRankingsMap[gameTitle] = { plays: 0, firstPlaces: 0, secondPlaces: 0, thirdPlaces: 0, allScores: [] };
        }
        gameRankingsMap[gameTitle].plays++;


        // Update player stats and overall rankings
        allPlayerTotalScores.forEach(({ name, score }) => {

            // Skip players who do not exist in the member map
            if (!overallPlayerStatsMap[name]) {
                // console warning for debugging
                // console.warn(`Skipping record for non-member: ${name}`); 
                return;
            }

            // ---------------------------------------------
            // Update overall (all games) statistics (always executed)
            // ---------------------------------------------
            const overallStats = overallPlayerStatsMap[name];
            overallStats.totalPlays++;
            overallStats.totalScore += score;
            overallStats.highestScore = Math.max(overallStats.highestScore, score);
            overallStats.lowestScore = Math.min(overallStats.lowestScore, score);
            overallStats.scores.push(score);

            // ---------------------------------------------
            // Update game-specific statistics (selected game only)
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
            // Update rankings
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
        

    // Identify the most played game (calculated from overall stats)
    let mostPlayedGame = 'N/A';
    let maxPlays = 0;
    for (const title in gameRankingsMap) {
        if (gameRankingsMap[title].plays > maxPlays) {
            maxPlays = gameRankingsMap[title].plays;
            mostPlayedGame = title;
        }
    }

    // Construct the final statistics object
    
    //  Format Overall Player Details
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
        .filter(p => p.totalPlays > 0);  // Only return members with play records

    // Construct details for the selected game
    let selectedGameStats: GroupStats['selectedGameStats'] = null;
    if (selectedGameTitle && gameRankingsMap[selectedGameTitle]) {
        const stats = gameRankingsMap[selectedGameTitle];
        const scores = stats.allScores;
        const totalScore = scores.reduce((sum, score) => sum + score, 0);

        // Format player details for the selected game
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
            .filter(p => p.totalPlays > 0); // Only return members who played that game

        selectedGameStats = {
            gameTitle: selectedGameTitle,
            totalPlays: stats.plays,
            averageScore: stats.plays > 0 ? totalScore / scores.length : 0,
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

    // Final response
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
        playerDetails, // Overall statistics
        selectedGameStats,
    };

    return NextResponse.json(finalStats, { status: 200 });

  } catch (error) {
        console.error('Error fetching group stats:', error);
        return NextResponse.json({ message: 'An unexpected server error occurred.' }, { status: 500 });
  }
}