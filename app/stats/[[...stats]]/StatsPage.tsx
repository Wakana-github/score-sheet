"use client";
import React, { useEffect, useState } from 'react';
import LoadingPage from '@/components/lodingPage';
import { useUser } from '@clerk/nextjs';
import StatCard from '@/components/statCard';
import RankCard from '@/components/rankCard';

//define stats types
interface GameStats {
  gameTitle: string;
  plays: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  ranks: {
    first: number;
    second: number;
    third: number;
  };
}

interface PersonalStats {
  totalPlays: number;
  mostPlayedGame: string;
  totalRankings: {
    first: number;
    second: number;
    third: number;
  };
  gameDetails: GameStats[];
}

export default function StatsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<GameStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!isLoaded || !isSignedIn) return;

      setLoading(true);
      try {
        const response = await fetch('/api/stats/personal');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
        if (data.gameDetails.length > 0) {
          setSelectedGame(data.gameDetails[0]); // select first game as default
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isLoaded, isSignedIn]);

  if (loading || !isLoaded) {
    return <LoadingPage />;
  }

  if (!isSignedIn) {
    return <div>Please sign in to view your stats.</div>;
  }

   // DIsplay message when there are no records
  if (!stats || stats.totalPlays === 0) {
    return <div className="p-4 md:p-8">No records found. Please save some scores to view your stats.</div>;
  }

  // Find most played game details for display with play count
  const mostPlayedGameDetails = stats.gameDetails.find(
    g => g.gameTitle === stats.mostPlayedGame
  );

  return (
    <div className="mt-4 p-4 md:p-8">
      {/* title */}
      <h1 className="text-3xl md:text-4xl font-bold mb-4 hand_font">Personal Stats for 
        <span className="text-4xl md:text-5xl  text-[#41490e]">
          <br/>{user?.publicMetadata?.nickname && typeof user.publicMetadata.nickname === 'string'
        ? user.publicMetadata.nickname
        : user?.username}
          </span>
      </h1>
        
      {/* Total and most played game */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <StatCard title="Total Plays" value={stats?.totalPlays || 0} />
        <StatCard
          title="Most Played Game"
          value={
            mostPlayedGameDetails
              ? `${mostPlayedGameDetails.gameTitle} (${mostPlayedGameDetails.plays} plays)`
              : stats.mostPlayedGame
          }
        />
      </div>
    
    {/* Total rankkings */}
    <h2 className="text-2xl md:text-3xl font-bold hand_font mb-2 md:mb-4">Total Rankings</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
      <RankCard title="Total 1st Places" value={stats?.totalRankings.first || 0} className="first-color"/>
      <RankCard  title="Total 2nd Places" value={stats?.totalRankings.second || 0} className="second-color"/>
      <RankCard  title="Total 3rd Places" value={stats?.totalRankings.third || 0} className="third-color"/>
    </div>
      
     {/* Choose game */}
      <div className="mb-5 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold hand_font mb-2 md:mb-4">Game Title</h2>
        <select
          onChange={(e) => {
            const game = stats?.gameDetails.find(g => g.gameTitle === e.target.value);
            setSelectedGame(game || null);
          }}
          value={selectedGame?.gameTitle || ''}
          className="w-full md:w-1/2 p-2 border border-gray-500 rounded"
        >
          {stats?.gameDetails.map(game => (
            <option key={game.gameTitle} value={game.gameTitle}>
              {game.gameTitle} ({game.plays} plays)
            </option>
          ))}
        </select>
      </div>

      {/* Stats for selected game */}
{selectedGame &&(
        <div className="border p-4 rounded-lg shadow-md table_green text-white">
          {/* Score Details */}
          <div className="sm:grid sm:grid-cols-2 gap-2 ">
            <div className="p-1 px-3">
                <span className="font-semibold block text-xl md:text-2xl">Total Plays</span>
                <span className="text-2xl md:text-3xl">{selectedGame.plays}</span>
            </div>
            <div className="p-1 px-4">
                <span className="font-semibold block text-xl md:text-2xl">Average Score</span>
                <span className="text-2xl md:text-3xl">{selectedGame.averageScore.toFixed(2)}</span>
            </div>
            <div className="p-1 px-4">
                <span className="font-semibold block text-xl md:text-2xl">Highest</span>
                <span className="text-2xl md:text-3xl">{selectedGame.highestScore}</span>
            </div>
            <div className="p-1 px-4">
                <span className="font-semibold block text-xl md:text-2xl">Lowest</span>
                <span className="text-2xl md:text-3xl">{selectedGame.lowestScore}</span>
            </div>
          </div>

          {/* Rank Details */}
          <div className="col-span-3 mt-2 pt-2 border-t text-xl md:text-2xl">
              <span className="font-semibold block mb-1">Ranks Achieved</span>
              <div className="flex justify-between font-semibold text-white mx-3 text-xl">
                  <span>🏆 1st: <span className="text-2xl md:text-3xl ml-5"> {selectedGame.ranks.first}</span></span>
                  <span>🥈 2nd: <span className="text-2xl md:text-3xl ml-5"> {selectedGame.ranks.second}</span></span>
                  <span>🥉 3rd: <span className="text-2xl md:text-3xl ml-5"> {selectedGame.ranks.third}</span></span>
              </div>
          </div>
      </div>
)}
    </div>
  );
}

