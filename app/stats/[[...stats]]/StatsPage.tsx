"use client";
import React, { useEffect, useState } from 'react';
import LoadingPage from '@/components/lodingPage';
import { useUser } from '@clerk/nextjs';

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
      <h1 className="text-3xl md:text-4xl font-bold mb-4 hand_font">Personal Stats for <span className="text-4xl md:text-5xl   text-[#41490e]"><br/>{user?.username}</span></h1>

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

      {selectedGame && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard title="Average Score" value={selectedGame.averageScore.toFixed(2)} />
          <StatCard title="Highest Score" value={selectedGame.highestScore} />
          <StatCard title="Lowest Score" value={selectedGame.lowestScore} />
          <StatCard title="Total Plays" value={selectedGame.plays} />
          <StatCard title="1st Place" value={selectedGame.ranks.first} />
          <StatCard title="2nd Place" value={selectedGame.ranks.second} />
          <StatCard title="3rd Place" value={selectedGame.ranks.third} />
        </div>
      )}
    </div>
  );
}

const StatCard = ({ title, value }: { title: string; value: string | number }) => (
  <div className="bg-white p-2 md:p-4 lg:p-5 rounded-lg shadow-md">
    <h3 className="text-lg md:text-xl lg:text-2xl font-medium text-gray-500">{title}</h3>
    <p className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">{value}</p>
  </div>
);