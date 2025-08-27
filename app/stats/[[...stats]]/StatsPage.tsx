"use client";
import React, { useEffect, useState } from 'react';
import LoadingPage from '@/components/lodingPage';
import { useUser } from '@clerk/nextjs';

// 統計データの型を定義
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
          setSelectedGame(data.gameDetails[0]); // 最初のゲームをデフォルトで選択
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

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Personal Stats for {user?.username}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Plays" value={stats?.totalPlays || 0} />
        <StatCard title="Most Played Game" value={stats?.mostPlayedGame || 'N/A'} />
        {/* その他の主要な統計カードを追加 */}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Games Played</h2>
        <select
          onChange={(e) => {
            const game = stats?.gameDetails.find(g => g.gameTitle === e.target.value);
            setSelectedGame(game || null);
          }}
          value={selectedGame?.gameTitle || ''}
          className="w-full md:w-1/2 p-2 border border-gray-300 rounded"
        >
          {stats?.gameDetails.map(game => (
            <option key={game.gameTitle} value={game.gameTitle}>
              {game.gameTitle} ({game.plays} plays)
            </option>
          ))}
        </select>
      </div>

      {selectedGame && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="text-lg font-medium text-gray-500">{title}</h3>
    <p className="text-4xl font-bold text-gray-900 mt-2">{value}</p>
  </div>
);