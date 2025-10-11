"use client";

import StatCard from "@/components/statCard";
import RankCard from "@/components/rankCard";
import { useEffect, useState, useMemo } from "react";
import Select from 'react-select';
import ReturnHomeBtn from "@/components/returnToHomeBtn";
import { fadeInVariants, itemsVariants, gameDetailVariants, detailItemVariants } from '../../lib/variants'
import { motion, AnimatePresence } from "motion/react"

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


  
  // Set group options for react select component
  const groupOptions = useMemo(() => {
    if (groups.length === 0) return [];
    return groups.map((group) => ({
        value: group._id, 
        label: group.groupName, 
    }));
  }, [groups]); //Reset group options only when groups changed

  // Set game options for react select component
  const gameOptions = useMemo(() => {
     if (!stats || stats.availableGames.length === 0) return [];
     return stats.availableGames.map(gameTitle => ({
        value:  gameTitle,
        label:  gameTitle,
    }));
  }, [stats]); //Reset game options only when stats changed



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
    <motion.div variants={fadeInVariants}
                          initial="hidden" 
                          whileInView="show"
                          animate="show"
                          className="p-6 space-y-4"
    >
      <motion.h1 variants={itemsVariants}
                className="text-3xl md:text-4xl font-bold mb-4 hand_font"
      >
        Group Statistics
      </motion.h1>

      {/* Group Selection */}
      <motion.div variants={itemsVariants}>
        <label className="block text-xl md:text-3xl hand_font ">Select Group:</label>
        <Select
          options={groupOptions}
          value={groupOptions.find(option => option.value === selectedGroup) || null}
          onChange={(selectedOption) => {
            if (selectedOption) {          
              setSelectedGroup(selectedOption.value); //reset groupId
            } else {
              setSelectedGroup(""); //// Clear group when selection is cleared
            }
            setSelectedGame(""); //reset game selection when group selection is changed.
          }}
          placeholder="-- Choose a Group --"
          className="w-full md:w-1/2"
        />
      </motion.div>

      {/* Total and most played game */}
      {stats &&  
        <AnimatePresence mode="wait" initial={true}> 
          <motion.div key={stats.groupName} 
              variants={gameDetailVariants} 
              initial="initial"
              animate="animate"
              exit="exit">
            <motion.h2 variants={detailItemVariants} 
                      className="text-4xl md:text-5xl hand_font text-[#41490e] mb-2 "
            >
                {stats.groupName}
            </motion.h2>
            <motion.div variants={detailItemVariants} 
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4"
            >
                <StatCard title="Total Plays" value={stats?.totalPlays} />
                <StatCard title="Most Played Game:" value={`${stats?.mostPlayedGame.title} (${stats?.mostPlayedGame.plays} plays)`} />
            </motion.div>

            {/* Overall Rankings Top 3 (Sorted by 1st Place Count) */}
            <motion.div variants={detailItemVariants} className="mt-8">
                <h2 className="text-2xl md:text-3xl font-bold hand_font mb-3 md:mb-4">Group Rankings </h2>
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
            </motion.div>
          </motion.div>
        </AnimatePresence>
      }

      

      {/* Game Selection */}
      {stats && stats.availableGames.length > 0 && (
        <AnimatePresence mode="wait" initial={true}>
          <motion.div key={stats.groupName} 
              variants={gameDetailVariants} 
              initial="initial"
              animate="animate"
              exit="exit"
              className="mb-2"
          >
            <motion.h2 variants={detailItemVariants} 
                      className="text-xl md:text-3xl hand_font mt-8">
                        Select Game Title
            </motion.h2>
            <Select
              options={gameOptions}
              value={gameOptions.find(option => option.value === selectedGame) || null} //return selected
              onChange={(selectedOption) => {
                  setSelectedGame(selectedOption ? selectedOption.value : ""); //set selected game as selectedgame 
              }}
              placeholder="-- Choose a Game --"
              className="w-full md:w-1/2"
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Statistics */}
      {stats && (
        <div>

          {/* Selected Game Stats */}
          {stats.selectedGameStats && (
            <AnimatePresence mode="wait" initial={true}>
              <motion.div 
                key={stats.selectedGameStats.gameTitle + 'stats'}
                variants={gameDetailVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="mt-4"
              >
                <motion.h2 variants={detailItemVariants}
                          className="text-4xl md:text-5xl hand_font text-[#41490e] mb-2"
                >
                {stats.selectedGameStats.gameTitle} 
                </motion.h2>
                <motion.div variants={detailItemVariants}
                   className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4"
                >
                  <StatCard title="Total Plays" value={stats.selectedGameStats.totalPlays} />
                  <StatCard title="Avg Score" value= {stats.selectedGameStats.averageScore.toFixed(2)} />
                  <StatCard title="Highest Score" value= {stats.selectedGameStats.highestScore} />
                  <StatCard title="Lowest Score" value= {stats.selectedGameStats.lowestScore} />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}

          {stats.selectedGameStats && (
            <AnimatePresence mode="wait" initial={true}>
              <motion.div 
                key={stats.selectedGameStats.gameTitle + 'players'} 
                variants={gameDetailVariants} 
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-4 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3 ">
                  {/* Player Details */}
                  {playerDetails
                      .sort((a, b) => b.totalPlays - a.totalPlays) 
                      .map((p, index) => (
                          <motion.div  
                            key={p.playerName} 
                            variants={detailItemVariants} 
                            className="border p-4 rounded-lg shadow-md table_green text-white"
                          >
                              <div className="flex justify-between items-center mb-2 pb-2 border-b">
                                  <h4 className="text-lg md:text-xl lg:text-2xl font-bold">{p.playerName}</h4>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-sm ">
                                  {/* Score Details */}
                                  <div className="p-1 border-r">
                                      <span className="font-semibold block md:text-lg">Average</span>
                                      <span className="text-xl ">{p.averageScore.toFixed(2)}</span>
                                  </div>
                                  <div className="p-1 border-r">
                                      <span className="font-semibold block md:text-lg">Highest</span>
                                      <span className="text-xl">{p.highestScore}</span>
                                  </div>
                                  <div className="p-1">
                                      <span className="font-semibold block md:text-lg">Lowest</span>
                                      <span className="text-xl">{p.lowestScore}</span>
                                  </div>

                                  {/* Rank Details */}
                                  <div className="col-span-3 mt-2 pt-2 border-t">
                                      <span className="font-semibold block mb-1 md:text-lg">Ranks Achieved</span>
                                      <div className="flex justify-between text-base font-semibold text-white mx-3 md:text-lg">
                                          <span>🏆 1st: <span className="text-xl md:text-2xl pl-2"> {p.ranks.first}</span></span>
                                          <span>🥈 2nd: <span className="text-xl md:text-2xl pl-2"> {p.ranks.second}</span></span>
                                          <span>🥉 3rd: <span className="text-xl md:text-2xl pl-2"> {p.ranks.third}</span></span>
                                      </div>
                                  </div>
                              </div>
                          </motion.div>
                      ))}
              </motion.div>
           </AnimatePresence>
          )}
        </div>
    )}
    <div className="mt-20 my-5">
            <ReturnHomeBtn/>
          </div>
    </motion.div>
  );
}