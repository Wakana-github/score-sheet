"use client";

import StatCard from "@/components/statCard";
import RankCard from "@/components/rankCard";
import { useEffect, useState } from "react";

interface Group {
  _id: string;
  groupName: string;
}

interface OverallPlayerDetail {
    playerName: string;
    totalPlays: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    ranks: { first: number; second: number; third: number };
}

interface GamePlayerDetail extends OverallPlayerDetail {}

interface GroupStats {
  groupName: string;
  totalPlays: number;
  availableGames: string[];
  mostPlayedGame: { title: string; plays: number };
  totalGroupRankings: { first: number; second: number; third: number };
  playerDetails: OverallPlayerDetail[];
  selectedGameStats?: {
    gameTitle: string;
    totalPlays: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    ranks: { first: number; second: number; third: number };
    playerDetails: GamePlayerDetail[]; 
  } | null;
}



export default function GroupStatsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [stats, setStats] = useState<GroupStats | null>(null);

  // Load Group List
  useEffect(() => {
  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups", {
        credentials: "include", // Send Clerk authentication Cookie
      });
      if (!res.ok) throw new Error(`Failed to fetch groups: ${res.status}`);
      const data = await res.json();
      setGroups(data || []);
    } catch (err) {
      console.error(err);
    }
    };
    fetchGroups();
  }, []);

  // Fetch stats when a group or game is selected
  useEffect(() => {
  if (!selectedGroup) return;

  const fetchStats = async () => {
    try {
      let url = `/api/stats/group/${selectedGroup}`;
       // Add query parameter only if selectedGame is set
      if (selectedGame) url += `?gameTitle=${encodeURIComponent(selectedGame)}`; 

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

    fetchStats();
  }, [selectedGroup, selectedGame]);



    // Helper function to return overall PlayerDetails or selected game's PlayerDetail
    const getPlayerDetailsToDisplay = () => {
        if (selectedGame && stats?.selectedGameStats) {
           // If a game is selected, return the player details for that game
            return stats.selectedGameStats.playerDetails;
        }
        // If no game is selected, return the overall player details
        return stats?.playerDetails || [];
    };

    const playerDetails = getPlayerDetailsToDisplay();
    const tableTitle = selectedGame ? 
        `Player's Stats for ${selectedGame}` : 
        'Player Stats for all games';


  return (
    <div className="p-6 space-y-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 hand_font">Group Statistics</h1>

      {/* Group Selection */}
      <div>
        <label className="block text-xl md:text-2xl">Select Group:</label>
        <select
          value={selectedGroup}
          onChange={(e) => {
            setSelectedGroup(e.target.value);
            setSelectedGame(""); // reset game selection
          }}
          className="border px-2 py-1 rounded"
        >
          <option value="">-- Choose Group --</option>
          {groups.map((group) => (
            <option key={group._id} value={group._id}>
              {group.groupName}
            </option>
          ))}
        </select>
      </div>

    {/* Total and most played game */}
    {stats &&  
      <div>
        <h2 className="text-4xl md:text-5xl hand_font text-[#41490e] mb-2">
            {stats.groupName}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <StatCard title="Total Plays" value={stats?.totalPlays} />
            <StatCard title="Most Played Game:" value={`${stats?.mostPlayedGame.title} (${stats?.mostPlayedGame.plays} plays)`} />
        </div>

        {/* Overall Rankings Top 3 (Sorted by 1st Place Count) */}
        <div className="mt-8">
            <h2 className="text-2xl md:text-3xl font-bold hand_font mb-2 md:mb-4">Group Rankings </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {stats.playerDetails
                    .sort((a, b) => b.ranks.first - a.ranks.first)
                    .slice(0, 3) 
                    .map((player, index) => {
                        let rankClass = '';
                        /// Determine class based on rank (index+1)
                        if (index === 0) {
                            rankClass = 'first-color'; 
                        } else if (index === 1) {
                            rankClass = 'second-color'; 
                        } else if (index === 2) {
                            rankClass = 'third-color'; 
                        }
                        return (
                        <RankCard 
                            key={player.playerName} 
                            title={`TOP ${index + 1}`}
                            value={`${player.playerName} (${player.ranks.first})`}
                            className={rankClass}
                        />
                        );
                    })}
            </div>
        </div>
      </div>
    }

      

    {/* Game Selection */}
    {stats && stats.availableGames.length > 0 && (
        <div>
          <h2 className="text-3xl md:text-4xl font-bold hand_font mb-2 md:mb-4">Game Title</h2>
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="">-- All Games --</option>
            {stats.availableGames.map((game) => (
              <option key={game} value={game}>
                {game}
              </option>
            ))}
          </select>
        </div>
    )}

      {/* Statistics */}
      {stats && (
        <div>

          {/* Selected Game Stats */}
          {stats.selectedGameStats && (
            
            <div className="mt-4">
            <h4 className="text-2xl md:text-3xl font-bold hand_font mb-2">{stats.selectedGameStats.gameTitle} Stats</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                <StatCard title="Total Plays" value={stats.selectedGameStats.totalPlays} />
                <StatCard title="Avg Score" value= {stats.selectedGameStats.averageScore.toFixed(2)} />
                <StatCard title="Highest Score" value= {stats.selectedGameStats.highestScore} />
                <StatCard title="Lowest Score" value= {stats.selectedGameStats.lowestScore} />
              </div>
            </div>
          )}

          {stats.selectedGameStats && (
            <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3 ">
                {/* Player Details */}
                {playerDetails
                    .sort((a, b) => b.totalPlays - a.totalPlays) 
                    .map((p, index) => (
                        <div key={p.playerName} className="border p-4 rounded-lg shadow-md table_green text-white">
                            <div className="flex justify-between items-center mb-2 pb-2 border-b">
                                <h4 className="text-xl font-bold">{p.playerName}</h4>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-sm ">
                                {/* Score Details */}
                                <div className="p-1 border-r">
                                    <span className="font-semibold block">Average Score</span>
                                    <span className="text-xl ">{p.averageScore.toFixed(2)}</span>
                                </div>
                                <div className="p-1 border-r">
                                    <span className="font-semibold  block">Highest</span>
                                    <span className="text-xl">{p.highestScore}</span>
                                </div>
                                <div className="p-1">
                                    <span className="font-semibold block">Lowest</span>
                                    <span className="text-xl">{p.lowestScore}</span>
                                </div>

                                {/* Rank Details */}
                                <div className="col-span-3 mt-2 pt-2 border-t">
                                    <span className="font-semibold block mb-1">Ranks Achieved</span>
                                    <div className="flex justify-between text-base font-semibold text-white mx-3">
                                        <span>🏆 1st: <span className="text-xl"> {p.ranks.first}</span></span>
                                        <span>🥈 2nd: <span className="text-xl"> {p.ranks.second}</span></span>
                                        <span>🥉 3rd: <span className="text-xl"> {p.ranks.third}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
          )}
        </div>
    )}
    </div>
  );
}